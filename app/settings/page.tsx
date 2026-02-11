'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, FullProfile } from './actions';
import { getPlanUsage } from '../cms/actions';
import { PlanCard, UsageBar, PlanModalStyles, IntervalToggle, ConfirmChangeModal, startCheckout, changePlan, openCustomerPortal } from '../cms/_components/PlanUI';
import { PLANS, getPlan, formatBytes, isUpgrade as isUpgradeFn, type PlanId, type BillingInterval } from '@/lib/plan';
import Link from 'next/link';

// --- 定数（signup/profileと整合） ---
const ORG_TYPES = [
  { value: 'corporation', label: '法人' },
  { value: 'individual', label: '個人' },
];

const TEAM_SIZES = ['1名', '2〜5名', '6〜10名', '11〜30名', '31名以上'];

const INDUSTRIES = [
  'IT・Web', '広告・マーケティング', 'EC・小売', '不動産', '美容・健康',
  '教育', '金融・保険', '飲食', '建設', 'その他',
];

// --- Toast ---
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 10000,
      padding: '14px 24px', borderRadius: 12,
      background: type === 'success' ? '#1d1d1f' : '#d70015',
      color: '#fff', fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      animation: 'fadeIn 0.25s ease-out',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

// --- ローディングオーバーレイ（CMS共通デザイン） ---
function LoadingOverlay({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
      zIndex: 9999, display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          width: 56, padding: '8px 6px', borderRadius: 10,
          border: '2.5px solid #d1d5db', background: '#fff',
          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 5,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ width: '100%', height: 14, borderRadius: 4, background: 'linear-gradient(135deg, #0071e3, #34aadc)', animation: 'blockPop 1.8s ease-in-out infinite', animationDelay: '0s' }} />
          <div style={{ width: '100%', height: 22, borderRadius: 4, background: 'linear-gradient(135deg, #34aadc, #5ac8fa)', animation: 'blockPop 1.8s ease-in-out infinite', animationDelay: '0.25s' }} />
          <div style={{ width: '100%', height: 14, borderRadius: 4, background: 'linear-gradient(135deg, #5ac8fa, #0071e3)', animation: 'blockPop 1.8s ease-in-out infinite', animationDelay: '0.5s' }} />
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '0.04em', animation: 'textPulse 1.8s ease-in-out infinite' }}>
        {message}
      </span>
    </div>
  );
}

// --- Section Nav ---
// --- Font Awesome SVGアイコン ---
const FA = {
  userPen: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 640 512" fill="currentColor"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c1.8 0 3.5-.2 5.3-.5c-76.3-55.1-99.8-141-103.1-200.2c-16.1-4.8-33.1-7.3-50.7-7.3l-91.4 0zm308.8-78.3l-120 120c-2.4 2.4-4.2 5.3-5.4 8.5l-24 72c-3.6 10.8 6.2 20.6 17 17l72-24c3.2-1.1 6.1-2.9 8.5-5.4l120-120c17-17 17-44.6 0-61.6s-44.6-17-61.6 0l-6.5 6.5z"/></svg>
  ),
  circleUser: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 512 512" fill="currentColor"><path d="M399 384.2C376.9 345.8 335.4 320 288 320l-64 0c-47.4 0-88.9 25.8-111 64.2c35.2 39.2 86.2 63.8 143 63.8s107.8-24.7 143-63.8zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 16a72 72 0 1 0 0-144 72 72 0 1 0 0 144z"/></svg>
  ),
  shieldHalved: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 512 512" fill="currentColor"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0zm0 66.8l0 378.1C394 378 431.1 230.1 432 141.4L256 66.8z"/></svg>
  ),
  gear: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 512 512" fill="currentColor"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>
  ),
  crown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 576 512" fill="currentColor"><path d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6l277.2 0c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"/></svg>
  ),
};

const SECTIONS = [
  { id: 'profile', label: '基本情報', icon: 'userPen' as const },
  { id: 'avatar', label: 'プロフィール画像', icon: 'circleUser' as const },
  { id: 'plan', label: 'プラン', icon: 'crown' as const },
  { id: 'security', label: 'セキュリティ', icon: 'shieldHalved' as const },
  { id: 'account', label: 'アカウント', icon: 'gear' as const },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | false>(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const data = await getProfile();
    if (!data) {
      window.location.href = '/login';
      return;
    }
    setProfile(data);
    setLoading(false);
  };

  // スクロール同期
  useEffect(() => {
    const handleScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(`section-${s.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            setActiveSection(s.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  if (loading || !profile) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes blockPop {
            0% { opacity: 0; transform: scale(0.5) translateY(-8px); }
            15% { opacity: 1; transform: scale(1.08) translateY(0); }
            25% { transform: scale(1) translateY(0); }
            70% { opacity: 1; transform: scale(1) translateY(0); }
            85% { opacity: 0; transform: scale(0.95) translateY(4px); }
            100% { opacity: 0; transform: scale(0.5) translateY(-8px); }
          }
          @keyframes textPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <LoadingOverlay message="読み込み中..." />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blockPop {
          0% { opacity: 0; transform: scale(0.5) translateY(-8px); }
          15% { opacity: 1; transform: scale(1.08) translateY(0); }
          25% { transform: scale(1) translateY(0); }
          70% { opacity: 1; transform: scale(1) translateY(0); }
          85% { opacity: 0; transform: scale(0.95) translateY(4px); }
          100% { opacity: 0; transform: scale(0.5) translateY(-8px); }
        }
        @keyframes textPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {typeof saving === 'string' && <LoadingOverlay message={saving} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/cms" style={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            ダッシュボード
          </Link>
        </div>
        <h1 style={styles.pageTitle}>アカウント設定</h1>
        <div style={{ width: 140 }} />
      </header>

      {/* メインレイアウト */}
      <div style={styles.layout}>
        {/* 左ナビ */}
        <nav style={styles.sideNav}>
          <div style={styles.navCard}>
            <div style={styles.navUserInfo}>
              <div style={styles.navAvatar}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1d1d1f' }}>{profile.username}</div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{profile.email}</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  ...styles.navItem,
                  background: activeSection === s.id ? '#f5f5f7' : 'transparent',
                  color: activeSection === s.id ? '#1d1d1f' : '#6e6e73',
                  fontWeight: activeSection === s.id ? 600 : 400,
                }}
              >
                {React.createElement(FA[s.icon], { width: 15, height: 15, style: { color: '#1d1d1f', flexShrink: 0 } })}
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 右コンテンツ */}
        <main style={styles.content}>
          <div id="section-profile">
            <ProfileSection profile={profile} onSaved={loadProfile} showToast={showToast} setBusy={setSaving} />
          </div>
          <div id="section-avatar" style={{ scrollMarginTop: 100 }}>
            <AvatarSection profile={profile} onSaved={loadProfile} showToast={showToast} setBusy={setSaving} />
          </div>
          <div id="section-plan" style={{ scrollMarginTop: 100 }}>
            <PlanSection profile={profile} onReload={loadProfile} />
          </div>
          <div id="section-security" style={{ scrollMarginTop: 100 }}>
            <SecuritySection showToast={showToast} profile={profile} setBusy={setSaving} />
          </div>
          <div id="section-account" style={{ scrollMarginTop: 100 }}>
            <AccountSection profile={profile} />
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// セクションA：基本情報
// ============================================================
function ProfileSection({ profile, onSaved, showToast, setBusy }: { profile: FullProfile; onSaved: () => void; showToast: (m: string, t: 'success' | 'error') => void; setBusy: (v: string | false) => void }) {
  const [username, setUsername] = useState(profile.username);
  const [orgType, setOrgType] = useState(profile.org_type);
  const [teamSize, setTeamSize] = useState(profile.team_size);
  const [industry, setIndustry] = useState(profile.industry);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setUsername(profile.username);
    setOrgType(profile.org_type);
    setTeamSize(profile.team_size);
    setIndustry(profile.industry);
  }, [profile]);

  const hasChanges = username !== profile.username || orgType !== profile.org_type || teamSize !== profile.team_size || industry !== profile.industry;

  const validateUsername = (val: string) => {
    if (val.length < 3 || val.length > 20) return 'ユーザー名は3〜20文字で入力してください';
    if (!/^[a-zA-Z0-9_\-]+$/.test(val)) return 'ユーザー名は英数字・_・-のみ使用できます';
    return '';
  };

  const handleSave = async () => {
    const usernameErr = validateUsername(username);
    if (usernameErr) { setErrors({ username: usernameErr }); return; }
    setErrors({});
    setSaving(true);
    setBusy('保存中...');

    const updates: any = {};
    if (username !== profile.username) updates.username = username;
    if (orgType !== profile.org_type) updates.org_type = orgType;
    if (teamSize !== profile.team_size) updates.team_size = teamSize;
    if (industry !== profile.industry) updates.industry = industry;

    const result = await updateProfile(updates);
    setSaving(false);
    setBusy(false);

    if (result.success) {
      showToast('プロフィールを保存しました', 'success');
      onSaved();
    } else {
      if (result.error?.includes('ユーザー名')) {
        setErrors({ username: result.error });
      } else {
        showToast(result.error || 'エラーが発生しました', 'error');
      }
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>基本情報</h2>
        <p style={styles.cardDesc}>アカウントの基本情報を管理します</p>
      </div>

      <div style={styles.formGrid}>
        {/* ユーザー名 */}
        <div style={styles.fieldFull}>
          <label style={styles.label}>ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: '' })); }}
            maxLength={20}
            style={{ ...styles.input, borderColor: errors.username ? '#d70015' : '#d2d2d7' }}
          />
          {errors.username && <p style={styles.fieldError}>{errors.username}</p>}
          <p style={styles.fieldHint}>3〜20文字、英数字・_・-のみ</p>
        </div>

        {/* メールアドレス */}
        <div style={styles.fieldFull}>
          <label style={styles.label}>メールアドレス</label>
          <input
            type="email"
            value={profile.email}
            disabled
            style={{ ...styles.input, background: '#f9f9f9', color: '#6e6e73', cursor: 'not-allowed' }}
          />
          <p style={styles.fieldHint}>メールアドレスの変更は現在対応していません</p>
        </div>

        {/* プラン */}
        <div style={styles.fieldFull}>
          <label style={styles.label}>ご利用プラン</label>
          <div style={styles.planBadge}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{getPlan(profile.plan as PlanId).name}</span>
            <a href="#plan" onClick={(e) => { e.preventDefault(); const el = document.getElementById('section-plan'); el?.scrollIntoView({ behavior: 'smooth' }); }} style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
              プラン詳細 →
            </a>
          </div>
        </div>

        {/* アカウント種別 */}
        <div style={styles.fieldFull}>
          <label style={styles.label}>アカウント種別</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {ORG_TYPES.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => setOrgType(o.value)}
                style={{
                  ...styles.choiceBtn,
                  background: orgType === o.value ? '#1d1d1f' : '#fff',
                  color: orgType === o.value ? '#fff' : '#1d1d1f',
                  borderColor: orgType === o.value ? '#1d1d1f' : '#d2d2d7',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* チーム人数 */}
        <div>
          <label style={styles.label}>チーム人数</label>
          <select value={teamSize} onChange={e => setTeamSize(e.target.value)} style={styles.select}>
            {TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 業種 */}
        <div>
          <label style={styles.label}>業種</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)} style={styles.select}>
            <option value="">選択してください</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        {/* 作成日 */}
        <div style={styles.fieldFull}>
          <label style={styles.label}>アカウント作成日</label>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
            {new Date(profile.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 保存ボタン */}
      <div style={styles.cardFooter}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            ...styles.btnPrimary,
            opacity: (!hasChanges || saving) ? 0.5 : 1,
            cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '保存中...' : '変更を保存'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// セクションB：プロフィール画像
// ============================================================
function AvatarSection({ profile, onSaved, showToast, setBusy }: { profile: FullProfile; onSaved: () => void; showToast: (m: string, t: 'success' | 'error') => void; setBusy: (v: string | false) => void }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBusy('アップロード中...');

    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadAvatar(formData);
    setUploading(false);
    setBusy(false);

    if (result.success) {
      showToast('プロフィール画像を更新しました', 'success');
      onSaved();
    } else {
      showToast(result.error || 'アップロードに失敗しました', 'error');
    }

    // input をリセット
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async () => {
    if (!confirm('プロフィール画像を削除しますか？')) return;
    setDeleting(true);
    setBusy('削除中...');
    const result = await deleteAvatar();
    setDeleting(false);
    setBusy(false);

    if (result.success) {
      showToast('プロフィール画像を削除しました', 'success');
      onSaved();
    } else {
      showToast(result.error || '削除に失敗しました', 'error');
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>プロフィール画像</h2>
        <p style={styles.cardDesc}>アバター画像のアップロード・変更・削除ができます</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '8px 0' }}>
        {/* アバタープレビュー */}
        <div style={styles.avatarLarge}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="プロフィール画像" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={styles.btnSecondary}
            >
              {uploading ? 'アップロード中...' : (profile.avatar_url ? '画像を変更' : '画像をアップロード')}
            </button>
            {profile.avatar_url && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={styles.btnDanger}
              >
                {deleting ? '削除中...' : '削除'}
              </button>
            )}
          </div>
          <p style={styles.fieldHint}>推奨: 400×400px以上の正方形画像 ・ JPG / PNG / WebP ・ 5MB以下</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// セクションC：セキュリティ
// ============================================================
function SecuritySection({ showToast, profile, setBusy }: { showToast: (m: string, t: 'success' | 'error') => void; profile: FullProfile; setBusy: (v: string | false) => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequestReset = async () => {
    setSending(true);
    setBusy('送信中...');
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      setSent(true);
      showToast('パスワード再設定メールを送信しました', 'success');
    } catch (err: any) {
      showToast(err.message || '送信に失敗しました', 'error');
    } finally {
      setSending(false);
      setBusy(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>パスワード変更</h2>
        <p style={styles.cardDesc}>パスワードを変更するには、メールに送信されるリンクから再設定します</p>
      </div>

      <div>
        {sent ? (
          <div style={{
            background: '#f0f7ff', border: '1px solid #d0e4ff', borderRadius: 10,
            padding: '20px 24px',
          }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 8px 0', color: '#1d1d1f' }}>
              ✉️ メールを送信しました
            </p>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 12px 0', lineHeight: 1.6 }}>
              <strong>{profile.email}</strong> にパスワード再設定用のメールを送信しました。<br/>
              メール内の「パスワードを再設定する」ボタンをクリックしてください。
            </p>
            <button
              onClick={() => setSent(false)}
              style={styles.btnSecondary}
            >
              再送信する
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px 0', color: '#1d1d1f' }}>
                パスワードを変更する
              </p>
              <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
                {profile.email} 宛に再設定メールを送信します
              </p>
            </div>
            <button
              onClick={handleRequestReset}
              disabled={sending}
              style={styles.btnPrimary}
            >
              {sending ? '送信中...' : '再設定メールを送信'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// セクションD：アカウント操作
// ============================================================
function AccountSection({ profile }: { profile: FullProfile }) {
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
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>アカウント</h2>
        <p style={styles.cardDesc}>ログアウトやアカウントに関する操作</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px 0', color: '#1d1d1f' }}>ログアウト</p>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>すべてのデバイスからログアウトします</p>
        </div>
        <button onClick={handleLogout} style={styles.btnDanger}>
          ログアウト
        </button>
      </div>
    </div>
  );
}

// ============================================================
// セクション：プラン管理
// ============================================================
function PlanSection({ profile, onReload }: { profile: FullProfile; onReload?: () => void }) {
  const [usage, setUsage] = useState<{ lpCount: number; storageUsedBytes: number } | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(
    (profile.plan || 'free') === 'free' ? 'yearly' : (profile.billing_interval as BillingInterval) || 'monthly'
  );

  // プラン変更モーダル
  const [changeModal, setChangeModal] = useState<{
    open: boolean;
    targetPlanId: PlanId;
    type: 'upgrade' | 'downgrade';
    violations?: string[];
  }>({ open: false, targetPlanId: 'personal', type: 'upgrade' });
  const [changeLoading, setChangeLoading] = useState(false);

  const currentPlan = (profile.plan || 'free') as PlanId;
  const currentInterval = (profile.billing_interval || 'monthly') as BillingInterval;
  const planConfig = getPlan(currentPlan);
  const hasSubscription = !!profile.stripe_subscription_id;

  useEffect(() => {
    getPlanUsage().then(u => setUsage({ lpCount: u.lpCount, storageUsedBytes: u.storageUsedBytes }));
  }, []);

  // URLパラメータでアップグレード結果を検知 → 成功ページへ遷移
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      window.location.href = '/billing/success?plan=personal';
      return;
    }
  }, []);

  // Free → 有料: Checkout フローへ
  const handleCheckout = async (planId: PlanId) => {
    try {
      setUpgradeLoading(planId);
      await startCheckout(planId, selectedInterval);
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('チェックアウトを開始できませんでした。しばらくしてから再度お試しください。');
    } finally {
      setUpgradeLoading(null);
    }
  };

  // 有料 → 有料: プラン変更モーダルを表示
  const handleChangePlan = async (targetPlanId: PlanId) => {
    const upgrading = isUpgradeFn(currentPlan, currentInterval, targetPlanId, selectedInterval);
    setChangeModal({
      open: true,
      targetPlanId,
      type: upgrading ? 'upgrade' : 'downgrade',
      violations: undefined,
    });
  };

  // プラン変更を実行
  const executeChangePlan = async () => {
    setChangeLoading(true);
    try {
      const result = await changePlan(changeModal.targetPlanId, selectedInterval);
      if (!result.success) {
        if (result.error === 'downgrade_blocked' && result.violations) {
          setChangeModal(prev => ({ ...prev, violations: result.violations }));
          setChangeLoading(false);
          return;
        }
        throw new Error(result.error || 'プラン変更に失敗しました');
      }

      // 成功 — ページをリロードして反映
      if (result.type === 'upgrade') {
        window.location.href = '/billing/success?plan=' + result.plan;
      } else {
        // ダウングレード成功
        alert('プランが変更されました。');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Change plan error:', err);
      alert(err.message || 'プラン変更に失敗しました。');
    } finally {
      setChangeLoading(false);
    }
  };

  // キャンセル予約を取り消す
  const handleReactivate = async () => {
    try {
      setChangeLoading(true);
      const result = await changePlan(currentPlan, currentInterval);
      if (result.success) {
        alert('サブスクリプションが再有効化されました。');
        window.location.reload();
      } else {
        alert(result.error || '再有効化に失敗しました。');
      }
    } catch (err: any) {
      alert(err.message || '再有効化に失敗しました。');
    } finally {
      setChangeLoading(false);
    }
  };

  const handleManage = async () => {
    try {
      setPortalLoading(true);
      await openCustomerPortal();
    } catch (err: any) {
      console.error('Portal error:', err);
      alert('ポータルを開けませんでした。');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <PlanModalStyles />
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>プラン管理</h2>
        <p style={styles.cardDesc}>現在のプランと使用状況の確認、プランの変更</p>
      </div>

      {/* 決済失敗警告 */}
      {profile.payment_failed_at && (
        <div style={{
          background: '#FFEBEE', border: '1px solid #EF9A9A', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, fontSize: 13, lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: '#C62828', marginBottom: 4, fontSize: 14 }}>
            ⚠ お支払いに問題があります
          </div>
          <p style={{ margin: '0 0 8px', color: '#424245' }}>
            最新の請求が正常に処理されませんでした。お支払い方法を更新してください。
          </p>
          <button onClick={handleManage} disabled={portalLoading} style={{
            display: 'inline-block', padding: '6px 16px', fontSize: 12, fontWeight: 700,
            background: '#C62828', color: '#fff', border: 'none', borderRadius: 8,
            cursor: portalLoading ? 'wait' : 'pointer',
          }}>
            {portalLoading ? '読み込み中...' : 'お支払い方法を更新'}
          </button>
        </div>
      )}

      {/* キャンセル予約バナー */}
      {profile.cancel_at_period_end && (
        <div style={{
          background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, fontSize: 13, lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: '#E65100', marginBottom: 4, fontSize: 14 }}>
            ⚠ サブスクリプションのキャンセルが予約されています
          </div>
          <p style={{ margin: '0 0 8px', color: '#424245' }}>
            現在の請求期間{profile.current_period_end ? `（${new Date(profile.current_period_end).toLocaleDateString('ja-JP')}まで）` : ''}の終了後、Freeプランに切り替わります。
          </p>
          <button onClick={handleReactivate} disabled={changeLoading} style={{
            display: 'inline-block', padding: '6px 16px', fontSize: 12, fontWeight: 700,
            background: '#0071e3', color: '#fff', border: 'none', borderRadius: 8,
            cursor: changeLoading ? 'wait' : 'pointer',
          }}>
            {changeLoading ? '処理中...' : 'キャンセルを取り消す'}
          </button>
        </div>
      )}

      {/* 現在のプラン + 使用状況 */}
      <div style={{
        background: '#f5f5f7', borderRadius: 12, padding: '20px 24px', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px', fontSize: 13, fontWeight: 700,
            background: currentPlan === 'free' ? '#1d1d1f' : 'linear-gradient(135deg, #0071e3, #0077ED)',
            color: '#fff', borderRadius: 8,
          }}>
            {planConfig.name}プラン
          </span>
          <span style={{ fontSize: 14, color: '#6e6e73' }}>
            {currentInterval === 'yearly' ? planConfig.yearlyPriceLabel : planConfig.priceLabel}
            {currentPlan !== 'free' && (
              <span style={{ fontSize: 12, marginLeft: 4 }}>
                （{currentInterval === 'yearly' ? '年払い' : '月払い'}）
              </span>
            )}
          </span>
          {profile.current_period_end && currentPlan !== 'free' && (
            <span style={{ fontSize: 12, color: '#6e6e73', marginLeft: 'auto' }}>
              次回更新: {new Date(profile.current_period_end).toLocaleDateString('ja-JP')}
            </span>
          )}
          {currentPlan !== 'free' && (
            <button
              onClick={handleManage}
              disabled={portalLoading}
              style={{
                marginLeft: profile.current_period_end ? 0 : 'auto',
                fontSize: 12, fontWeight: 600,
                color: '#0071e3', background: 'none', border: '1px solid #0071e3',
                borderRadius: 8, padding: '4px 12px', cursor: portalLoading ? 'wait' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {portalLoading ? '読み込み中...' : 'サブスクリプション管理'}
            </button>
          )}
        </div>
        {usage && (
          <>
            <UsageBar
              label="LP"
              current={usage.lpCount}
              max={planConfig.maxLps === 9999 ? usage.lpCount : planConfig.maxLps}
              unit={planConfig.maxLps === 9999 ? ' (無制限)' : ''}
            />
            <UsageBar
              label="ストレージ"
              current={usage.storageUsedBytes}
              max={planConfig.maxStorageBytes}
              formatValue={formatBytes}
            />
          </>
        )}
      </div>

      {/* 月額/年額トグル */}
      <div style={{ textAlign: 'center' }}>
        <IntervalToggle interval={selectedInterval} onChange={setSelectedInterval} />
      </div>

      {/* プラン比較カード */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
        <PlanCard
          planConfig={PLANS.free}
          currentPlan={currentPlan}
          currentInterval={currentInterval}
          selectedInterval={selectedInterval}
          hasSubscription={hasSubscription}
          onUpgrade={handleCheckout}
          onChangePlan={handleChangePlan}
          onManage={handleManage}
          upgradeLoading={upgradeLoading}
        />
        <PlanCard
          planConfig={PLANS.personal}
          currentPlan={currentPlan}
          currentInterval={currentInterval}
          selectedInterval={selectedInterval}
          isPopular
          hasSubscription={hasSubscription}
          onUpgrade={handleCheckout}
          onChangePlan={handleChangePlan}
          onManage={handleManage}
          upgradeLoading={upgradeLoading}
        />
        <PlanCard
          planConfig={PLANS.business}
          currentPlan={currentPlan}
          currentInterval={currentInterval}
          selectedInterval={selectedInterval}
          hasSubscription={hasSubscription}
          onUpgrade={handleCheckout}
          onChangePlan={handleChangePlan}
          onManage={handleManage}
          upgradeLoading={upgradeLoading}
        />
      </div>

      {/* Business補足文言 */}
      {currentPlan === 'personal' && (
        <p style={{
          fontSize: 13, color: '#6e6e73', marginTop: 20, lineHeight: 1.7,
          background: '#f5f5f7', borderRadius: 10, padding: '14px 18px',
        }}>
          クライアントワークや複数案件を扱う場合は、<br />Businessプランがおすすめです。
        </p>
      )}

      {/* プラン変更確認モーダル */}
      <ConfirmChangeModal
        isOpen={changeModal.open}
        onClose={() => setChangeModal(prev => ({ ...prev, open: false }))}
        type={changeModal.type}
        currentPlan={planConfig}
        targetPlan={getPlan(changeModal.targetPlanId)}
        currentInterval={currentInterval}
        targetInterval={selectedInterval}
        onConfirm={executeChangePlan}
        loading={changeLoading}
        violations={changeModal.violations}
      />
    </div>
  );
}

// ============================================================
// スタイル定義
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", YuGothic, sans-serif',
    color: '#1d1d1f',
    background: '#f5f5f7',
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased' as any,
  },
  header: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e5e5e5',
    padding: '14px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 14, fontWeight: 500, color: '#0071e3', textDecoration: 'none',
    transition: 'opacity 0.15s',
  },
  pageTitle: {
    fontSize: 18, fontWeight: 700, margin: 0, color: '#1d1d1f', letterSpacing: '-0.01em',
  },
  layout: {
    display: 'flex', gap: 32, maxWidth: 1100, margin: '0 auto',
    padding: '88px 32px 64px',
    alignItems: 'flex-start',
  },
  sideNav: {
    position: 'sticky' as any, top: 80,
    width: 240, flexShrink: 0,
  },
  navCard: {
    background: '#fff', borderRadius: 16, padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)',
  },
  navUserInfo: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px',
  },
  navAvatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    textAlign: 'left' as any, transition: 'all 0.15s',
  },
  content: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column' as any, gap: 24,
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '28px 32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)',
  },
  cardHeader: {
    marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0',
  },
  cardTitle: {
    fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: '#1d1d1f',
  },
  cardDesc: {
    fontSize: 13, color: '#6e6e73', margin: 0,
  },
  cardFooter: {
    marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0',
    display: 'flex', justifyContent: 'flex-end',
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px',
  },
  fieldFull: {
    gridColumn: '1 / -1',
  },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1d1d1f',
  },
  input: {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none',
    boxSizing: 'border-box' as any, transition: 'border-color 0.2s, box-shadow 0.2s',
    color: '#1d1d1f', background: '#fff',
  },
  select: {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none',
    boxSizing: 'border-box' as any, color: '#1d1d1f', background: '#fff',
  },
  choiceBtn: {
    flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600,
    border: '1px solid', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
    textAlign: 'center' as any,
  },
  planBadge: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#f0f7ff', border: '1px solid #d0e4ff', borderRadius: 10,
    padding: '12px 18px',
  },
  fieldError: {
    color: '#d70015', fontSize: 12, margin: '4px 0 0', fontWeight: 500,
  },
  fieldHint: {
    fontSize: 12, color: '#8e8e93', margin: '4px 0 0',
  },
  avatarLarge: {
    width: 96, height: 96, borderRadius: '50%',
    background: '#f5f5f7', border: '2px solid #e5e5e5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  btnPrimary: {
    padding: '10px 28px', fontSize: 14, fontWeight: 600,
    background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  btnSecondary: {
    padding: '9px 20px', fontSize: 13, fontWeight: 600,
    background: '#fff', color: '#1d1d1f', border: '1px solid #d2d2d7',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
  },
  btnDanger: {
    padding: '9px 20px', fontSize: 13, fontWeight: 600,
    background: '#fff', color: '#d70015', border: '1px solid #d2d2d7',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
  },
  eyeBtn: {
    position: 'absolute' as any, right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    display: 'flex', alignItems: 'center',
  },
};
