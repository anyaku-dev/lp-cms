'use client';
import React, { useMemo, useState } from 'react';
import { LpData, GlobalSettings } from '../actions';

type Props = {
  lps: LpData[];
  globalSettings: GlobalSettings;
  initialGlobalSettings: GlobalSettings;
  setGlobalSettings: (s: GlobalSettings) => void;
  handleSaveGlobal: () => void;
  handleCreate: () => void;
  handleEdit: (lp: LpData) => void;
  handleDuplicate: (id: string) => void;
  handleGlobalUpload: (e: React.ChangeEvent<HTMLInputElement>, key: keyof GlobalSettings) => void;
  openLibrary: (cb: (url: string) => void) => void;
  formatDate: (d?: string) => string;
  STATUS_LABELS: Record<string, string>;
  loading: boolean;
  styles: any;
  isGlobalAdvancedOpen: boolean;
  setIsGlobalAdvancedOpen: (v: boolean) => void;
};

export const CmsDashboard = ({
  lps, globalSettings, initialGlobalSettings, setGlobalSettings, handleSaveGlobal,
  handleCreate, handleEdit, handleDuplicate, handleGlobalUpload,
  openLibrary, formatDate, STATUS_LABELS, loading, styles,
  isGlobalAdvancedOpen, setIsGlobalAdvancedOpen
}: Props) => {

  // 検索・フィルターステート
  const [searchTerm, setSearchTerm] = useState('');
  const [showPublicOnly, setShowPublicOnly] = useState(false);

  // フィルタリング処理
  const filteredLps = useMemo(() => {
    return lps.filter(lp => {
      // 公開中フィルター
      if (showPublicOnly && lp.status !== 'public') return false;
      
      // キーワード検索
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        lp.title.toLowerCase().includes(term) ||
        (lp.pageTitle || '').toLowerCase().includes(term) ||
        lp.slug.toLowerCase().includes(term)
      );
    });
  }, [lps, searchTerm, showPublicOnly]);

  const isDirty = useMemo(() => {
    return JSON.stringify(globalSettings) !== JSON.stringify(initialGlobalSettings);
  }, [globalSettings, initialGlobalSettings]);

  const isWebpDirty = useMemo(() => {
    return (
      globalSettings.autoWebp !== initialGlobalSettings.autoWebp ||
      globalSettings.webpQuality !== initialGlobalSettings.webpQuality
    );
  }, [globalSettings, initialGlobalSettings]);

  return (
    <div className={styles.splitLayout}>
      <div className={styles.leftPane}>
        
        <div className={styles.panel} style={{borderColor: globalSettings.autoWebp ? '#0071e3' : '#eee'}}>
          <h3 className={styles.sectionTitle}>自動軽量Webp化</h3>
          <div className={styles.row}>
             <label className={styles.checkboxGroup} style={{fontWeight:600}}>
                <input 
                  type="checkbox" 
                  checked={globalSettings.autoWebp} 
                  onChange={e => setGlobalSettings({...globalSettings, autoWebp: e.target.checked})} 
                />
                有効にする（推奨）
             </label>
          </div>
          
          {globalSettings.autoWebp && (
            <div style={{marginTop: 12, padding: 12, background: '#f5f9ff', borderRadius: 8}}>
               <div className={styles.row}>
                  <label className={styles.label}>
                    圧縮品質: <span style={{color:'#0071e3', fontWeight:'bold'}}>{globalSettings.webpQuality}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="50" max="100" step="5"
                    value={globalSettings.webpQuality} 
                    onChange={e => setGlobalSettings({...globalSettings, webpQuality: Number(e.target.value)})}
                    style={{width:'100%'}}
                  />
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#888'}}>
                    <span>低画質 (50)</span>
                    <span>推奨 (75)</span>
                    <span>高画質 (100)</span>
                  </div>
               </div>
               <p className={styles.subLabel} style={{lineHeight: '1.6', marginTop: 8}}>
                 オンにすると、アップロードされたLP画像を自動的に軽量なWebp画像に変換します。推奨は75%です。
                 近年の高解像度なディスプレイに対応するため、画像の解像度は1280px〜1440pxを推奨します。
               </p>
            </div>
          )}
          {isWebpDirty && (
            <button 
              onClick={handleSaveGlobal} 
              disabled={loading} 
              className={styles.btn} 
              style={{
                marginTop:'12px', width:'100%', fontSize:'14px', padding:'8px',
                background: '#000', color: '#fff', border: 'none', fontWeight: 700
              }}
            >
              設定を保存
            </button>
          )}
        </div>

        <div className={styles.panel}>
          <h3 className={styles.sectionTitle}>デフォルト設定</h3>
          <p className={styles.subLabel} style={{marginBottom:'16px'}}>各LPのデフォルト値として使用されます。</p>

          <div className={styles.row}>
            <label className={styles.label}>GTM ID</label>
            <input type="text" className={styles.input} placeholder="GTM-XXXXX"
              value={globalSettings.defaultGtm ?? ''} onChange={e => setGlobalSettings({...globalSettings, defaultGtm: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Meta Pixel ID</label>
            <input type="text" className={styles.input} placeholder="Pixel ID"
              value={globalSettings.defaultPixel ?? ''} onChange={e => setGlobalSettings({...globalSettings, defaultPixel: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Head内コード追加</label>
            <textarea className={styles.textarea} placeholder="<script>...</script>"
              value={globalSettings.defaultHeadCode ?? ''} onChange={e => setGlobalSettings({...globalSettings, defaultHeadCode: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>サイト説明（Meta Description）</label>
            <textarea className={styles.textarea} style={{minHeight:'60px'}}
              value={globalSettings.defaultMetaDescription ?? ''} onChange={e => setGlobalSettings({...globalSettings, defaultMetaDescription: e.target.value})} />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>ファビコン画像</label>
            <div style={{display:'flex', gap:8}}>
              <input key={globalSettings.defaultFavicon || 'fav-g'} type="file" className={styles.input} accept="image/*" onChange={e => handleGlobalUpload(e, 'defaultFavicon')} style={{flex:1}} />
              <button onClick={() => openLibrary(url => setGlobalSettings({...globalSettings, defaultFavicon: url}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
            </div>
            {globalSettings.defaultFavicon && <img src={globalSettings.defaultFavicon} alt="favicon" style={{width:32, height:32, marginTop:8}} />}
          </div>
          <div className={styles.row}>
            <label className={styles.label}>OGP画像</label>
            <div style={{display:'flex', gap:8}}>
              <input key={globalSettings.defaultOgpImage || 'ogp-g'} type="file" className={styles.input} accept="image/*" onChange={e => handleGlobalUpload(e, 'defaultOgpImage')} style={{flex:1}} />
              <button onClick={() => openLibrary(url => setGlobalSettings({...globalSettings, defaultOgpImage: url}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
            </div>
            {globalSettings.defaultOgpImage && <img src={globalSettings.defaultOgpImage} alt="ogp" style={{width:'100%', marginTop:8, borderRadius:4, border:'1px solid #eee'}} />}
          </div>
        </div>

        <div className={styles.panel} style={{marginTop: '24px'}}>
          <div 
            onClick={() => setIsGlobalAdvancedOpen(!isGlobalAdvancedOpen)}
            style={{display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none'}}
          >
            <h3 className={styles.sectionTitle} style={{margin:0}}>詳細設定 (アニメーション・PC幅)</h3>
            <span style={{transform: isGlobalAdvancedOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.2s'}}>▼</span>
          </div>

          {isGlobalAdvancedOpen && (
            <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'1px dashed #eee'}}>
              <div className={styles.row}>
                <label className={styles.checkboxGroup} style={{fontWeight:600}}>
                    <input 
                      type="checkbox" 
                      checked={globalSettings.animationEnabled} 
                      onChange={e => setGlobalSettings({...globalSettings, animationEnabled: e.target.checked})} 
                    />
                    出現アニメーションを有効にする (フェードイン)
                </label>
              </div>

              <div className={styles.grid2}>
                <div>
                  <label className={styles.label}>アニメーション速度 (秒)</label>
                  <input 
                    type="number" step="0.1" className={styles.input} 
                    value={globalSettings.animationDuration} 
                    onChange={e => setGlobalSettings({...globalSettings, animationDuration: Number(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className={styles.label}>遅延 (秒)</label>
                  <input 
                    type="number" step="0.1" className={styles.input} 
                    value={globalSettings.animationDelay} 
                    onChange={e => setGlobalSettings({...globalSettings, animationDelay: Number(e.target.value)})} 
                  />
                </div>
              </div>
              
              <div className={styles.row} style={{marginTop:'16px'}}>
                <label className={styles.label}>PC表示時の最大幅 (px)</label>
                <p className={styles.subLabel}>PCブラウザで表示した際、これ以上広がらないようにする幅です。</p>
                <input 
                  type="number" className={styles.input} placeholder="例: 480"
                  value={globalSettings.pcMaxWidth} 
                  onChange={e => setGlobalSettings({...globalSettings, pcMaxWidth: Number(e.target.value)})} 
                />
              </div>

              <div className={styles.row} style={{marginTop:'16px'}}>
                <label className={styles.label}>PC用背景画像 (全体デフォルト)</label>
                <p className={styles.subLabel}>PC表示時に、コンテンツの外側に表示される背景画像です。</p>
                <div style={{display:'flex', gap:8}}>
                  <input key={globalSettings.pcBackgroundImage || 'pc-bg'} type="file" className={styles.input} accept="image/*" onChange={e => handleGlobalUpload(e, 'pcBackgroundImage')} style={{flex:1}} />
                  <button onClick={() => openLibrary(url => setGlobalSettings({...globalSettings, pcBackgroundImage: url}))} className={`${styles.btnSmall} ${styles.btnSecondary}`}>ライブラリ</button>
                </div>
                {globalSettings.pcBackgroundImage && (
                  <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                    <img src={globalSettings.pcBackgroundImage} alt="pc-bg" style={{height:60, border:'1px solid #eee'}} />
                    <button
                      onClick={() => setGlobalSettings({...globalSettings, pcBackgroundImage: ''})}
                      style={{background:'#ef4444', color:'#fff', border:'none', fontSize:11, padding:'4px 10px', borderRadius:4, cursor:'pointer'}}
                    >削除</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
            onClick={handleSaveGlobal} 
            disabled={loading || !isDirty} 
            className={styles.btn} 
            style={{
              width:'100%', marginTop:'24px', fontWeight:700, 
              background: isDirty ? '#000' : '#fff',
              color: isDirty ? '#fff' : '#ccc',
              border: isDirty ? 'none' : '1px solid #eee',
              cursor: isDirty ? 'pointer' : 'default'
            }}
          >
             {isDirty ? '設定を保存' : '変更なし'}
        </button>
      </div>

      <div className={styles.rightPane}>
         {/* ★修正: ヘッダー部分に検索とフィルターを追加 */}
         <div style={{marginBottom:'24px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
               <h3 className={styles.sectionTitle} style={{margin:0, border:0}}>プロジェクト一覧</h3>
               {/* 以前のボタン配置場所（削除済み） */}
            </div>
            
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
               <input 
                  type="text" 
                  placeholder="プロジェクトを検索 (名前・URL)" 
                  className={styles.input}
                  style={{marginBottom:0}}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
               />
               <label className={styles.checkboxGroup} style={{whiteSpace:'nowrap', marginBottom:0, userSelect:'none'}}>
                  <input 
                    type="checkbox" 
                    checked={showPublicOnly}
                    onChange={e => setShowPublicOnly(e.target.checked)}
                  />
                  公開中のみ表示
               </label>
            </div>
         </div>

         <div className={styles.lpList}>
           {filteredLps.map(lp => (
             <div key={lp.id} className={styles.lpCard}>
               <div className={styles.lpCardHeader}>
                 <h2 className={styles.lpTitle}>{lp.title}</h2>
                 {lp.pageTitle && <p className={styles.lpPageTitle}>{lp.pageTitle}</p>}
                 <p className={styles.lpSlug}>/{lp.slug}</p>
                 <span className={`${styles.statusBadge} ${
                   lp.status === 'public' ? styles.statusPublic :
                   lp.status === 'private' ? styles.statusPrivate : styles.statusDraft
                 }`}>
                   {STATUS_LABELS[lp.status]}
                 </span>
               </div>
               
               <div className={styles.lpDates}>
                  <span>作成:</span><span>{formatDate(lp.createdAt)}</span>
                  <span>更新:</span><span>{formatDate(lp.updatedAt)}</span>
               </div>

               <div className={styles.flexGap} style={{marginTop:'16px'}}>
                 <button onClick={() => handleEdit(lp)} className={`${styles.btn} ${styles.btnPrimary}`} style={{flex:1}}>編集</button>
                 <button onClick={() => handleDuplicate(lp.id)} className={`${styles.btn} ${styles.btnSecondary}`} style={{flex:1}}>複製</button>
                 <a href={`/${lp.slug}`} target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnSecondary}`} style={{flex:1, textAlign:'center'}}>プレビュー</a>
               </div>
             </div>
           ))}

           {filteredLps.length === 0 && (
             <p style={{color:'#888', gridColumn:'1/-1', textAlign:'center', padding:'40px'}}>
               {lps.length === 0 ? 'まだプロジェクトがありません。「新規LP作成」から始めましょう。' : '条件に一致するプロジェクトが見つかりませんでした。'}
             </p>
           )}
         </div>
      </div>
    </div>
  );
};