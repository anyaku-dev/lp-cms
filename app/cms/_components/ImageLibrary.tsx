'use client';
import React, { useState, useEffect } from 'react';
import { getBlobList } from '../actions';
import styles from '../cms.module.css';

export const ImageLibrary = ({ 
  isOpen, 
  onClose, 
  onSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (url: string) => void;
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getBlobList()
        .then(setImages)
        .catch(err => alert('読み込みエラー:' + err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.libraryContainer} onClick={onClose}>
      <div className={styles.libraryContent} onClick={e => e.stopPropagation()}>
        <div className={styles.libraryHeader}>
          <h3 style={{margin:0}}>画像ライブラリ (最新100件)</h3>
          <button onClick={onClose} className={styles.btnCloseLibrary}>閉じる</button>
        </div>
        <div className={styles.libraryBody}>
          {loading ? (
            <p style={{textAlign:'center', color:'#888'}}>読み込み中...</p>
          ) : (
            <div className={styles.imageGrid}>
              {images.map((url, i) => (
                <div key={i} className={styles.gridItem} onClick={() => { onSelect(url); onClose(); }}>
                  <img src={url} loading="lazy" alt="uploaded" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};