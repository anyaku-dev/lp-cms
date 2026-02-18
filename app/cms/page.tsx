'use client';

import React, { useState, useEffect } from 'react';
import { 
  getLps, saveLp, generateRandomPassword, deleteLp, duplicateLp,
  getGlobalSettings, saveGlobalSettings, getCurrentUser, getPlanUsage, checkCanCreateLp, checkCanUseDomain,
  LpData, GlobalSettings, MenuItem, HeaderConfig, FooterCtaConfig, SideImagesConfig, CustomDomain, UserProfile, PlanUsage
} from './actions';
import { compressImage } from '../plugin/compressImage';
import { ImageLibrary } from './_components/ImageLibrary';
import { CmsDashboard } from './_components/CmsDashboard';
import { CmsEditor } from './_components/CmsEditor';
import { LpLimitModal, DomainLimitModal, StorageLimitModal, StorageWarningBanner, PlanUsageBadge, PlanModalStyles } from './_components/PlanUI';
import { type PlanId } from '@/lib/plan';
import styles from './cms.module.css';

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
  left: { src: '', widthPercent: 100, verticalAlign: 'center' },
  right: { src: '', widthPercent: 100, verticalAlign: 'center' }
};

const EMPTY_LP: LpData = { 
  id: '', slug: '', title: '新規LPプロジェクト', pageTitle: '', status: 'draft', images: [], 
  header: { ...EMPTY_HEADER }, footerCta: { ...EMPTY_FOOTER_CTA }, 
  tracking: { gtm: '', pixel: '', meta: '', useDefault: true }, 
  customCss: '', createdAt: '', updatedAt: '', 
  pcBackgroundImage: '', 
  pcBackgroundColor: '',
  sideImages: { ...EMPTY_SIDE_IMAGES },
  customDomain: ''
};
const EMPTY_GLOBAL: GlobalSettings = { 
  defaultGtm: '', defaultPixel: '', defaultHeadCode: '', defaultMetaDescription: '', 
  defaultFavicon: '', defaultOgpImage: '', autoWebp: true, webpQuality: 75,
  animationEnabled: true, animationDuration: 0.6, animationDelay: 0.1, pcWidthPercent: 30, pcBackgroundImage: '',
  pcBackgroundColor: '#ffffff',
  domains: []
};

const normalizeLp = (lp: Partial<LpData>): LpData => {
  const sideImagesRaw = lp.sideImages as any;
  let sideImages: SideImagesConfig;

  if (sideImagesRaw && (sideImagesRaw.left || sideImagesRaw.right)) {
      sideImages = {
          left: { src: sideImagesRaw.left?.src ?? '', widthPercent: sideImagesRaw.left?.widthPercent ?? 15, verticalAlign: sideImagesRaw.left?.verticalAlign ?? 'top' },
          right: { src: sideImagesRaw.right?.src ?? '', widthPercent: sideImagesRaw.right?.widthPercent ?? 15, verticalAlign: sideImagesRaw.right?.verticalAlign ?? 'top' }
      };
  } else {
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
    pcBackgroundColor: lp.pcBackgroundColor ?? '',
    customDomain: lp.customDomain ?? '',
    sideImages: sideImages
  };
};

const normalizeGlobal = (g: Partial<GlobalSettings>): GlobalSettings => {
  return { 
    ...EMPTY_GLOBAL, ...g,
    animationEnabled: g.animationEnabled ?? true,
    animationDuration: g.animationDuration ?? 0.6,
    animationDelay: g.animationDelay ?? 0.1,
    pcWidthPercent: g.pcWidthPercent ?? 30,
    pcBackgroundImage: g.pcBackgroundImage ?? '',
    pcBackgroundColor: g.pcBackgroundColor ?? '#ffffff'
  };
};

const LoadingOverlay = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.lpBuilder}>
        <div className={styles.lpPhone}>
          <div className={`${styles.lpBlock} ${styles.lpBlock1}`} />
          <div className={`${styles.lpBlock} ${styles.lpBlock2}`} />
          <div className={`${styles.lpBlock} ${styles.lpBlock3}`} />
        </div>
      </div>
      <span className={styles.loadingText}>Building LP...</span>
    </div>
  );
};

// --- サーバー経由アップロード ---
async function uploadToServer(file: File): Promise<{ url: string; fileSize: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // ストレージ制限エラーを識別可能に
    if (err.error === 'STORAGE_LIMIT_REACHED') {
      const e = new Error('STORAGE_LIMIT_REACHED') as any;
      e.usedBytes = err.usedBytes;
      e.maxBytes = err.maxBytes;
      e.plan = err.plan;
      throw e;
    }
    throw new Error(err.error || 'アップロードに失敗しました');
  }

  return await res.json();
}

export default function CmsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lps, setLps] = useState<LpData[]>([]);
  const [editingLp, setEditingLp] = useState<LpData | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(EMPTY_GLOBAL);
  const [initialGlobalSettings, setInitialGlobalSettings] = useState<GlobalSettings>(EMPTY_GLOBAL);
  const [initialEditingLp, setInitialEditingLp] = useState<LpData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [onLibrarySelect, setOnLibrarySelect] = useState<((url: string) => void) | null>(null);
  const [isGlobalAdvancedOpen, setIsGlobalAdvancedOpen] = useState(false);
  const [isLpAdvancedOpen, setIsLpAdvancedOpen] = useState(false);

  // --- プラン関連ステート ---
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [lpLimitModal, setLpLimitModal] = useState<{ open: boolean; count: number; max: number; plan: string }>({ open: false, count: 0, max: 0, plan: 'free' });
  const [domainLimitModal, setDomainLimitModal] = useState(false);
  const [storageLimitModal, setStorageLimitModal] = useState<{ open: boolean; usedBytes: number; maxBytes: number; plan: string }>({ open: false, usedBytes: 0, maxBytes: 0, plan: 'free' });
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // モーダルから設定ページのプラン管理へ遷移
  const handleModalUpgrade = () => {
    window.location.href = '/settings#plan';
  };

  const openLibrary = (callback: (url: string) => void) => {
    setOnLibrarySelect(() => callback);
    setIsLibraryOpen(true);
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [userResult, lpsData, settingsData, usageData] = await Promise.all([
      getCurrentUser(),
      getLps(),
      getGlobalSettings(),
      getPlanUsage(),
    ]);
    setUser(userResult);
    setLps(lpsData.map(normalizeLp));
    const normalizedSettings = normalizeGlobal(settingsData);
    setGlobalSettings(normalizedSettings);
    setInitialGlobalSettings(normalizedSettings);
    setPlanUsage(usageData);
    setInitialLoading(false);
  };

  // --- Actions ---
  const handleCreate = async () => {
    // プラン制限チェック (client → server)
    const check = await checkCanCreateLp();
    if (!check.allowed) {
      setLpLimitModal({ open: true, count: check.currentCount, max: check.maxLps, plan: check.plan });
      return;
    }
    const newPass = await generateRandomPassword();
    const newLp = normalizeLp({ id: crypto.randomUUID(), slug: `new-${Date.now()}`, password: newPass, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setEditingLp(newLp);
    setInitialEditingLp(JSON.parse(JSON.stringify(newLp)));
    setIsLpAdvancedOpen(false); 
  };
  const handleEdit = (lp: LpData) => {
    const normalized = normalizeLp(JSON.parse(JSON.stringify(lp)));
    setEditingLp(normalized);
    setInitialEditingLp(JSON.parse(JSON.stringify(normalized)));
    setIsLpAdvancedOpen(false); 
  };
  const handleDuplicate = async (id: string) => { if (!confirm('このプロジェクトを複製しますか？')) return; setLoading(true); try { await duplicateLp(id); await loadData(); alert('プロジェクトを複製しました'); } catch (e: any) { alert('エラー: ' + e.message); } finally { setLoading(false); } };

  // ドメイン機能の制限チェック
  const handleDomainCheck = async (): Promise<boolean> => {
    const check = await checkCanUseDomain();
    if (!check.allowed) {
      setDomainLimitModal(true);
      return false;
    }
    return true;
  };
  const handleSaveLp = async () => { if (!editingLp) return; setLoading(true); try { await saveLp(editingLp); const [lpsData] = await Promise.all([getLps(), getGlobalSettings().then(s => { const ns = normalizeGlobal(s); setGlobalSettings(ns); setInitialGlobalSettings(ns); })]); const freshLps = lpsData.map(normalizeLp); setLps(freshLps); const freshLp = freshLps.find(l => l.id === editingLp.id); if (freshLp) { setEditingLp(freshLp); setInitialEditingLp(JSON.parse(JSON.stringify(freshLp))); } else { setInitialEditingLp(JSON.parse(JSON.stringify(editingLp))); } setInitialLoading(false); alert('LP設定を保存しました'); } catch (e: any) { alert('エラー: ' + e.message); } finally { setLoading(false); } };
  const handleBack = () => {
    if (editingLp && initialEditingLp && JSON.stringify(editingLp) !== JSON.stringify(initialEditingLp)) {
      if (!confirm('保存していない変更があります。変更を破棄して戻りますか？')) return;
    }
    setEditingLp(null);
    setInitialEditingLp(null);
  };
  
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

  // --- Upload Handling (Presigned URL方式) ---
  const handleUpload = async (file: File): Promise<{url: string; fileSize: number}> => {
    let uploadFile = file;
    if (globalSettings.autoWebp) {
      try {
        uploadFile = await compressImage(file, globalSettings.webpQuality);
        console.log(`Compressed: ${file.size} -> ${uploadFile.size} bytes`);
      } catch (e) {
        console.error("Compression failed, using original file", e);
      }
    }
    return await uploadToServer(uploadFile);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !editingLp) return;
    setLoading(true);
    try {
      const files = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const newImages = [...editingLp.images];
      for (const file of files) {
        const { url, fileSize } = await handleUpload(file);
        newImages.push({ src: url, alt: 'LP Image', fileSize });
      }
      setEditingLp({ ...editingLp, images: newImages });
    } catch (err: any) {
      if (err.message === 'STORAGE_LIMIT_REACHED') {
        setStorageLimitModal({ open: true, usedBytes: err.usedBytes, maxBytes: err.maxBytes, plan: err.plan });
      } else { alert('エラー: ' + err.message); }
    } finally { setLoading(false); }
  };
  const handleDropUpload = async (files: File[]) => {
    if (!files.length || !editingLp) return;
    setLoading(true);
    try {
      const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const newImages = [...editingLp.images];
      for (const file of sorted) {
        const { url, fileSize } = await handleUpload(file);
        newImages.push({ src: url, alt: 'LP Image', fileSize });
      }
      setEditingLp({ ...editingLp, images: newImages });
    } catch (err: any) {
      if (err.message === 'STORAGE_LIMIT_REACHED') {
        setStorageLimitModal({ open: true, usedBytes: err.usedBytes, maxBytes: err.maxBytes, plan: err.plan });
      } else { alert('エラー: ' + err.message); }
    } finally { setLoading(false); }
  };
  const handleImageReplace = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try {
      const { url, fileSize } = await handleUpload(e.target.files[0]);
      const newImages = [...editingLp.images];
      newImages[index] = { ...newImages[index], src: url, fileSize };
      setEditingLp({ ...editingLp, images: newImages });
    } catch (err: any) {
      if (err.message === 'STORAGE_LIMIT_REACHED') {
        setStorageLimitModal({ open: true, usedBytes: err.usedBytes, maxBytes: err.maxBytes, plan: err.plan });
      } else { alert('エラー: ' + err.message); }
    } finally { setLoading(false); }
  };
  const handleGlobalUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof GlobalSettings) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try { const { url } = await handleUpload(e.target.files[0]); setGlobalSettings(prev => ({ ...prev, [key]: url })); } finally { setLoading(false); }
  };
  const handleLpOverrideUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof LpData) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { const { url } = await handleUpload(e.target.files[0]); setEditingLp({ ...editingLp, [key]: url }); } finally { setLoading(false); }
  };
  const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { const { url } = await handleUpload(e.target.files[0]); setEditingLp({ ...editingLp, header: { ...editingLp.header, logoSrc: url } }); } finally { setLoading(false); }
  };
  const handleFooterCtaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { const { url } = await handleUpload(e.target.files[0]); setEditingLp({ ...editingLp, footerCta: { ...editingLp.footerCta, imageSrc: url } }); } finally { setLoading(false); }
  };
  const handleSideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
    if (!e.target.files?.[0] || !editingLp) return;
    setLoading(true);
    try { 
      const { url } = await handleUpload(e.target.files[0]); 
      const currentSideImages = editingLp.sideImages || { ...EMPTY_SIDE_IMAGES };
      const targetSide = currentSideImages[side];
      
      setEditingLp({ 
        ...editingLp, 
        sideImages: { 
          ...currentSideImages, 
          [side]: { ...targetSide, src: url }
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
  const insertImageAt = (index: number, img: any) => { if (!editingLp) return; const n = [...editingLp.images]; n.splice(index, 0, img); setEditingLp({ ...editingLp, images: n }); };

  return (
    <div className={styles.container}>
      <PlanModalStyles />
      <LoadingOverlay isVisible={loading} />
      <ImageLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onSelect={(url) => onLibrarySelect?.(url)} />

      {/* プラン制限モーダル群 */}
      <LpLimitModal
        isOpen={lpLimitModal.open}
        onClose={() => setLpLimitModal(prev => ({ ...prev, open: false }))}
        currentPlan={lpLimitModal.plan as PlanId}
        currentCount={lpLimitModal.count}
        maxLps={lpLimitModal.max}
        onUpgrade={handleModalUpgrade}
        upgradeLoading={upgradeLoading}
      />
      <DomainLimitModal
        isOpen={domainLimitModal}
        onClose={() => setDomainLimitModal(false)}
        onUpgrade={handleModalUpgrade}
        upgradeLoading={upgradeLoading}
      />
      <StorageLimitModal
        isOpen={storageLimitModal.open}
        onClose={() => setStorageLimitModal(prev => ({ ...prev, open: false }))}
        currentPlan={storageLimitModal.plan as PlanId}
        usedBytes={storageLimitModal.usedBytes}
        maxBytes={storageLimitModal.maxBytes}
        onUpgrade={handleModalUpgrade}
        upgradeLoading={upgradeLoading}
      />
      
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
        <h1 className={styles.pageTitle} style={{margin:0, cursor: editingLp ? 'pointer' : 'default'}} onClick={editingLp ? handleBack : undefined}>爆速画像LPコーディングPRO</h1>
        
        {editingLp ? (
          <div className={styles.flexGap}>
             <button onClick={handleBack} className={`${styles.btn} ${styles.btnSecondary}`}>戻る</button>
             <button onClick={() => { const q = editingLp?.status === 'public' ? '' : '?preview=true'; if (editingLp?.customDomain && !editingLp?.slug) { window.open(`https://${editingLp.customDomain}/${q}`, '_blank'); } else if (editingLp?.customDomain && editingLp?.slug) { window.open(`https://${editingLp.customDomain}/${editingLp.slug}${q}`, '_blank'); } else if (editingLp?.slug) { window.open(`/${editingLp.slug}${q}`, '_blank'); } }} disabled={!editingLp?.slug && !editingLp?.customDomain} className={`${styles.btn} ${styles.btnSecondary}`} style={{display:'flex', alignItems:'center', gap:4}}>
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
               プレビュー
             </button>
             <button onClick={handleSaveLp} disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>保存</button>
          </div>
        ) : (
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <button onClick={handleCreate} className={`${styles.btn} ${styles.btnPrimary}`}>+ 新規LP作成</button>
            {user && <UserMenu user={user} />}
          </div>
        )}
      </div>

      <div style={{height: '80px'}}></div>

      {editingLp ? (
        <>
           <div className={styles.editorHeader}>
              <h2 className={styles.pageTitle} style={{margin:0, border:0}}>編集: {editingLp.title}</h2>
           </div>
           
           <CmsEditor 
             editingLp={editingLp} setEditingLp={setEditingLp} handleSaveLp={handleSaveLp} handleDeleteLp={handleDeleteLp}
             handleLpOverrideUpload={handleLpOverrideUpload} handleHeaderLogoUpload={handleHeaderLogoUpload} handleFooterCtaImageUpload={handleFooterCtaImageUpload}
             handleImageReplace={handleImageReplace} handleImageUpload={handleImageUpload} handleDropUpload={handleDropUpload} openLibrary={openLibrary}
             moveImage={moveImage} deleteImage={deleteImage} insertImageAt={insertImageAt} addMenuItem={addMenuItem} updateMenuItem={updateMenuItem}
             removeMenuItem={removeMenuItem} moveMenuItem={moveMenuItem} updateImageId={updateImageId} addLink={addLink}
             updateLink={updateLink} removeLink={removeLink} STATUS_LABELS={STATUS_LABELS}
             domains={globalSettings.domains || []}
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
          initialLoading={initialLoading}
          styles={styles}
          isGlobalAdvancedOpen={isGlobalAdvancedOpen}
          setIsGlobalAdvancedOpen={setIsGlobalAdvancedOpen}
          planUsage={planUsage}
          handleDomainCheck={handleDomainCheck}
          onStorageUpgrade={handleModalUpgrade}
        />
      )}
    </div>
  );
}

// --- ユーザーメニュー（アイコン + ドロップダウン） ---
function UserMenu({ user }: { user: UserProfile }) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{position: 'relative'}}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1px solid #ddd', background: '#f5f5f5',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s', overflow: 'hidden', padding: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f5')}
        aria-label="ユーザーメニュー"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:9998}} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 256, background: '#fff', zIndex: 9999,
            border: '1px solid rgb(235,235,235)',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            <div style={{padding: '16px 20px', borderBottom: '1px solid #f0f0f0'}}>
              <div style={{fontWeight: 700, fontSize: 14, color: '#111'}}>{user.username}</div>
              <div style={{fontSize: 12, color: '#888', marginTop: 2}}>{user.email}</div>
            </div>
            <div style={{padding: '8px 0'}}>
              <a href="/settings" style={{
                display: 'block', padding: '10px 20px', fontSize: 14, color: '#333',
                textDecoration: 'none', transition: 'background 0.1s'
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >ユーザー設定</a>
              <button onClick={handleLogout} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 20px', fontSize: 14, color: '#e53e3e', background: 'none',
                border: 'none', cursor: 'pointer', transition: 'background 0.1s'
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >ログアウト</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
