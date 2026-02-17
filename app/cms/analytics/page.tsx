'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAnalyticsStats,
  cleanupOldAnalytics,
  type AnalyticsStats,
  type AnalyticsDailyPV,
} from '../actions';
import { getCurrentUser } from '../actions';
import styles from '../cms.module.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const COLORS = [
  '#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#5856d6', '#ff2d55', '#00c7be', '#007aff', '#ff6482',
];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}分${remSec}秒`;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function AnalyticsPage() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLpIds, setSelectedLpIds] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [cleanupMsg, setCleanupMsg] = useState('');

  const fetchStats = useCallback(async (lpIds: string[] = []) => {
    setLoading(true);
    try {
      const data = await getAnalyticsStats(lpIds, startDate, endDate);
      setStats(data);
      if (selectedLpIds.size === 0 && data.lps.length > 0) {
        setSelectedLpIds(new Set(data.lps.map(lp => lp.id)));
      }
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
    getCurrentUser().then(u => {
      if (u) setUserPlan(u.plan || 'free');
    });
  }, []);

  const handleSearch = () => {
    const ids = allSelected ? [] : Array.from(selectedLpIds);
    fetchStats(ids);
  };

  const toggleLp = (id: string) => {
    setSelectedLpIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setAllSelected(false);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedLpIds(new Set());
      setAllSelected(false);
    } else {
      setSelectedLpIds(new Set(stats?.lps.map(lp => lp.id) || []));
      setAllSelected(true);
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await cleanupOldAnalytics();
      setCleanupMsg(result.deleted > 0
        ? `${result.deleted}件の古いデータを削除しました`
        : '削除対象のデータはありませんでした'
      );
      setTimeout(() => setCleanupMsg(''), 3000);
      handleSearch();
    } catch {
      setCleanupMsg('削除に失敗しました');
    }
  };

  // --- 集計データの加工 ---

  // 選択中のLPでフィルタ
  const filteredPVs = useMemo(() => {
    if (!stats) return [];
    return stats.dailyPVs.filter(pv => selectedLpIds.has(pv.lpId));
  }, [stats, selectedLpIds]);

  // 日別PVチャートデータ: 日付 × LP別
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, any>>();

    for (const pv of filteredPVs) {
      if (!dateMap.has(pv.date)) {
        dateMap.set(pv.date, { date: pv.date, total: 0 });
      }
      const entry = dateMap.get(pv.date)!;
      const lpKey = pv.lpTitle || pv.slug || pv.lpId;
      entry[lpKey] = (entry[lpKey] || 0) + pv.count;
      entry.total += pv.count;
    }

    // 日付範囲の全日付を埋める
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allDates: Record<string, any>[] = [];
    const d = new Date(start);
    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0];
      allDates.push(dateMap.get(dateStr) || { date: dateStr, total: 0 });
      d.setDate(d.getDate() + 1);
    }

    return allDates;
  }, [filteredPVs, startDate, endDate]);

  // LP名のリスト（チャートの線用）
  const lpNames = useMemo(() => {
    if (!stats) return [];
    return stats.lps
      .filter(lp => selectedLpIds.has(lp.id))
      .map(lp => lp.title || lp.slug || lp.id);
  }, [stats, selectedLpIds]);

  // 滞在時間データ
  const filteredDwell = useMemo(() => {
    if (!stats) return [];
    return stats.dwellStats.filter(d => selectedLpIds.has(d.lpId));
  }, [stats, selectedLpIds]);

  // クリックデータ
  const filteredClicks = useMemo(() => {
    if (!stats) return [];
    return stats.clickStats.filter(c => selectedLpIds.has(c.lpId));
  }, [stats, selectedLpIds]);

  // PV合計
  const totalPV = useMemo(() => {
    return filteredPVs.reduce((sum, pv) => sum + pv.count, 0);
  }, [filteredPVs]);

  // 平均滞在時間
  const avgDwell = useMemo(() => {
    if (filteredDwell.length === 0) return 0;
    const totalWeighted = filteredDwell.reduce((s, d) => s + d.avgDurationMs * d.totalLeaves, 0);
    const totalLeaves = filteredDwell.reduce((s, d) => s + d.totalLeaves, 0);
    return totalLeaves > 0 ? Math.round(totalWeighted / totalLeaves) : 0;
  }, [filteredDwell]);

  // クリック合計
  const totalClicks = useMemo(() => {
    return filteredClicks.reduce((sum, c) => sum + c.count, 0);
  }, [filteredClicks]);

  return (
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <h1 className={styles.pageTitle}>📊 アクセス解析</h1>
        <button
          onClick={() => window.location.href = '/cms'}
          className={`${styles.btn} ${styles.btnSecondary}`}
          style={{ fontSize: 14 }}
        >
          ← ダッシュボードに戻る
        </button>
      </div>

      <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
        {/* 左: フィルターパネル */}
        <div style={{ flex: '0 0 320px' }}>
          <div className={styles.panel}>
            <h3 className={styles.sectionTitle}>期間</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
              <span style={{ color: '#888' }}>〜</span>
              <input
                type="date"
                className={styles.input}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
              />
            </div>

            {/* クイック期間ボタン */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { label: '7日', days: 7 },
                { label: '30日', days: 30 },
                { label: '90日', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - days);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className={`${styles.btnSmall} ${styles.btnSecondary}`}
                  style={{ fontSize: 12 }}
                >
                  直近{label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panel} style={{ marginTop: 16 }}>
            <h3 className={styles.sectionTitle}>LP 絞り込み</h3>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
              />
              すべて選択
            </label>
            <div style={{
              maxHeight: 300,
              overflowY: 'auto',
              borderTop: '1px solid #eee',
              paddingTop: 8,
            }}>
              {(stats?.lps || []).map((lp, i) => (
                <label
                  key={lp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    padding: '4px 0',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLpIds.has(lp.id)}
                    onChange={() => toggleLp(lp.id)}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: COLORS[i % COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lp.title || lp.slug}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className={styles.btn}
            style={{
              marginTop: 16,
              width: '100%',
              fontSize: 15,
              padding: '10px',
              background: '#000',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '読み込み中...' : 'データを取得'}
          </button>

          {/* 無料プランのデータ保持期間通知 */}
          {userPlan === 'free' && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                background: '#fff8e1',
                borderRadius: 10,
                fontSize: 12,
                color: '#8b6914',
                border: '1px solid #ffe082',
              }}
            >
              ⚠️ 無料プランではデータ保持期間は直近30日です。有料プランにアップグレードすると無制限になります。
              <button
                onClick={handleCleanup}
                style={{
                  display: 'block',
                  marginTop: 6,
                  fontSize: 11,
                  color: '#b36b00',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                30日より前のデータを削除
              </button>
              {cleanupMsg && <p style={{ marginTop: 4, fontSize: 11, color: '#666' }}>{cleanupMsg}</p>}
            </div>
          )}
        </div>

        {/* 右: グラフ・データエリア */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div className={styles.panel} style={{ textAlign: 'center', padding: 60 }}>
              <div style={{
                width: 40, height: 40, border: '3px solid #eee',
                borderTop: '3px solid #0071e3', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
              }} />
              <p style={{ color: '#888' }}>データを読み込み中...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
            </div>
          ) : (
            <>
              {/* サマリーカード */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div className={styles.panel} style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>合計 PV</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#0071e3' }}>
                    {totalPV.toLocaleString()}
                  </div>
                </div>
                <div className={styles.panel} style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>平均滞在時間</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#34c759' }}>
                    {formatDuration(avgDwell)}
                  </div>
                </div>
                <div className={styles.panel} style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>ボタンクリック数</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#ff9500' }}>
                    {totalClicks.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* PV推移チャート */}
              <div className={styles.panel} style={{ marginBottom: 24 }}>
                <h3 className={styles.sectionTitle}>PV推移</h3>
                {chartData.length > 0 && totalPV > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => {
                          const d = new Date(v);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        labelFormatter={v => {
                          const d = new Date(v as string);
                          return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {selectedLpIds.size <= 1 ? (
                        <Line
                          type="monotone"
                          dataKey="total"
                          name="PV"
                          stroke={COLORS[0]}
                          strokeWidth={2}
                          dot={chartData.length <= 31}
                        />
                      ) : (
                        lpNames.map((name, i) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            dot={chartData.length <= 31}
                            connectNulls
                          />
                        ))
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                    表示するデータがありません
                  </div>
                )}
              </div>

              {/* 滞在時間 */}
              <div className={styles.panel} style={{ marginBottom: 24 }}>
                <h3 className={styles.sectionTitle}>平均滞在時間（LP別）</h3>
                {filteredDwell.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(200, filteredDwell.length * 50)}>
                    <BarChart
                      data={filteredDwell.map(d => ({
                        name: d.lpTitle || d.slug,
                        avgSec: Math.round(d.avgDurationMs / 1000),
                        sessions: d.totalLeaves,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} unit="秒" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={150}
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val}秒`, '平均滞在時間']}
                      />
                      <Bar dataKey="avgSec" fill="#34c759" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                    表示するデータがありません
                  </div>
                )}
              </div>

              {/* ボタンクリック一覧 */}
              <div className={styles.panel}>
                <h3 className={styles.sectionTitle}>ボタンクリック数</h3>
                {filteredClicks.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: 600 }}>LP</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: 600 }}>ボタンID</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#888', fontWeight: 600 }}>クリック数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClicks.map((click, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '8px 12px' }}>{click.lpTitle}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <code style={{
                              background: '#f3f4f6',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                            }}>
                              {click.buttonId}
                            </code>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                            {click.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                    ボタンクリックデータがありません
                    <p style={{ fontSize: 12, marginTop: 8 }}>
                      LP画像のリンクエリアやフッターCTAに「ボタンID」を設定すると、クリック数が計測されます。
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
