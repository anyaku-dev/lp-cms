'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto' }}>
        <h2 style={{ color: '#dc2626' }}>⚠ グローバルエラー</h2>
        <pre style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 14
        }}>
          {error.message || '不明なエラー'}
          {error.digest && `\n\nDigest: ${error.digest}`}
        </pre>
        <p style={{ color: '#666', fontSize: 14, marginTop: '1rem' }}>
          詳細なエラー情報は <a href="/api/health" style={{ color: '#2563eb' }}>/api/health</a> で確認できます。
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#2563eb',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14
          }}
        >
          再試行
        </button>
      </body>
    </html>
  );
}
