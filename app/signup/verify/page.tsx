'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function VerifyPage() {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('signup_email');
    if (stored) setEmail(stored);
    else window.location.href = '/signup';
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) { setError('確認コードを入力してください'); return; }
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'email',
      });
      if (error) throw error;
      window.location.href = '/signup/account';
    } catch (err: any) {
      setError(err.message || 'コードの検証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setResendCooldown(60);
    } catch {
      setError('再送信に失敗しました');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.step}>会員登録 (2/4)</div>
        <h1 style={styles.title}>確認コードの入力</h1>
        <p style={styles.subtitle}>
          <strong>{email}</strong> に確認コードを送信しました。<br/>
          メールに届いたコードを入力するか、メール内のURLをクリックしてください。
        </p>

        <form onSubmit={handleVerify}>
          <label style={styles.label}>確認コード</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            style={{...styles.input, textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: 700}}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '確認中...' : '確認する'}
          </button>
        </form>

        <div style={{textAlign: 'center', marginTop: 20}}>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{...styles.linkBtn, opacity: resendCooldown > 0 ? 0.5 : 1}}
          >
            {resendCooldown > 0 ? `再送信 (${resendCooldown}秒)` : 'コードを再送信する'}
          </button>
        </div>

        <div style={styles.infoBox}>
          <p style={{margin: 0, fontSize: 12, color: '#6e6e73', lineHeight: 1.6}}>
            💡 メール内のURLをクリックしても認証できます。<br/>
            クリック後、自動的に次のステップに進みます。
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', padding: 20 },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  step: { fontSize: 12, fontWeight: 700, color: '#0071e3', marginBottom: 8, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1d1d1f' },
  subtitle: { fontSize: 14, color: '#6e6e73', marginBottom: 24, lineHeight: 1.6 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1d1d1f' },
  input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16 },
  button: { width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  error: { color: '#d70015', fontSize: 13, marginBottom: 12 },
  linkBtn: { background: 'none', border: 'none', color: '#0071e3', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 },
  infoBox: { marginTop: 20, padding: '12px 16px', background: '#f0f7ff', borderRadius: 8, border: '1px solid #d0e4ff' },
};
