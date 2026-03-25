import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import {
  deveExibirRodapeDanfe80mm,
  fetchVendaContingenciaPublica,
} from '@/src/infrastructure/api/fetchVendaContingenciaPublica'
import { CupomFiscalContingencia } from '@/src/presentation/components/features/venda-contingencia/CupomFiscalContingencia'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nota fiscal consumidor | Jiffy',
  description: 'Consulta pública do cupom fiscal (NFC-e / contingência).',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ vendaId: string }>
}

export default async function NotaFiscalPublicPage({ params }: PageProps) {
  const { vendaId } = await params

  let data
  try {
    data = await fetchVendaContingenciaPublica(vendaId)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      notFound()
    }
    const message = e instanceof ApiError ? e.message : 'Não foi possível carregar o cupom.'
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}
      >
        <div className="max-w-md w-full rounded-xl bg-white shadow-lg p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Cupom indisponível</h1>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    )
  }

  const vazio =
    !data ||
    (Object.keys(data).length === 0 &&
      !data.cupomFiscal &&
      !data.textoCupom &&
      !data.cupomContingencia)

  if (vazio) {
    notFound()
  }

  const rodapeDanfeSrc = deveExibirRodapeDanfe80mm(data)
    ? `/api/public/notas-fiscais-consumidor/${encodeURIComponent(vendaId.trim())}/danfe-80`
    : null

  return (
    <div
      className="min-h-screen flex justify-center py-8 px-3"
      style={{ background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}
    >
      <article
        className="w-full max-w-md rounded-xl shadow-lg overflow-hidden"
        style={{
          backgroundColor: '#FFFFD9',
          fontFamily: "'Roboto Mono', 'Courier New', monospace",
          color: '#000000',
        }}
      >
        <header className="px-4 pt-5 pb-2 border-b border-black/10">
          <p className="text-xs text-center text-black/60">Jiffy Gestor</p>
        </header>
        <div className="px-4 py-4">
          <CupomFiscalContingencia data={data} rodapeDanfeSrc={rodapeDanfeSrc} />
        </div>
      </article>
    </div>
  )
}
