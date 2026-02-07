'use client';

import React, { useState, useEffect } from 'react';
import { 
  getLps, saveLp, uploadImage, generateRandomPassword, deleteLp, duplicateLp,
  getGlobalSettings, saveGlobalSettings,
  LpData, GlobalSettings, MenuItem, HeaderConfig, FooterCtaConfig, SideImagesConfig
} from './cms/actions';
import { compressImage } from './plugin/compressImage';
import { ImageLibrary } from './cms/_components/ImageLibrary';
import { CmsDashboard } from './cms/_components/CmsDashboard';
import { CmsEditor } from './cms/_components/CmsEditor';
import styles from './cms/cms.module.css';

// --- フォーマット関数 ---
const formatDate = (isoString?: string) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const STATUS_LABELS = {
  draft: '下書き',
  public: '公開',
  private: '限定公開'
};

// --- 初期値と正規化関数 ---
const EMPTY_HEADER: HeaderConfig = { type: 'none', timerPeriodDays: 3, logoSrc: '', menuItems: [] };
const EMPTY_FOOTER_CTA: FooterCtaConfig = { enabled: false, imageSrc: '', href: '', widthPercent: 90, bottomMargin: 20, showAfterPx: 0, hideBeforeBottomPx: 0 };
const EMPTY_SIDE_IMAGES: SideImagesConfig = {
  left: { src: '', widthPercent: 100, verticalAlign: 'top' },
  right: { src: '', widthPercent: 100, verticalAlign: 'top' }
};

const EMPTY_LP: LpData = { 
  id: '', slug: '', title: '新規LPプロジェクト', pageTitle: '', status: 'draft', images: [], 
  header: { ...EMPTY_HEADER }, footerCta: { ...EMPTY_FOOTER_CTA }, 
  tracking: { gtm: '', pixel: '', meta: '', useDefault: true }, 
  customCss: '', createdAt: '', updatedAt: '', 
  pcBackgroundImage: '', 
  sideImages: { ...EMPTY_SIDE_IMAGES } 
};
const EMPTY_GLOBAL: GlobalSettings = { 
  defaultGtm: '', defaultPixel: '', defaultHeadCode: '', defaultMetaDescription: '', 
  defaultFavicon: '', defaultOgpImage: '', autoWebp: false, webpQuality: 75,
  animationEnabled: true, animationDuration: 0.6, animationDelay: 0.1, pcMaxWidth: 480, pcBackgroundImage: ''
};

const normalizeLp = (lp: Partial<LpData>): LpData => {
  // サイド画像のデータ構造マイグレーション（旧データ -> 新データ）
  const sideImagesRaw = lp.sideImages as any;
  let sideImages: SideImagesConfig;

  if (sideImagesRaw && (sideImagesRaw.left || sideImagesRaw.right)) {
      // 既に新フォーマットの場合
      sideImages = {
          left: { src: sideImagesRaw.left?.src ?? '', widthPercent: sideImagesRaw.left?.widthPercent ?? 15, verticalAlign: sideImagesRaw.left?.verticalAlign ?? 'top' },
          right: { src: sideImagesRaw.right?.src ?? '', widthPercent: sideImagesRaw.right?.widthPercent ?? 15, verticalAlign: sideImagesRaw.right?.verticalAlign ?? 'top' }
      };
  } else {
      // 旧フォーマット、または未定義の場合
      const old = sideImagesRaw || {};
      sideImages = {
          left: { src: old.leftSrc ?? '', widthPercent: old.widthPercent ?? 15, verticalAlign: old.verticalAlign ?? 'top' },
          right: { src: old.rightSrc ?? '', widthPercent: old.widthPercent ?? 15, verticalAlign: old.verticalAlign ?? 'top' }
      };
  }

  return { 
    ...EMPTY_LP, ...lp, 
    header: { ...EMPTY_HEADER, ...(lp.header || {}), menuItems: lp.header?.menuItems || [], timerPeriodDays: lp.header?.timerPeriodDays ?? 3 }, 
    footerCta: { ...EMPTY_FOOTER_CTA, ...(lp.footerCta || {}), widthPercent: lp.footerCta?.widthPercent ?? 90, bottomMargin: lp.footerCta?.bottomMargin ?? 20, showAfterPx: lp.footerCta?.showAfterPx ?? 0, hideBeforeBottomPx: lp.footerCta?.hideBeforeBottomPx ?? 0 }, 
    tracking: { gtm: '', pixel: '', meta: '', useDefault: true, ...(lp.tracking || {}) }, 
    images: lp.images || [], 
    pageTitle: lp.pageTitle ?? '', customHeadCode: lp.customHeadCode ?? '', customMetaDescription: lp.customMetaDescription ?? '', customFavicon: lp.customFavicon ?? '', customOgpImage: lp.customOgpImage ?? '', customCss: lp.customCss ?? '',
    pcBackgroundImage: lp.pcBackgroundImage ?? '',
    sideImages: sideImages
  };
};

const normalizeGlobal = (g: Partial<GlobalSettings>): GlobalSettings => {
  return { 
    ...EMPTY_GLOBAL, ...g,
    animationEnabled: g.animationEnabled ?? true,
    animationDuration: g.animationDuration ?? 0.6,
    animationDelay: g.animationDelay ?? 0.1,
    pcMaxWidth: g.pcMaxWidth ?? 480,
    pcBackgroundImage: g.pcBackgroundImage ?? ''
  };
};

const LoadingOverlay = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  return <div className={styles.loadingOverlay}><div className={styles.spinner}></div><span className={styles.loadingText}>Processing...</span></div>;
};

export default function CmsPage() {
  const [lps, setLps] = useState<LpData[]>([]);
  const [editingLp, setEditingLp] = useState<LpData | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(EMPTY_GLOBAL);
  // 変更検知用State
  const [initialGlobalSettings, setInitialGlobalSettings] = useState<GlobalSettings>(EMPTY_GLOBAL);
  const [loading, setLoading] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [onLibrarySelect, setOnLibrarySelect] = useState<((url: string) => void) | null>(null);

  // アコーディオン開閉状態
  const [isGlobalAdvancedOpen, setIsGlobalAdvancedOpen] = useState(false);
  const [isLpAdvancedOpen, setIsLpAdvancedOpen] = useState(false);

  const openLibrary = (callback: (url: string) => void) => {
    setOnLibrarySelect(() => callback);
    setIsLibraryOpen(true);
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [lpsData, settingsData] = await Promise.all([getLps(), getGlobalSettings()]);
    setLps(lpsData.map(normalizeLp));
    const normalizedSettings = normalizeGlobal(settingsData);
    setGlobalSettings(normalizedSettings);
    setInitialGlobalSettings(normalizedSettings); 
  };

  // --- Actions ---
  const handleCreate = async () => {
    const newPass = await generateRandomPassword();
    const newLp = normalizeLp({ id: crypto.randomUUID(), slug: `new-${Date.now()}`, password: newPass, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setEditingLp(newLp);
    setIsLpAdvancedOpen(false); 
  };
  const handleEdit = (lp: LpData) => {
    setEditingLp(normalizeLp(JSON.parse(JSON.stringify(lp))));
    setIsLpAdvancedOpen(false); 
  };
  const handleDuplicate = async (id: string) => { if (!confirm('このプロジェクトを複製しますか？')) return; setLoading(true); try { await duplicateLp(id); await loadData(); alert('プロジェクトを複製しました'); } catch (e: any) { alert('エラー: ' + e.message); } finally { setLoading(false); } };
  const handleSaveLp = async () => { if (!editingLp) return; setLoading(true); try { await saveLp(editingLp); await loadData(); alert('LP設定を保存しました'); } catch (e: any) { alert('エラー: ' + e.message); } finally { setLoading(false); } };
  const handleSaveAndClose = async () => { if (!editingLp) return; setLoading(true); try { await saveLp(editingLp); await loadData(); alert('LPを保存しました'); setEditingLp(null); } catch (e: any) { alert('エラー: ' + e.message); } finally { setLoading(false); } };
  
  const handleSaveGlobal = async () => { 
    setLoading(true); 
    try { 
      await saveGlobalSettings(globalSettings); 
      setInitialGlobalSettings(globalSettings); 
      alert('全体設定を保存しました'); 
    } catch (e: any) { 
      alert('エラー: ' + e.message); 
    } finally { 
      setLoading(false); 
    } 
  };
  
  const handleDeleteLp = async () => { if (!editingLp) return; if (!confirm('本当にこのLPを削除しますか？')) return; setLoading(true); try { await deleteLp(editingLp.id); await loadData(); alert('LPを削除しました'); setEditingLp(null); } catch (e: any) { alert('エラー: ' + e.message); } finally { setLoading(false); } };

  // --- Upload Handling ---
  const handleUpload = async (file: File) => {
    let uploadFile = file;
    if (globalSettings.autoWebp) {
      try {
        uploadFile = await compressImage(file, globalSettings.webpQuality);
        console.log(`Compressed: ${file.size} -> ${uploadFile.size} bytes`);
      } catch (e) {
        console.error("Compression failed, using original file", e);
      }
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    return await uploadImage(formData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try {
      const src = await handleUpload(e.target.files[0]);
      setEditingLp({ ...editingLp, images: [...editingLp.images, { src, alt: 'LP Image' }] });
    } finally { setLoading(false); }
  };
  const handleImageReplace = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try {
      const src = await handleUpload(e.target.files[0]);
      const newImages = [...editingLp.images];
      newImages[index] = { ...newImages[index], src };
      setEditingLp({ ...editingLp, images: newImages });
    } finally { setLoading(false); }
  };
  const handleGlobalUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof GlobalSettings) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try { const src = await handleUpload(e.target.files[0]); setGlobalSettings(prev => ({ ...prev, [key]: src })); } finally { setLoading(false); }
  };
  const handleLpOverrideUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof LpData) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { const src = await handleUpload(e.target.files[0]); setEditingLp({ ...editingLp, [key]: src }); } finally { setLoading(false); }
  };
  const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { const src = await handleUpload(e.target.files[0]); setEditingLp({ ...editingLp, header: { ...editingLp.header, logoSrc: src } }); } finally { setLoading(false); }
  };
  const handleFooterCtaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { const src = await handleUpload(e.target.files[0]); setEditingLp({ ...editingLp, footerCta: { ...editingLp.footerCta, imageSrc: src } }); } finally { setLoading(false); }
  };
  // ★サイド画像アップロード用（左右対応）
  const handleSideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { 
      const src = await handleUpload(e.target.files[0]); 
      const currentSideImages = editingLp.sideImages || { ...EMPTY_SIDE_IMAGES };
      const targetSide = currentSideImages[side];
      
      setEditingLp({ 
        ...editingLp, 
        sideImages: { 
          ...currentSideImages, 
          [side]: { ...targetSide, src: src }
        } 
      }); 
    } finally { setLoading(false); }
  };

  // --- Sub-item Editors ---
  const addMenuItem = () => { if (!editingLp) return; setEditingLp({ ...editingLp, header: { ...editingLp.header, menuItems: [...(editingLp.header.menuItems || []), { label: '', href: '' }] } }); };
  const updateMenuItem = (i: number, k: keyof MenuItem, v: string) => { if (!editingLp) return; const n = [...(editingLp.header.menuItems || [])]; n[i] = { ...n[i], [k]: v }; setEditingLp({ ...editingLp, header: { ...editingLp.header, menuItems: n } }); };
  const removeMenuItem = (i: number) => { if (!editingLp) return; setEditingLp({ ...editingLp, header: { ...editingLp.header, menuItems: editingLp.header.menuItems.filter((_, idx) => idx !== i) } }); };
  const moveMenuItem = (i: number, d: -1 | 1) => { if (!editingLp) return; const n = [...editingLp.header.menuItems]; const t = i + d; if (t < 0 || t >= n.length) return; [n[i], n[t]] = [n[t], n[i]]; setEditingLp({ ...editingLp, header: { ...editingLp.header, menuItems: n } }); };
  
  const updateImageId = (i: number, id: string) => { if (!editingLp) return; const n = [...editingLp.images]; n[i].customId = id; setEditingLp({ ...editingLp, images: n }); };
  const addLink = (i: number) => { if (!editingLp) return; const n = [...editingLp.images]; if (!n[i].links) n[i].links = []; n[i].links!.push({ left: 10, top: 10, width: 80, height: 10, href: '#', ariaLabel: 'リンク' }); setEditingLp({ ...editingLp, images: n }); };
  
  const updateLink = (ii: number, li: number, k: string, v: any) => { 
    if (!editingLp) return; 
    const n = [...editingLp.images];
    if (n[ii].links) { (n[ii].links[li] as any)[k] = v; } 
    setEditingLp({ ...editingLp, images: n }); 
  };
  
  const removeLink = (ii: number, li: number) => { if (!editingLp) return; const n = [...editingLp.images]; n[ii].links = n[ii].links!.filter((_, idx) => idx !== li); setEditingLp({ ...editingLp, images: n }); };
  const moveImage = (i: number, d: -1 | 1) => { if (!editingLp) return; const n = [...editingLp.images]; const t = i + d; if (t < 0 || t >= n.length) return; [n[i], n[t]] = [n[t], n[i]]; setEditingLp({ ...editingLp, images: n }); };
  const deleteImage = (i: number) => { if (!editingLp || !confirm('削除しますか？')) return; setEditingLp({ ...editingLp, images: editingLp.images.filter((_, idx) => idx !== i) }); };

  return (
    <div className={styles.container}>
      <LoadingOverlay isVisible={loading} />
      <ImageLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onSelect={(url) => onLibrarySelect?.(url)} />
      
      {/* ★修正: ヘッダーをposition: fixedにしてマージン0を強制 */}
      <div className={styles.header} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        borderBottom: '1px solid #e5e5e5',
        padding: '16px 32px',
        margin: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        <h1 className={styles.pageTitle} style={{margin:0}}>爆速画像LPコーディングPRO</h1>
        
        {editingLp ? (
          <div className={styles.flexGap}>
             <button onClick={() => setEditingLp(null)} className={`${styles.btn} ${styles.btnSecondary}`}>キャンセル</button>
             <button onClick={handleSaveAndClose} disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>保存</button>
          </div>
        ) : (
          /* ★追加: ダッシュボード時にヘッダーに「+ 新規LP作成」を表示 */
          <button onClick={handleCreate} className={`${styles.btn} ${styles.btnPrimary}`}>+ 新規LP作成</button>
        )}
      </div>

      {/* ヘッダーの高さ分のスペーサー */}
      <div style={{height: '80px'}}></div>

      {editingLp ? (
        <>
           <div className={styles.editorHeader}>
              <h2 className={styles.pageTitle} style={{margin:0, border:0}}>編集: {editingLp.title}</h2>
           </div>
           
           <CmsEditor 
             editingLp={editingLp} setEditingLp={setEditingLp} handleSaveLp={handleSaveLp} handleDeleteLp={handleDeleteLp}
             handleLpOverrideUpload={handleLpOverrideUpload} handleHeaderLogoUpload={handleHeaderLogoUpload} handleFooterCtaImageUpload={handleFooterCtaImageUpload}
             handleImageReplace={handleImageReplace} handleImageUpload={handleImageUpload} openLibrary={openLibrary}
             moveImage={moveImage} deleteImage={deleteImage} addMenuItem={addMenuItem} updateMenuItem={updateMenuItem}
             removeMenuItem={removeMenuItem} moveMenuItem={moveMenuItem} updateImageId={updateImageId} addLink={addLink}
             updateLink={updateLink} removeLink={removeLink} STATUS_LABELS={STATUS_LABELS}
             styles={styles}
             isLpAdvancedOpen={isLpAdvancedOpen}
             setIsLpAdvancedOpen={setIsLpAdvancedOpen}
             handleSideImageUpload={handleSideImageUpload}
           />
        </>
      ) : (
        <CmsDashboard 
          lps={lps} globalSettings={globalSettings} initialGlobalSettings={initialGlobalSettings} setGlobalSettings={setGlobalSettings} handleSaveGlobal={handleSaveGlobal}
          handleCreate={handleCreate} handleEdit={handleEdit} handleDuplicate={handleDuplicate} handleGlobalUpload={handleGlobalUpload}
          openLibrary={openLibrary} formatDate={formatDate} STATUS_LABELS={STATUS_LABELS} loading={loading}
          styles={styles}
          isGlobalAdvancedOpen={isGlobalAdvancedOpen}
          setIsGlobalAdvancedOpen={setIsGlobalAdvancedOpen}
        />
      )}
    </div>
  );
}
