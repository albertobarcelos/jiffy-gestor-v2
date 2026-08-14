'use client'

import type { ReactNode } from 'react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { CupomPublicoAcoes } from './CupomPublicoAcoes'
import {
  CupomFiscalImagemContext,
  useCarregarImagemDanfe80,
} from './cupomFiscalImagem'

type CupomPublicoComAcoesProps = {
  children: ReactNode
  /**
   * URL pública da página. Pode ser absoluta ou path relativo
   * (`/notas-fiscais/...`); no clique do WhatsApp vira absoluta.
   */
  pageUrl: string
  /** Proxy PNG 80mm; se preenchido, a página espera a imagem antes de exibir o cupom. */
  rodapeDanfeSrc?: string | null
}

/**
 * Toolbar (imprimir + WhatsApp) + cupom.
 * Com NFC-e emitida, cobre a página com loading até o QR/DANFE carregar.
 */
export function CupomPublicoComAcoes({
  children,
  pageUrl,
  rodapeDanfeSrc,
}: CupomPublicoComAcoesProps) {
  const { status, displayUrl } = useCarregarImagemDanfe80(rodapeDanfeSrc)

  if (rodapeDanfeSrc && status === 'loading') {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 print:hidden">
        <JiffyLoading text="Carregando cupom fiscal…" />
      </div>
    )
  }

  if (rodapeDanfeSrc && status === 'error') {
    return (
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-200 px-6 text-center print:hidden">
        <p className="text-sm font-medium text-slate-800">
          Não foi possível carregar o cupom fiscal.
        </p>
        <p className="text-sm text-slate-600">Atualize a página para tentar novamente.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Atualizar página
        </button>
      </div>
    )
  }

  return (
    <CupomFiscalImagemContext.Provider value={displayUrl}>
      <div className="flex w-full max-w-lg flex-col items-stretch gap-4 print:mx-auto">
        <style>{`
          @media print {
            @page { margin: 8mm; }
            html, body {
              background: #fff !important;
              display: flex !important;
              justify-content: center !important;
            }
          }
        `}</style>
        <div className="print:hidden">
          <CupomPublicoAcoes pageUrl={pageUrl} />
        </div>
        <div className="w-full print:shadow-none">{children}</div>
      </div>
    </CupomFiscalImagemContext.Provider>
  )
}
