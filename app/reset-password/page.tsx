'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Supabase がリカバリートークンからセッションを復元するのを待つ
  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange で PASWORD_RECOVERY イベントを検知
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // 既にセッションがある場合（callback経由でリダイレクトされた場合）
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // 3秒後にまだセッションがなければエラー表示
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setSessionError(true);
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const validate = () => {
    if (newPassword.length < 8) return 'パスワードは8文字以上にしてください';
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return '英字と数字を両方含めてください';
    if (newPassword !== confirmPassword) return 'パスワードが一致しません';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccess(true);

      // 強制ログアウト → ログイン画面へ
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'パスワードの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const isValid = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && newPassword === confirmPassword;

  // 成功画面
  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 style={styles.title}>パスワードを更新しました</h1>
          <p style={styles.subtitle}>
            パスワードが正常に変更されました。<br/>
            セキュリティのため自動的にログアウトします。<br/>
            新しいパスワードでログインしてください。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: '3px solid #e5e5e5', borderTop: '3px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <p style={{ fontSize: 12, color: '#6e6e73', textAlign: 'center', marginTop: 12 }}>ログイン画面にリダイレクトしています...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // セッションエラー
  if (sessionError && !sessionReady) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>リンクが無効です</h1>
          <p style={styles.subtitle}>
            パスワード再設定のリンクが期限切れ、または無効です。<br/>
            もう一度パスワードの再設定をリクエストしてください。
          </p>
          <Link href="/forgot-password" style={{ ...styles.button, display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            再設定をリクエスト
          </Link>
          <p style={styles.footer}>
            <Link href="/login" style={styles.link}>ログインに戻る</Link>
          </p>
        </div>
      </div>
    );
  }

  // ローディング（セッション待ち）
  if (!sessionReady) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e5e5', borderTop: '3px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, color: '#6e6e73' }}>認証を確認中...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // パスワード入力フォーム
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>新しいパスワードを設定</h1>
        <p style={styles.subtitle}>
          安全なパスワードを設定してください。<br/>
          設定後、自動的にログアウトされますので、新しいパスワードでログインしてください。
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>新しいパスワード</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                placeholder="8文字以上（英字+数字）"
                style={{ ...styles.input, paddingRight: 44, marginBottom: 4 }}
                autoFocus
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
            {newPassword.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <PasswordStrength password={newPassword} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={styles.label}>新しいパスワード（確認）</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="もう一度入力"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={!isValid || loading}
            style={{
              ...styles.button,
              opacity: (!isValid || loading) ? 0.5 : 1,
              cursor: (!isValid || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '更新中...' : 'パスワードを更新する'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', padding: 20 },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1d1d1f' },
  subtitle: { fontSize: 14, color: '#6e6e73', marginBottom: 24, lineHeight: 1.6 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1d1d1f' },
  input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16 },
  button: { width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  error: { color: '#d70015', fontSize: 13, marginBottom: 12 },
  footer: { marginTop: 24, textAlign: 'center' as const, fontSize: 13, color: '#6e6e73' },
  link: { color: '#0071e3', textDecoration: 'none', fontWeight: 600 },
  eyeBtn: {
    position: 'absolute' as any, right: 12, top: 14,
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    display: 'flex', alignItems: 'center',
  },
};
