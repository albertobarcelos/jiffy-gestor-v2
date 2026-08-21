'use client'

import { useCupomFiscalImagemUrl } from './cupomFiscalImagem'

interface CupomRodapeDanfe80Props {
  src: string | null | undefined
  alt?: string
}

/**
 * Rodapé com PNG 80mm (QR + dados fiscais).
 * Usa a URL já pré-carregada na página (cache do navegador).
 */
export function CupomRodapeDanfe80({ src, alt = 'Dados fiscais e QR Code da NFC-e' }: CupomRodapeDanfe80Props) {
  const precarregada = useCupomFiscalImagemUrl()
  const url = precarregada ?? src ?? null

  if (!url) return null

  return (
    <div className="mt-4 flex flex-col items-center border-t border-slate-300/80 pt-3">
      <img
        src={url}
        alt={alt}
        className="h-auto w-full max-w-[min(100%,360px)] object-contain"
        decoding="async"
      />
    </div>
  )
}
