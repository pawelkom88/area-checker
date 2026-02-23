import type { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return (
        <div role="alert" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-dark-gray, #1f2937)', marginBottom: '1rem' }}>
                Oops! Something went wrong.
            </h2>
            <p style={{ color: 'var(--color-slate-gray, #64748b)', marginBottom: '2rem', maxWidth: '400px' }}>
                We encountered an unexpected error while loading the Snapshot app.
            </p>

            {import.meta.env.DEV && (
                <pre style={{
                    background: '#f1f5f9',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'left',
                    overflow: 'auto',
                    maxWidth: '80%',
                    fontSize: '0.875rem',
                    marginBottom: '2rem'
                }}>
                    {errorMessage}
                </pre>
            )}

            <button
                onClick={resetErrorBoundary}
                style={{
                    background: 'var(--color-accent, #3b82f6)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
            >
                Try Again
            </button>
        </div>
    );
}
