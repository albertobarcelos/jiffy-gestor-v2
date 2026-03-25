'use client'

import { useEffect, useRef, useState } from 'react'

interface CupomRodapeDanfe80Props {
  src: string | null | undefined
  alt?: string
}

async function blobPareceImagemValida(blob: Blob): Promise<boolean> {
  if (blob.type.startsWith('image/')) return true
  if (blob.size < 8) return false
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  const png =
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  if (png) return true
  return head[0] === 0xff && head[1] === 0xd8
}

/**
 * Rodapé com PNG 80mm (QR + dados fiscais). Carrega via fetch+blob para não exibir
 * ícone quebrado quando o proxy devolve JSON de erro.
 */
export function CupomRodapeDanfe80({ src, alt = 'Dados fiscais e QR Code da NFC-e' }: CupomRodapeDanfe80Props) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!src) {
      setDisplayUrl(null)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(src, { cache: 'no-store' })
        if (cancelled || !res.ok) {
          if (!cancelled) setDisplayUrl(null)
          return
        }
        const blob = await res.blob()
        if (cancelled) return
        const ok = await blobPareceImagemValida(blob)
        if (!ok) {
          setDisplayUrl(null)
          return
        }
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
        const objectUrl = URL.createObjectURL(blob)
        blobUrlRef.current = objectUrl
        if (!cancelled) setDisplayUrl(objectUrl)
      } catch {
        if (!cancelled) setDisplayUrl(null)
      }
    })()

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [src])

  if (!src || !displayUrl) {
    return null
  }

  return (
    <div className="mt-4 pt-3 border-t border-black/30 flex flex-col items-center">
      <p className="text-[10px] text-center text-black/70 mb-2 uppercase tracking-wide">
        Consulta NFC-e
      </p>
      <img
        src={displayUrl}
        alt={alt}
        className="w-full max-w-[302px] h-auto object-contain"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
