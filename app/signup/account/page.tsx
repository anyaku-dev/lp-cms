'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AccountPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signup'; return; }

      // 既にプロフィール設定済みならダッシュボードへ
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      if (profile) { window.location.href = '/cms'; return; }

      setCheckingAuth(false);
    };
    check();
  }, []);

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'パスワードは8文字以上で入力してください';
    if (!/[a-zA-Z]/.test(pw)) return 'パスワードに英字を含めてください';
    if (!/[0-9]/.test(pw)) return 'パスワードに数字を含めてください';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = username.trim().toLowerCase();
    if (!trimmed) { setError('ユーザー名を入力してください'); return; }
    if (!/^[a-z0-9_-]{3,30}$/.test(trimmed)) { setError('ユーザー名は3〜30文字の英小文字・数字・_-のみ使用できます'); return; }

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('セッションが無効です。最初からやり直してください。');

      // ユーザー名の重複チェック
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', trimmed).single();
      if (existing) { setError('このユーザー名は既に使用されています'); setLoading(false); return; }

      // パスワード設定
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // プロフィール作成
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: user.id,
        username: trimmed,
        email: user.email || '',
      });
      if (profileErr) throw profileErr;

      // user_settings 初期レコード作成
      const { error: settingsErr } = await supabase.from('user_settings').insert({ user_id: user.id });
      if (settingsErr) throw settingsErr;

      // usernameをsessionStorageに保存（R2 prefix用）
      sessionStorage.setItem('signup_username', trimmed);

      window.location.href = '/signup/profile';
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <div style={styles.container}><div style={styles.card}><p style={{textAlign:'center',color:'#888'}}>読み込み中...</p></div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.step}>会員登録 (3/4)</div>
        <h1 style={styles.title}>アカウント設定</h1>
        <p style={styles.subtitle}>ユーザー名とパスワードを設定してください。</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>ユーザー名</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="例: mycompany"
            style={styles.input}
            autoFocus
          />
          <p style={styles.hint}>英小文字・数字・ハイフン・アンダースコアのみ（3〜30文字）</p>

          <label style={styles.label}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="8文字以上（英字+数字必須）"
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '設定中...' : '次へ進む'}
          </button>
        </form>
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
  input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 4 },
  hint: { fontSize: 11, color: '#999', marginBottom: 16, marginTop: 0 },
  button: { width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 8 },
  error: { color: '#d70015', fontSize: 13, marginBottom: 12 },
};
