'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const ORG_TYPES = [
  { value: 'corporation', label: '法人' },
  { value: 'individual', label: '個人' },
];

const TEAM_SIZES = ['1名', '2〜5名', '6〜10名', '11〜30名', '31名以上'];

const INDUSTRIES = [
  'IT・Web', '広告・マーケティング', 'EC・小売', '不動産', '美容・健康',
  '教育', '金融・保険', '飲食', '建設', 'その他',
];

export default function ProfilePage() {
  const [orgType, setOrgType] = useState('individual');
  const [teamSize, setTeamSize] = useState('1名');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signup'; return; }
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('セッションが無効です');

      const { error: updateErr } = await supabase.from('profiles').update({
        org_type: orgType,
        team_size: teamSize,
        industry: industry,
        plan: 'free',
      }).eq('id', user.id);

      if (updateErr) throw updateErr;

      window.location.href = '/cms';
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.step}>会員登録 (4/4)</div>
        <h1 style={styles.title}>プロフィール設定</h1>
        <p style={styles.subtitle}>あなたについて教えてください（後から変更できます）。</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>法人 / 個人</label>
          <div style={{display: 'flex', gap: 12, marginBottom: 20}}>
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

          <label style={styles.label}>チーム人数</label>
          <select
            value={teamSize}
            onChange={e => setTeamSize(e.target.value)}
            style={styles.select}
          >
            {TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={styles.label}>業種</label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            style={styles.select}
          >
            <option value="">選択してください</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>

          <div style={styles.planBox}>
            <span style={{fontSize: 12, fontWeight: 700, color: '#0071e3'}}>ご利用プラン</span>
            <div style={{fontSize: 20, fontWeight: 700, marginTop: 4}}>Free（完全無料）</div>
            <p style={{fontSize: 12, color: '#6e6e73', marginTop: 4}}>すべての機能を無料でご利用いただけます。</p>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '設定中...' : '登録を完了する'}
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
  select: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #d2d2d7', borderRadius: 8, outline: 'none', marginBottom: 20, boxSizing: 'border-box' as const },
  choiceBtn: { flex: 1, padding: '12px', fontSize: 14, fontWeight: 600, border: '1px solid', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' },
  planBox: { background: '#f0f7ff', border: '1px solid #d0e4ff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, marginTop: 8 },
  button: { width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  error: { color: '#d70015', fontSize: 13, marginBottom: 12 },
};
