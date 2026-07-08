'use client'

interface DeliveryPublicoEmConstrucaoScreenProps {
  slug: string
}

/**
 * Placeholder inicial do fluxo público de delivery.
 * Substitui temporariamente as telas legadas em `cardapio-digital`.
 */
export default function DeliveryPublicoEmConstrucaoScreen({
  slug,
}: DeliveryPublicoEmConstrucaoScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div
        className="max-w-md w-full rounded-2xl shadow-xl p-8 text-center"
        style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
      >
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--cardapio-bg-elevated)' }}
        >
          <svg
            className="h-10 w-10"
            style={{ color: 'var(--cardapio-accent-primary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--cardapio-text-primary)' }}
        >
          Delivery público
        </h1>

        <p className="text-sm mb-6" style={{ color: 'var(--cardapio-text-secondary)' }}>
          Estamos preparando uma nova experiência para você fazer pedidos online.
        </p>

        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--cardapio-bg-primary)',
            color: 'var(--cardapio-text-muted)',
          }}
        >
          <span className="font-medium" style={{ color: 'var(--cardapio-text-secondary)' }}>
            Página em construção
          </span>
          {slug ? (
            <p className="mt-2 break-all">
              Loja: <span style={{ color: 'var(--cardapio-text-primary)' }}>{slug}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
