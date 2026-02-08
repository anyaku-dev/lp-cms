'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      // emailをsessionStorageに保存（URLに出さない）
      sessionStorage.setItem('signup_email', email.trim());
      window.location.href = '/signup/verify';
    } catch (err: any) {
      setError(err.message || '送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.step}>会員登録 (1/4)</div>
        <h1 style={styles.title}>爆速画像LPコーディングPRO</h1>
        <p style={styles.subtitle}>メールアドレスを入力して、会員登録を始めましょう。</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '送信中...' : '確認メールを送信'}
          </button>
        </form>

        <p style={styles.footer}>
          すでにアカウントをお持ちの方は <Link href="/login" style={styles.link}>ログイン</Link>
        </p>
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
  footer: { marginTop: 24, textAlign: 'center' as const, fontSize: 13, color: '#6e6e73' },
  link: { color: '#0071e3', textDecoration: 'none', fontWeight: 600 },
};
