'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        >
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              应用发生了错误
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              发生了意外错误。请重试，如果问题仍然存在，请联系支持团队。
            </p>
            {error.digest && (
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                错误 ID：
                {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
