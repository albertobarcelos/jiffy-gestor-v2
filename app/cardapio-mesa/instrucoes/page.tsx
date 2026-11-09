'use client'

export default function CardapioMesaInstrucoesPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center shadow-xl"
        style={{ backgroundColor: 'var(--cardapio-bg-secondary, #1E1E1E)' }}
      >
        <h1
          className="mb-2 text-2xl font-bold"
          style={{ color: 'var(--cardapio-text-primary, #fff)' }}
        >
          Cardápio da mesa
        </h1>
        <p style={{ color: 'var(--cardapio-text-secondary, #aaa)' }}>
          Escaneie o QR Code da sua mesa para acessar o cardápio. Em desenvolvimento, use{' '}
          <span className="font-mono text-sm">/cardapio-mesa/qr/teste</span>.
        </p>
      </div>
    </div>
  )
}
