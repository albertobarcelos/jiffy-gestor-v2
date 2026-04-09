export default function NotaFiscalNotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}
    >
      <div className="max-w-md w-full rounded-xl bg-white shadow-lg p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800 mb-2">Cupom não encontrado</h1>
        <p className="text-sm text-slate-600">
          Verifique o link ou se o identificador da venda está correto.
        </p>
      </div>
    </div>
  )
}
