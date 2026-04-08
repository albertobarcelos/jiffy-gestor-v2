import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import {
  deveExibirRodapeDanfe80mm,
  fetchVendaContingenciaPublica,
  resolveDocumentoFiscalIdPublico,
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

  const documentoFiscalId = resolveDocumentoFiscalIdPublico(data)
  const rodapeDanfeSrc =
    deveExibirRodapeDanfe80mm(data) && documentoFiscalId
      ? `/api/public/notas-fiscais-consumidor/${encodeURIComponent(documentoFiscalId)}/danfe-80`
      : null

  return (
    <div
      className="min-h-screen flex justify-center py-8 px-4 sm:px-5"
      style={{ background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}
    >
      <article
        className="w-full max-w-lg rounded-xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/60 overflow-hidden"
        style={{
          fontFamily: "'Roboto Mono', 'Courier New', monospace",
          color: '#0f172a',
        }}
      >
        <header className="px-5 sm:px-6 pt-5 pb-2 border-b border-slate-200">
          <p className="text-xs text-center text-slate-500">Jiffy Gestor</p>
        </header>
        <div className="px-5 sm:px-6 py-5">
          <CupomFiscalContingencia data={data} rodapeDanfeSrc={rodapeDanfeSrc} />
        </div>
      </article>
    </div>
  )
}
