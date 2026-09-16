'use client'

import { Camera } from 'lucide-react'

export function DeliveryProdutoComplementoThumb({
  imagemUrl,
  nome,
}: {
  imagemUrl: string | null
  nome: string
}) {
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera
            className="h-4 w-4"
            style={{ color: 'var(--delivery-text-muted)' }}
            aria-hidden
          />
        </div>
      )}
      <span className="sr-only">{nome}</span>
    </div>
  )
}
