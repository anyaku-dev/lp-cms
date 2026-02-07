'use client';

export default function SlugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto' }}>
      <h2 style={{ color: '#dc2626' }}>⚠ ページの読み込みに失敗しました</h2>
      <pre style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
        padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 14
      }}>
        {error.message || '不明なエラー'}
        {error.digest && `\n\nDigest: ${error.digest}`}
      </pre>
      <button
        onClick={() => reset()}
        style={{
          marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#2563eb',
          color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14
        }}
      >
        再試行
      </button>
    </div>
  );
}
