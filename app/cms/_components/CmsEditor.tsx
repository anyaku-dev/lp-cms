'use client';
import React from 'react';
import { LpData, MenuItem, CustomDomain } from '../actions';

type Props = {
  editingLp: LpData;
  setEditingLp: (lp: LpData | null) => void;
  handleSaveLp: () => void;
  handleDeleteLp: () => void;
  handleLpOverrideUpload: (e: React.ChangeEvent<HTMLInputElement>, key: keyof LpData) => void;
  handleHeaderLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFooterCtaImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageReplace: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDropUpload: (files: File[]) => void;
  openLibrary: (cb: (url: string) => void) => void;
  moveImage: (index: number, dir: -1 | 1) => void;
  deleteImage: (index: number) => void;
  addMenuItem: () => void;
  updateMenuItem: (index: number, key: keyof MenuItem, val: string) => void;
  removeMenuItem: (index: number) => void;
  moveMenuItem: (index: number, dir: -1 | 1) => void;
  updateImageId: (index: number, val: string) => void;
  addLink: (index: number) => void;
  updateLink: (imgIndex: number, linkIndex: number, key: string, val: any) => void;
  removeLink: (imgIndex: number, linkIndex: number) => void;
  STATUS_LABELS: Record<string, string>;
  domains: CustomDomain[];
  styles: any;
  // ★追加: アコーディオン制御・ハンドラ
  isLpAdvancedOpen: boolean;
  setIsLpAdvancedOpen: (v: boolean) => void;
  handleSideImageUpload: (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => void;
};

// デフォルトのサイド画像設定（型エラー回避用）
const DEFAULT_SIDE_IMAGES = {
  left: { src: '', widthPercent: 100, verticalAlign: 'center' as const },
  right: { src: '', widthPercent: 100, verticalAlign: 'center' as const }
};

/** YouTube URL から動画IDを抽出 */
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export const CmsEditor = ({
  editingLp, setEditingLp, handleSaveLp, handleDeleteLp,
  handleLpOverrideUpload, handleHeaderLogoUpload, handleFooterCtaImageUpload,
  handleImageReplace, handleImageUpload, handleDropUpload, openLibrary,
  moveImage, deleteImage,
  addMenuItem, updateMenuItem, removeMenuItem, moveMenuItem,
  updateImageId, addLink, updateLink, removeLink,
  STATUS_LABELS, domains, styles,
  isLpAdvancedOpen, setIsLpAdvancedOpen, handleSideImageUpload
}: Props) => {
  const h = editingLp.header;
  const f = editingLp.footerCta;
  const sideImages = editingLp.sideImages || DEFAULT_SIDE_IMAGES;

  return (
    <div className={styles.splitLayout}>
      <div className={styles.leftPane}>
        <div className={styles.panel}>
          <h3 className={styles.sectionTitle}>基本設定</h3>
          
          <div className={styles.row}>
            <label className={styles.label}>管理用タイトル</label>
            <input type="text" className={styles.input} value={editingLp.title ?? ''} 
              onChange={e => setEditingLp({...editingLp, title: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>公開ページのタイトル</label>
            <input type="text" className={styles.input} value={editingLp.pageTitle ?? ''} placeholder="ブラウザタブに表示される名前"
              onChange={e => setEditingLp({...editingLp, pageTitle: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>公開ドメイン</label>
            <select className={styles.select} value={editingLp.customDomain || ''}
              onChange={e => setEditingLp({...editingLp, customDomain: e.target.value})}>
              <option value="">デフォルト（Vercelドメイン）</option>
              {domains.map(d => (
                <option key={d.domain} value={d.domain}>{d.domain}{d.note ? ` (${d.note})` : ''}</option>
              ))}
              {editingLp.customDomain && !domains.some(d => d.domain === editingLp.customDomain) && (
                <option value={editingLp.customDomain}>{editingLp.customDomain}（未登録ドメイン）</option>
              )}
            </select>
            {editingLp.customDomain && (
              <p className={styles.subLabel} style={{marginTop:4}}>このLPは <strong>{editingLp.customDomain}</strong> のルート（/）で公開されます</p>
            )}
          </div>
          <div className={styles.row}>
            <label className={styles.label}>URLスラッグ</label>
            <input type="text" className={styles.input} value={editingLp.slug ?? ''} 
              onChange={e => setEditingLp({...editingLp, slug: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>ステータス</label>
            <select className={styles.select} value={editingLp.status ?? 'draft'} 
              onChange={e => setEditingLp({...editingLp, status: e.target.value as any})}>
              <option value="draft">{STATUS_LABELS.draft}</option>
              <option value="private">{STATUS_LABELS.private}</option>
              <option value="public">{STATUS_LABELS.public}</option>
            </select>
          </div>

          {editingLp.status === 'private' && (
            <div className={styles.row}>
              <label className={styles.label}>閲覧パスワード</label>
              <input type="text" className={styles.input} value={editingLp.password ?? ''} placeholder="パスワードを入力"
                onChange={e => setEditingLp({...editingLp, password: e.target.value})} />
              <p className={styles.subLabel} style={{marginTop:4}}>※このパスワードを知っている人だけが閲覧できます</p>
            </div>
          )}
          
          <div className={styles.row} style={{borderTop:'1px dashed #e5e5e5', paddingTop:'20px'}}>
            <label className={styles.label}>ヘッダー表示設定</label>
            <select className={styles.select} value={h.type ?? 'none'}
              onChange={e => setEditingLp({ ...editingLp, header: { ...h, type: e.target.value as any } })}>
              <option value="timer">カウントダウンタイマー</option>
              <option value="menu">左ロゴ + ハンバーガーメニュー</option>
              <option value="none">表示なし</option>
            </select>
          </div>

          {h.type === 'timer' && (
            <div className={styles.row}>
              <label className={styles.label}>タイマー周期 (日)</label>
              <input type="number" className={styles.input} style={{width:'80px'}} 
                value={h.timerPeriodDays ?? 3} 
                onChange={e => setEditingLp({ ...editingLp, header: { ...h, timerPeriodDays: parseInt(e.target.value)||0 } })} />
            </div>
          )}

          {h.type === 'menu' && (
            <div style={{background:'#f9f9f9', padding:'16px', borderRadius:'8px', marginBottom:'24px'}}>
              <div className={styles.row}>
                <label className={styles.label}>ロゴ画像</label>
                <div style={{display:'flex', gap:8}}>
                  <input key={h.logoSrc || 'logo'} type="file" className={styles.input} accept="image/*" onChange={handleHeaderLogoUpload} style={{flex:1}} />
                  <button onClick={() => openLibrary(url => setEditingLp({...editingLp, header: {...editingLp.header, logoSrc: url}}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
                </div>
                {h.logoSrc && <img src={h.logoSrc} alt="logo" style={{height:40, marginTop:8}} />}
              </div>
              
              <label className={styles.label}>ドロワーメニュー項目</label>
              {h.menuItems.map((item, idx) => (
                <div key={idx} className={styles.menuItemRow}>
                  <div style={{flex:1}}>
                    <input type="text" placeholder="表示名" className={styles.input} style={{marginBottom:4}}
                      value={item.label ?? ''} onChange={e => updateMenuItem(idx, 'label', e.target.value)} />
                    <input type="text" placeholder="リンクURL" className={styles.input}
                      value={item.href ?? ''} onChange={e => updateMenuItem(idx, 'href', e.target.value)} />
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:4}}>
                    <button onClick={() => moveMenuItem(idx, -1)} disabled={idx===0} className={styles.btnSmall}>↑</button>
                    <button onClick={() => moveMenuItem(idx, 1)} disabled={idx===h.menuItems.length-1} className={styles.btnSmall}>↓</button>
                    <button onClick={() => removeMenuItem(idx)} className={`${styles.btnSmall} ${styles.btnDanger}`}>×</button>
                  </div>
                </div>
              ))}
              <button onClick={addMenuItem} className={`${styles.btnSmall} ${styles.btnSecondary}`} style={{width:'100%', marginTop:8}}>+ メニュー項目を追加</button>
            </div>
          )}

          <div className={styles.row} style={{borderTop:'1px dashed #e5e5e5', paddingTop:'20px'}}>
            <label className={styles.checkboxGroup} style={{marginBottom:'16px', fontSize:'15px'}}>
               <input type="checkbox" checked={f.enabled} onChange={e => setEditingLp({...editingLp, footerCta: {...f, enabled: e.target.checked}})} /> 固定フッターCTAを表示する
            </label>
            {f.enabled && (
              <div style={{background:'#f9f9f9', padding:'16px', borderRadius:'8px', marginBottom:'24px'}}>
                 <div className={styles.row}>
                    <label className={styles.label}>ボタン画像</label>
                    <div style={{display:'flex', gap:8}}>
                       <input key={f.imageSrc || 'cta'} type="file" className={styles.input} accept="image/*" onChange={handleFooterCtaImageUpload} style={{flex:1}} />
                       <button onClick={() => openLibrary(url => setEditingLp({...editingLp, footerCta: {...editingLp.footerCta, imageSrc: url}}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
                    </div>
                    {f.imageSrc && <img src={f.imageSrc} alt="cta" style={{width:'100%', maxWidth:'200px', marginTop:8}} />}
                 </div>
                 <div className={styles.row}><label className={styles.label}>飛び先URL</label><input type="text" className={styles.input} placeholder="https://..." value={f.href ?? ''} onChange={e => setEditingLp({...editingLp, footerCta: {...f, href: e.target.value}})} /></div>
                 <div className={styles.row}><label className={styles.label}>ボタンID（CV計測用・任意）</label><input type="text" className={styles.input} placeholder="例: cta-footer" value={f.buttonId ?? ''} onChange={e => setEditingLp({...editingLp, footerCta: {...f, buttonId: e.target.value}})} /></div>
                 <div className={styles.grid2} style={{marginBottom:'16px'}}><div><label className={styles.label}>横幅 (%)</label><input type="number" className={styles.input} value={f.widthPercent ?? 90} onChange={e => setEditingLp({...editingLp, footerCta: {...f, widthPercent: Number(e.target.value)}})} /></div><div><label className={styles.label}>下マージン (px)</label><input type="number" className={styles.input} value={f.bottomMargin ?? 20} onChange={e => setEditingLp({...editingLp, footerCta: {...f, bottomMargin: Number(e.target.value)}})} /></div></div>
                 <div className={styles.grid2}><div><label className={styles.label}>出現位置 (px)</label><input type="number" className={styles.input} value={f.showAfterPx ?? 0} onChange={e => setEditingLp({...editingLp, footerCta: {...f, showAfterPx: Number(e.target.value)}})} /></div><div><label className={styles.label}>非表示位置 (px)</label><input type="number" className={styles.input} value={f.hideBeforeBottomPx ?? 0} onChange={e => setEditingLp({...editingLp, footerCta: {...f, hideBeforeBottomPx: Number(e.target.value)}})} /></div></div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.sectionTitle}>メタデータ・タグ設定</h3>
          <div className={styles.row}>
            <label className={styles.label}>GTM ID（個別上書き）</label>
            <input type="text" className={styles.input} placeholder="空欄 = デフォルト設定を使用" value={editingLp.tracking.gtm ?? ''} onChange={e => setEditingLp({...editingLp, tracking: {...editingLp.tracking, gtm: e.target.value}})} />
            <p style={{fontSize:11, color:'#999', marginTop:2}}>空欄の場合、グローバル設定のGTM IDが適用されます</p>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Meta Pixel ID（個別上書き）</label>
            <input type="text" className={styles.input} placeholder="空欄 = デフォルト設定を使用" value={editingLp.tracking.pixel ?? ''} onChange={e => setEditingLp({...editingLp, tracking: {...editingLp.tracking, pixel: e.target.value}})} />
            <p style={{fontSize:11, color:'#999', marginTop:2}}>空欄の場合、グローバル設定のMeta Pixel IDが適用されます</p>
          </div>
          <div className={styles.row}><label className={styles.label}>Head内コード</label><textarea className={styles.textarea} value={editingLp.customHeadCode ?? ''} onChange={e => setEditingLp({...editingLp, customHeadCode: e.target.value})} /></div>
          <div className={styles.row}><label className={styles.label}>Meta Description</label><textarea className={styles.textarea} style={{minHeight:'60px'}} value={editingLp.customMetaDescription ?? ''} onChange={e => setEditingLp({...editingLp, customMetaDescription: e.target.value})} /></div>
          
          <div className={styles.row}><label className={styles.label}>カスタムCSS</label><textarea className={styles.textarea} style={{minHeight:'120px', fontFamily:'monospace', fontSize:'13px', background:'#2b2b2b', color:'#f8f8f2'}} value={editingLp.customCss ?? ''} onChange={e => setEditingLp({...editingLp, customCss: e.target.value})} /></div>

          <div className={styles.row}>
             <label className={styles.label}>Favicon (上書き)</label>
             <div style={{display:'flex', gap:8}}>
               <input key={editingLp.customFavicon || 'fav'} type="file" className={styles.input} accept="image/*" onChange={e => handleLpOverrideUpload(e, 'customFavicon')} style={{flex:1}} />
               <button onClick={() => openLibrary(url => setEditingLp({...editingLp, customFavicon: url}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
             </div>
             {editingLp.customFavicon && <img src={editingLp.customFavicon} alt="icon" style={{width:32, height:32, marginTop:4}} />}
          </div>
          <div className={styles.row}>
             <label className={styles.label}>OGP Image (上書き)</label>
             <div style={{display:'flex', gap:8}}>
               <input key={editingLp.customOgpImage || 'ogp'} type="file" className={styles.input} accept="image/*" onChange={e => handleLpOverrideUpload(e, 'customOgpImage')} style={{flex:1}} />
               <button onClick={() => openLibrary(url => setEditingLp({...editingLp, customOgpImage: url}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
             </div>
             {editingLp.customOgpImage && <img src={editingLp.customOgpImage} alt="ogp" style={{width:100, marginTop:4}} />}
          </div>
        </div>

        {/* 詳細設定（アコーディオン） */}
        <div className={styles.panel} style={{marginTop: '24px'}}>
          <div 
            onClick={() => setIsLpAdvancedOpen(!isLpAdvancedOpen)}
            style={{display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none'}}
          >
            <h3 className={styles.sectionTitle} style={{margin:0}}>詳細設定 (PC用背景・サイド画像)</h3>
            <span style={{transform: isLpAdvancedOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.2s'}}>▼</span>
          </div>

          {isLpAdvancedOpen && (
            <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'1px dashed #eee'}}>
              <p className={styles.subLabel} style={{marginBottom:'16px'}}>PC画面（幅が広いデバイス）でのみ表示される装飾を設定できます。</p>
              
              <div className={styles.row}>
                <label className={styles.label}>PC用背景画像 (上書き)</label>
                <div style={{display:'flex', gap:8}}>
                  <input key={editingLp.pcBackgroundImage || 'pc-bg-lp'} type="file" className={styles.input} accept="image/*" onChange={e => handleLpOverrideUpload(e, 'pcBackgroundImage')} style={{flex:1}} />
                  <button onClick={() => openLibrary(url => setEditingLp({...editingLp, pcBackgroundImage: url}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
                </div>
                {editingLp.pcBackgroundImage && (
                  <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                    <img src={editingLp.pcBackgroundImage} alt="pc-bg" style={{height:60, border:'1px solid #eee'}} />
                    <button
                      onClick={() => setEditingLp({...editingLp, pcBackgroundImage: ''})}
                      style={{background:'#ef4444', color:'#fff', border:'none', fontSize:11, padding:'4px 10px', borderRadius:4, cursor:'pointer'}}
                    >削除</button>
                  </div>
                )}
              </div>

              <div style={{borderTop:'1px dotted #eee', margin:'16px 0'}}></div>

              {/* 左画像設定 */}
              <div className={styles.row}>
                <label className={styles.label}>左サイド画像</label>
                <div style={{display:'flex', gap:8}}>
                   <input type="file" className={styles.input} accept="image/*" onChange={e => handleSideImageUpload(e, 'left')} style={{flex:1}} />
                   <button onClick={() => openLibrary(url => setEditingLp({...editingLp, sideImages: {...sideImages, left: {...sideImages.left, src: url}}}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
                </div>
                {sideImages.left.src && (
                  <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                    <img src={sideImages.left.src} alt="left" style={{height:60, objectFit:'contain', border:'1px solid #eee'}} />
                    <button
                      onClick={() => setEditingLp({...editingLp, sideImages: {...sideImages, left: {...sideImages.left, src: ''}}})}
                      className={`${styles.btnSmall}`}
                      style={{background:'#ef4444', color:'#fff', border:'none', fontSize:11, padding:'4px 10px', borderRadius:4, cursor:'pointer'}}
                    >削除</button>
                  </div>
                )}
                
                <div className={styles.grid2} style={{marginTop:8}}>
                   <div>
                      <label className={styles.label} style={{fontSize:12}}>画像幅（余白内 %）</label>
                      <input 
                        type="number" className={styles.input} min={1} max={100}
                        value={sideImages.left.widthPercent}
                        onChange={e => setEditingLp({...editingLp, sideImages: {...sideImages, left: {...sideImages.left, widthPercent: Number(e.target.value)}}})} 
                      />
                   </div>
                   <div>
                      <label className={styles.label} style={{fontSize:12}}>縦揃え</label>
                      <select 
                        className={styles.select}
                        value={sideImages.left.verticalAlign}
                        onChange={e => setEditingLp({...editingLp, sideImages: {...sideImages, left: {...sideImages.left, verticalAlign: e.target.value as any}}})} 
                      >
                         <option value="top">上揃え (Top)</option>
                         <option value="center">中央揃え (Center)</option>
                      </select>
                   </div>
                </div>
                <p style={{fontSize:11, color:'#999', marginTop:4}}>※ LP本体の左余白スペースを100%として、画像の幅を%で指定（中央揃え）</p>
              </div>

              <div style={{borderTop:'1px dotted #eee', margin:'16px 0'}}></div>

              {/* 右画像設定 */}
              <div className={styles.row}>
                <label className={styles.label}>右サイド画像</label>
                <div style={{display:'flex', gap:8}}>
                   <input type="file" className={styles.input} accept="image/*" onChange={e => handleSideImageUpload(e, 'right')} style={{flex:1}} />
                   <button onClick={() => openLibrary(url => setEditingLp({...editingLp, sideImages: {...sideImages, right: {...sideImages.right, src: url}}}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
                </div>
                {sideImages.right.src && (
                  <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                    <img src={sideImages.right.src} alt="right" style={{height:60, objectFit:'contain', border:'1px solid #eee'}} />
                    <button
                      onClick={() => setEditingLp({...editingLp, sideImages: {...sideImages, right: {...sideImages.right, src: ''}}})}
                      className={`${styles.btnSmall}`}
                      style={{background:'#ef4444', color:'#fff', border:'none', fontSize:11, padding:'4px 10px', borderRadius:4, cursor:'pointer'}}
                    >削除</button>
                  </div>
                )}
                
                <div className={styles.grid2} style={{marginTop:8}}>
                   <div>
                      <label className={styles.label} style={{fontSize:12}}>画像幅（余白内 %）</label>
                      <input 
                        type="number" className={styles.input} min={1} max={100}
                        value={sideImages.right.widthPercent}
                        onChange={e => setEditingLp({...editingLp, sideImages: {...sideImages, right: {...sideImages.right, widthPercent: Number(e.target.value)}}})} 
                      />
                   </div>
                   <div>
                      <label className={styles.label} style={{fontSize:12}}>縦揃え</label>
                      <select 
                        className={styles.select}
                        value={sideImages.right.verticalAlign}
                        onChange={e => setEditingLp({...editingLp, sideImages: {...sideImages, right: {...sideImages.right, verticalAlign: e.target.value as any}}})} 
                      >
                         <option value="top">上揃え (Top)</option>
                         <option value="center">中央揃え (Center)</option>
                      </select>
                   </div>
                </div>
                <p style={{fontSize:11, color:'#999', marginTop:4}}>※ LP本体の右余白スペースを100%として、画像の幅を%で指定（中央揃え）</p>
              </div>

            </div>
          )}
        </div>

        <button onClick={handleSaveLp} className={`${styles.btn} ${styles.btnSaveSettings}`}>設定を保存</button>
        <button onClick={handleDeleteLp} className={`${styles.btn} ${styles.btnDeleteLp}`}>このLPを削除する</button>
      </div>

      <div className={styles.rightPane}>
         <h3 className={styles.sectionTitle}>LP構成 / 画像・リンク設定</h3>
         
         {editingLp.images.map((img, idx) => (
           <div key={idx} className={styles.imageItem}>
             <div className={styles.imageHeader}>
                <span className={styles.imageIndex}>{img.type === 'html' ? `HTML #${idx + 1}` : img.type === 'youtube' ? `YT #${idx + 1}` : `IMG #${idx + 1}`}</span>
                {img.type !== 'html' && img.type !== 'youtube' && img.src && (
                  <span style={{fontSize:11, color:'#888', marginLeft:6, fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200}}>
                    {decodeURIComponent(img.src.split('/').pop() || '')}
                    {img.fileSize ? ` (${img.fileSize >= 1024 * 1024 ? (img.fileSize / (1024 * 1024)).toFixed(1) + 'MB' : Math.round(img.fileSize / 1024) + 'KB'})` : ''}
                  </span>
                )}
                <div className={styles.flexGap}>
                  <span className={styles.subLabel}>順番変更</span>
                  <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} className={`${styles.btnSmall} ${styles.btnSecondary}`}>↑</button>
                  <button onClick={() => moveImage(idx, 1)} disabled={idx === editingLp.images.length - 1} className={`${styles.btnSmall} ${styles.btnSecondary}`}>↓</button>
                  <div style={{width:'1px', height:'16px', background:'#ddd', margin:'0 8px'}}></div>
                  {img.type !== 'html' && img.type !== 'youtube' && (
                    <>
                      <label className={`${styles.btnSecondary} ${styles.btnSmall}`} style={{cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
                        入れ替え
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleImageReplace(e, idx)} />
                      </label>
                      <button onClick={() => openLibrary(url => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], src: url}; setEditingLp({...editingLp, images: newImgs}); })} className={`${styles.btnSecondary} ${styles.btnSmall}`}>ライブラリ</button>
                    </>
                  )}
                  <button onClick={() => deleteImage(idx)} className={`${styles.btnDanger} ${styles.btnSmall}`}>削除</button>
                </div>
             </div>

             {img.type === 'html' ? (
               /* --- HTMLコードセクション --- */
               <div style={{padding:'12px'}}>
                 <div style={{marginBottom:'12px', display:'grid', gridTemplateColumns:'70% 30%', gap:12}}>
                   <div>
                     <label className={styles.label}>ID設定 (任意)</label>
                     <input type="text" className={styles.input} placeholder="例: custom-section" value={img.customId ?? ''} onChange={e => updateImageId(idx, e.target.value)} />
                   </div>
                   <div>
                     <label className={styles.label}>下との重なり</label>
                     <div style={{display:'flex', alignItems:'center', gap:4}}>
                       <input type="number" className={styles.input} style={{marginBottom:0}} min="0" max="100" value={img.overlapBelow ?? 0}
                         onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], overlapBelow: Number(e.target.value)}; setEditingLp({...editingLp, images: newImgs}); }} />
                       <span style={{fontSize:12, color:'#999', flexShrink:0}}>%</span>
                     </div>
                   </div>
                 </div>
                 <label className={styles.label}>HTMLコード</label>
                 <textarea
                   className={styles.textarea}
                   style={{minHeight:'200px', fontFamily:'monospace', fontSize:'13px', background:'#1e1e1e', color:'#d4d4d4', borderRadius:6, padding:'12px', lineHeight:1.5}}
                   placeholder="<div>ここにHTML/CSSコードを入力...</div>"
                   value={img.htmlContent ?? ''}
                   onChange={e => {
                     const newImgs = [...editingLp.images];
                     newImgs[idx] = {...newImgs[idx], htmlContent: e.target.value};
                     setEditingLp({...editingLp, images: newImgs});
                   }}
                 />
                 <p style={{fontSize:11, color:'#999', marginTop:4}}>HTML / インラインCSS / {'<style>タグ / <script>タグ'} が使用できます。LPのセクション幅内に表示されます。</p>
                 {img.htmlContent && (
                   <details style={{marginTop:12}}>
                     <summary style={{fontSize:12, color:'#666', cursor:'pointer'}}>プレビュー</summary>
                     <div style={{marginTop:8, border:'1px solid #eee', borderRadius:6, padding:12, background:'#fff'}}>
                       <div dangerouslySetInnerHTML={{__html: img.htmlContent}} />
                     </div>
                   </details>
                 )}
               </div>
             ) : img.type === 'youtube' ? (
               /* --- YouTube埋め込みセクション --- */
               <div style={{padding:'12px'}}>
                 <div style={{marginBottom:'12px', display:'grid', gridTemplateColumns:'70% 30%', gap:12}}>
                   <div>
                     <label className={styles.label}>ID設定 (任意)</label>
                     <input type="text" className={styles.input} placeholder="例: youtube-section" value={img.customId ?? ''} onChange={e => updateImageId(idx, e.target.value)} />
                   </div>
                   <div>
                     <label className={styles.label}>下との重なり</label>
                     <div style={{display:'flex', alignItems:'center', gap:4}}>
                       <input type="number" className={styles.input} style={{marginBottom:0}} min="0" max="100" value={img.overlapBelow ?? 0}
                         onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], overlapBelow: Number(e.target.value)}; setEditingLp({...editingLp, images: newImgs}); }} />
                       <span style={{fontSize:12, color:'#999', flexShrink:0}}>%</span>
                     </div>
                   </div>
                 </div>
                 <label className={styles.label}>YouTube動画URL</label>
                 <div style={{display:'flex', gap:8}}>
                   <input
                     type="text"
                     className={styles.input}
                     style={{flex:1, marginBottom:0}}
                     placeholder="https://www.youtube.com/watch?v=..."
                     value={img.youtubeUrl ?? ''}
                     onChange={e => {
                       const newImgs = [...editingLp.images];
                       newImgs[idx] = {...newImgs[idx], youtubeUrl: e.target.value};
                       setEditingLp({...editingLp, images: newImgs});
                     }}
                   />
                 </div>
                 {(() => {
                   const vid = extractYoutubeId(img.youtubeUrl || '');
                   return vid ? (
                     <div style={{marginTop:12, background: img.youtubeBgColor || '#fff', padding: `${img.youtubePaddingY ?? 0}% ${img.youtubePaddingX ?? 6}%`, borderRadius:6, border:'1px solid #eee'}}>
                       <div style={{position:'relative', width:'100%', paddingBottom:'56.25%'}}>
                         <iframe
                           src={`https://www.youtube.com/embed/${vid}`}
                           style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none', borderRadius:4}}
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                           allowFullScreen
                         />
                       </div>
                     </div>
                   ) : img.youtubeUrl ? (
                     <p style={{fontSize:12, color:'#d97706', marginTop:8}}>❗ 有効なYouTube URLを入力してください</p>
                   ) : null;
                 })()}

                 <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:16}}>
                   <div>
                     <label className={styles.subLabel}>上下パディング (%)</label>
                     <input type="number" className={styles.input} min="0" max="50" value={img.youtubePaddingY ?? 0}
                       onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], youtubePaddingY: Number(e.target.value)}; setEditingLp({...editingLp, images: newImgs}); }} />
                   </div>
                   <div>
                     <label className={styles.subLabel}>左右パディング (%)</label>
                     <input type="number" className={styles.input} min="0" max="50" value={img.youtubePaddingX ?? 6}
                       onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], youtubePaddingX: Number(e.target.value)}; setEditingLp({...editingLp, images: newImgs}); }} />
                   </div>
                   <div>
                     <label className={styles.subLabel}>背景色</label>
                     <div style={{display:'flex', gap:4, alignItems:'center'}}>
                       <input type="text" className={styles.input} style={{flex:1, marginBottom:0}} placeholder="#fff" value={img.youtubeBgColor ?? '#fff'}
                         onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], youtubeBgColor: e.target.value}; setEditingLp({...editingLp, images: newImgs}); }} />
                       <input type="color" value={img.youtubeBgColor || '#ffffff'} style={{width:32, height:32, padding:0, border:'1px solid #ddd', borderRadius:4, cursor:'pointer'}}
                         onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], youtubeBgColor: e.target.value}; setEditingLp({...editingLp, images: newImgs}); }} />
                     </div>
                   </div>
                 </div>
               </div>
             ) : (
               /* --- 画像セクション（既存） --- */
               <div className={styles.imageEditorSplit}>
                <div className={styles.imagePreviewArea}>
                   <div className={styles.previewContainer} style={{ width: '100%' }}>
                      <img src={img.src} alt="preview" style={{width:'100%', display:'block'}} />
                      {img.links?.map((link, lIdx) => (
                        <div key={lIdx} className={styles.linkOverlay}
                          style={{ left: `${link.left}%`, top: `${link.top}%`, width: `${link.width}%`, height: `${link.height}%` }}
                          title={link.href}>
                          {lIdx + 1}
                        </div>
                      ))}
                      {(img.overlapBelow ?? 0) > 0 && (
                        <div className={styles.overlapOverlay}
                          style={{ left: 0, bottom: 0, width: '100%', height: `${img.overlapBelow}%` }}>
                          重なり {img.overlapBelow}%
                        </div>
                      )}
                   </div>
                </div>

                <div className={styles.linkInputArea}>
                   <div style={{marginBottom:'24px', paddingBottom:'16px', borderBottom:'1px dashed #eee', display:'grid', gridTemplateColumns:'70% 30%', gap:12}}>
                      <div>
                        <label className={styles.label}>ID設定 (任意)</label>
                        <input type="text" className={styles.input} placeholder="例: section-1" value={img.customId ?? ''} onChange={e => updateImageId(idx, e.target.value)} />
                      </div>
                      <div>
                        <label className={styles.label}>下との重なり</label>
                        <div style={{display:'flex', alignItems:'center', gap:4}}>
                          <input type="number" className={styles.input} style={{marginBottom:0}} min="0" max="100" value={img.overlapBelow ?? 0}
                            onChange={e => { const newImgs = [...editingLp.images]; newImgs[idx] = {...newImgs[idx], overlapBelow: Number(e.target.value)}; setEditingLp({...editingLp, images: newImgs}); }} />
                          <span style={{fontSize:12, color:'#999', flexShrink:0}}>%</span>
                        </div>
                      </div>
                   </div>
                   <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px'}}>
                      <label className={styles.label}>リンク設定 ({img.links?.length || 0})</label>
                      <button onClick={() => addLink(idx)} className={`${styles.btnSecondary} ${styles.btnSmall}`}>+ 追加</button>
                   </div>
                   {img.links?.length === 0 && <p className={styles.subLabel}>リンクが設定されていません</p>}
                   {img.links?.map((link, lIdx) => (
                     <div key={lIdx} className={styles.linkRow}>
                        <div className={styles.linkRowHeader}>
                           <span>LINK #{lIdx + 1}</span>
                           <button onClick={() => removeLink(idx, lIdx)} className="text-red-500" style={{fontSize:10}}>削除</button>
                        </div>
                        <div className={styles.row} style={{marginBottom:'8px'}}>
                           <input type="text" className={styles.input} placeholder="URL" value={link.href ?? ''} onChange={e => updateLink(idx, lIdx, 'href', e.target.value)} />
                        </div>
                        <div className={styles.row} style={{marginBottom:'8px'}}>
                           <input type="text" className={styles.input} placeholder="ボタンID（CV計測用・任意）" value={link.buttonId ?? ''} onChange={e => updateLink(idx, lIdx, 'buttonId', e.target.value)} />
                        </div>
                        <div className={styles.linkRowGrid}>
                           <div><label className={styles.subLabel}>Top %</label><input type="number" className={styles.input} value={link.top ?? 0} onChange={e => updateLink(idx, lIdx, 'top', Number(e.target.value))} /></div>
                           <div><label className={styles.subLabel}>Left %</label><input type="number" className={styles.input} value={link.left ?? 0} onChange={e => updateLink(idx, lIdx, 'left', Number(e.target.value))} /></div>
                           <div><label className={styles.subLabel}>W %</label><input type="number" className={styles.input} value={link.width ?? 0} onChange={e => updateLink(idx, lIdx, 'width', Number(e.target.value))} /></div>
                           <div><label className={styles.subLabel}>H %</label><input type="number" className={styles.input} value={link.height ?? 0} onChange={e => updateLink(idx, lIdx, 'height', Number(e.target.value))} /></div>
                        </div>
                     </div>
                   ))}
                </div>
               </div>
             )}
           </div>
         ))}

         <div className={styles.uploadArea} style={{ position: 'relative', display:'flex', flexDirection:'column', gap:10, alignItems:'center', justifyContent:'center', minHeight:120, transition:'border-color 0.2s, background 0.2s', cursor:'pointer' }}
           onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = '#0071e3'; e.currentTarget.style.background = '#f0f7ff'; }}
           onDragLeave={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
           onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (imageFiles.length) handleDropUpload(imageFiles); }}
         >
            {/* エリア全体をクリックでファイル選択 */}
            <input key={editingLp.images.length} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer', zIndex:0}} />
            <span className={styles.uploadText} style={{pointerEvents:'none'}}>+ 新規アップロード</span>
            <span style={{fontSize:'12px', color:'#999', pointerEvents:'none'}}>クリック または ドラッグ&ドロップで追加</span>
            <div style={{zIndex:1, pointerEvents:'auto', display:'flex', gap:16, marginTop:4, position:'relative'}}>
               <button onClick={(e) => { e.stopPropagation(); openLibrary(url => { const newImgs = [...editingLp.images]; newImgs.push({src: url, alt: 'LP Image'}); setEditingLp({...editingLp, images: newImgs}); }); }} className={styles.btnSecondary} style={{padding:'8px 16px', position:'relative', zIndex:2}}>
                  ライブラリから追加
               </button>
               <button onClick={(e) => { e.stopPropagation(); const newImgs = [...editingLp.images]; newImgs.push({type: 'html', src: '', alt: '', htmlContent: ''}); setEditingLp({...editingLp, images: newImgs}); }} className={styles.btnCustomCode} style={{padding:'8px 16px', position:'relative', zIndex:2, cursor:'pointer', borderRadius:8, fontSize:13, fontWeight:600, transition:'all 0.15s'}}>
                  + カスタムコードを追加
               </button>
               <button onClick={(e) => { e.stopPropagation(); const newImgs = [...editingLp.images]; newImgs.push({type: 'youtube', src: '', alt: '', youtubeUrl: '', youtubePaddingX: 6, youtubePaddingY: 0, youtubeBgColor: '#fff'}); setEditingLp({...editingLp, images: newImgs}); }} className={styles.btnYoutube} style={{padding:'8px 16px', position:'relative', zIndex:2, cursor:'pointer', borderRadius:8, fontSize:13, fontWeight:600, transition:'all 0.15s'}}>
                  + YouTube動画埋め込み
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};