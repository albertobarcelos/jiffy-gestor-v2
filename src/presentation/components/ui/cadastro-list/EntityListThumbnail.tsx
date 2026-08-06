'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MdClose, MdImageNotSupported, MdVisibility } from 'react-icons/md'

type EntityListThumbnailProps = {
  src?: string | null
  alt: string
  /** Quando false, só o placeholder (sem lightbox). Default true. */
  expandable?: boolean
}

/**
 * Miniatura padronizada das listas de cadastro (produtos / complementos / grupos).
 * Sem URL → placeholder; com URL → preview + lightbox opcional.
 */
export function EntityListThumbnail({
  src = null,
  alt,
  expandable = true,
}: EntityListThumbnailProps) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [expanded])

  if (!src) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text md:h-12 md:w-12"
        aria-hidden
        title="Sem imagem"
      >
        <MdImageNotSupported className="h-6 w-6 md:h-7 md:w-7" />
      </div>
    )
  }

  const thumb = (
    <span className="group relative block h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:h-12 md:w-12">
      {/* eslint-disable-next-line @next/next/no-img-element -- preview local / URL remota do cadastro */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      {expandable ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          <MdVisibility className="text-white drop-shadow" size={22} />
        </span>
      ) : null}
    </span>
  )

  const lightbox =
    expanded && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagem de ${alt}`}
            onClick={() => setExpanded(false)}
          >
            <button
              type="button"
              aria-label="Fechar imagem"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-primary-text shadow hover:bg-white"
              onClick={e => {
                e.stopPropagation()
                setExpanded(false)
              }}
            >
              <MdClose size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-[min(920px,92vw)] rounded-lg object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>,
          document.body
        )
      : null

  if (!expandable) {
    return thumb
  }

  return (
    <>
      <button
        type="button"
        title="Ver imagem"
        aria-label={`Ver imagem de ${alt}`}
        onClick={e => {
          e.stopPropagation()
          setExpanded(true)
        }}
        className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/80 rounded-lg"
      >
        {thumb}
      </button>
      {lightbox}
    </>
  )
}
