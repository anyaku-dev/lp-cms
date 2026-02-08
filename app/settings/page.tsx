'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, changePassword, FullProfile } from './actions';
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

// --- Section Nav ---
const SECTIONS = [
  { id: 'profile', label: '基本情報', icon: '👤' },
  { id: 'avatar', label: 'プロフィール画像', icon: '🖼️' },
  { id: 'security', label: 'セキュリティ', icon: '🔒' },
  { id: 'account', label: 'アカウント', icon: '⚙️' },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#6e6e73' }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⚙️</div>
            <div style={{ fontSize: 14 }}>読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

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
                <span style={{ fontSize: 15 }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 右コンテンツ */}
        <main style={styles.content}>
          <div id="section-profile">
            <ProfileSection profile={profile} onSaved={loadProfile} showToast={showToast} />
          </div>
          <div id="section-avatar" style={{ scrollMarginTop: 100 }}>
            <AvatarSection profile={profile} onSaved={loadProfile} showToast={showToast} />
          </div>
          <div id="section-security" style={{ scrollMarginTop: 100 }}>
            <SecuritySection showToast={showToast} />
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
function ProfileSection({ profile, onSaved, showToast }: { profile: FullProfile; onSaved: () => void; showToast: (m: string, t: 'success' | 'error') => void }) {
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

    const updates: any = {};
    if (username !== profile.username) updates.username = username;
    if (orgType !== profile.org_type) updates.org_type = orgType;
    if (teamSize !== profile.team_size) updates.team_size = teamSize;
    if (industry !== profile.industry) updates.industry = industry;

    const result = await updateProfile(updates);
    setSaving(false);

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
            <span style={{ fontWeight: 700, fontSize: 15 }}>Free</span>
            <span style={{ fontSize: 12, color: '#6e6e73' }}>すべての機能を無料でご利用いただけます</span>
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
function AvatarSection({ profile, onSaved, showToast }: { profile: FullProfile; onSaved: () => void; showToast: (m: string, t: 'success' | 'error') => void }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadAvatar(formData);
    setUploading(false);

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
    const result = await deleteAvatar();
    setDeleting(false);

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
function SecuritySection({ showToast }: { showToast: (m: string, t: 'success' | 'error') => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (newPassword.length < 8) e.newPassword = 'パスワードは8文字以上にしてください';
    else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) e.newPassword = '英字と数字を両方含めてください';
    if (newPassword !== confirmPassword) e.confirmPassword = 'パスワードが一致しません';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const result = await changePassword(newPassword);
    setSaving(false);

    if (result.success) {
      showToast('パスワードを変更しました', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(result.error || 'パスワードの変更に失敗しました', 'error');
    }
  };

  const isValid = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && newPassword === confirmPassword;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>パスワード変更</h2>
        <p style={styles.cardDesc}>定期的にパスワードを更新し、アカウントを安全に保ちましょう</p>
      </div>

      <div style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={styles.label}>新しいパスワード</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: '' })); }}
              placeholder="8文字以上（英字+数字）"
              style={{ ...styles.input, paddingRight: 44, borderColor: errors.newPassword ? '#d70015' : '#d2d2d7' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              aria-label="パスワードを表示"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showPassword ? (
                  <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                ) : (
                  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                )}
              </svg>
            </button>
          </div>
          {errors.newPassword && <p style={styles.fieldError}>{errors.newPassword}</p>}

          {/* 強度インジケーター */}
          {newPassword.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <PasswordStrength password={newPassword} />
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={styles.label}>新しいパスワード（確認）</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
            placeholder="もう一度入力"
            style={{ ...styles.input, borderColor: errors.confirmPassword ? '#d70015' : '#d2d2d7' }}
          />
          {errors.confirmPassword && <p style={styles.fieldError}>{errors.confirmPassword}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          style={{
            ...styles.btnPrimary,
            opacity: (!isValid || saving) ? 0.5 : 1,
            cursor: (!isValid || saving) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '変更中...' : 'パスワードを変更する'}
        </button>
      </div>
    </div>
  );
}

// --- パスワード強度 ---
function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const labels = ['非常に弱い', '弱い', '普通', '強い', '非常に強い'];
  const colors = ['#d70015', '#f5a623', '#f5c623', '#34c759', '#00875a'];
  const level = Math.min(score, 4);

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= level ? colors[level] : '#e5e5e5', transition: 'background 0.3s' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[level], fontWeight: 500 }}>{labels[level]}</span>
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
