'use client'

/**
 * Instruções quando o cardápio não foi encontrado ou não há slug válido.
 */
export default function InstrucoesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="max-w-md w-full rounded-2xl shadow-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--delivery-surface, #ffffff)',
          color: 'var(--delivery-text, #171717)',
        }}
      >
        <div className="mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: 'var(--delivery-surface-muted, #f3f4f6)',
            }}
          >
            <svg
              className="w-10 h-10"
              style={{ color: 'var(--delivery-primary, #333333)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{
              color: 'var(--delivery-text, #171717)',
              fontFamily: 'var(--delivery-font-title, inherit)',
            }}
          >
            Cardápio digital
          </h1>
          <p style={{ color: 'var(--delivery-text-secondary, #525252)' }}>
            Acesse o link compartilhado pelo restaurante para ver o cardápio e fazer seu pedido.
          </p>
        </div>

        <div
          className="rounded-lg p-6 mb-6 text-left"
          style={{
            backgroundColor: 'var(--delivery-surface-muted, #f3f4f6)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: 'var(--delivery-text, #171717)' }}
          >
            Como acessar
          </h2>
          <ol
            className="space-y-3"
            style={{ color: 'var(--delivery-text-secondary, #525252)' }}
          >
            <li>1. Peça ao restaurante o link do cardápio online</li>
            <li>2. O endereço tem o formato: /cardapio/nome-da-loja</li>
            <li>3. Escolha os itens, monte seu pedido e confirme</li>
          </ol>
        </div>

        <p className="text-sm" style={{ color: 'var(--delivery-text-muted, #737373)' }}>
          Link inválido ou loja não encontrada? Verifique com o estabelecimento.
        </p>
      </div>
    </div>
  )
}
