'use client'

import { MdPrint, MdWhatsapp } from 'react-icons/md'

type CupomPublicoAcoesProps = {
  pageUrl: string
}

function resolveAbsolutePageUrl(pageUrl: string): string {
  if (typeof window === 'undefined') return pageUrl
  try {
    return new URL(pageUrl, window.location.origin).href
  } catch {
    return window.location.href
  }
}

function montarUrlWhatsApp(pageUrl: string): string {
  const text = `Olá! Segue o cupom fiscal:\n${pageUrl}`
  return `https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`
}

export function CupomPublicoAcoes({ pageUrl }: CupomPublicoAcoesProps) {
  const handleWhatsApp = () => {
    const url = resolveAbsolutePageUrl(pageUrl)
    window.open(montarUrlWhatsApp(url), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:flex-none sm:min-w-[11.5rem]"
      >
        <MdPrint className="h-5 w-5 shrink-0" aria-hidden />
        Imprimir
      </button>
      <button
        type="button"
        onClick={handleWhatsApp}
        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57] sm:flex-none sm:min-w-[11.5rem]"
      >
        <MdWhatsapp className="h-5 w-5 shrink-0" aria-hidden />
        Enviar via WhatsApp
      </button>
    </div>
  )
}
