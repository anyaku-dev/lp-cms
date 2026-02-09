'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // メールアドレスの存在確認は Supabase 側で行われる
      // セキュリティ上、存在しないメールでもエラーを返さないのが一般的だが、
      // 要件に合わせてユーザーに案内する
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'リクエストの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 style={styles.title}>メールを送信しました</h1>
          <p style={styles.subtitle}>
            <strong>{email}</strong> にパスワード再設定用のメールを送信しました。<br/><br/>
            メール内の「パスワードを再設定する」ボタンをクリックして、新しいパスワードを設定してください。
          </p>
          <div style={styles.infoBox}>
            <p style={{ margin: 0, fontSize: 12, color: '#6e6e73', lineHeight: 1.6 }}>
              💡 メールが届かない場合は、迷惑メールフォルダをご確認ください。<br/>
              数分経っても届かない場合は、メールアドレスが正しいかご確認の上、再度お試しください。
            </p>
          </div>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            style={{ ...styles.btnSecondary, width: '100%', marginTop: 16 }}
          >
            別のメールアドレスで再送信
          </button>
          <p style={styles.footer}>
            <Link href="/login" style={styles.link}>ログインに戻る</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>パスワードの再設定</h1>
        <p style={styles.subtitle}>
          登録済みのメールアドレスを入力してください。<br/>
          パスワード再設定用のメールをお送りします。
        </p>

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
            {loading ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        <p style={styles.footer}>
          <Link href="/login" style={styles.link}>ログインに戻る</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', padding: 20 },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  iconWrap: { textAlign: 'center' as const, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1d1d1f' },
  subtitle: { fontSize: 14, color: '#6e6e73', marginBottom: 24, lineHeight: 1.6 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1d1d1f' },
  input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16 },
  button: { width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  btnSecondary: { padding: '12px 20px', fontSize: 14, fontWeight: 600, background: '#fff', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 8, cursor: 'pointer' },
  error: { color: '#d70015', fontSize: 13, marginBottom: 12 },
  footer: { marginTop: 24, textAlign: 'center' as const, fontSize: 13, color: '#6e6e73' },
  link: { color: '#0071e3', textDecoration: 'none', fontWeight: 600 },
  infoBox: { marginTop: 20, padding: '12px 16px', background: '#f0f7ff', borderRadius: 8, border: '1px solid #d0e4ff' },
};
