'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { DeliveryGrupoCategoriaVisual } from './DeliveryGrupoCategoriaVisual'

const MOBILE_COLUMNS_MAX = 5
/** Largura mínima alinhada a `md` / container `@3xl` (~768px) para encaixar 8 itens. */
const DESKTOP_COLUMNS_MIN_WIDTH_PX = 768
const DESKTOP_COLUMNS_MAX = 8
const CHIP_GAP_PX = 8
const HORIZONTAL_PADDING_PX = 32
/** Teto da imagem no mobile (~tamanho ideal em ~375px), para não encostar/sobrepor. */
const MOBILE_IMAGE_MAX_PX = 67
/** Folga dentro do chip para a borda não encostar no vizinho. */
const CHIP_IMAGE_INSET_PX = 4
/** Teto da imagem no desktop (~5.25rem). */
const DESKTOP_IMAGE_MAX_PX = 84

type DeliveryGrupoChipsProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  interactive?: boolean
  embedded?: boolean
  onGrupoClick?: (grupoId: string) => void
}

function resolveColumnsMax(railWidth: number): number {
  return railWidth >= DESKTOP_COLUMNS_MIN_WIDTH_PX ? DESKTOP_COLUMNS_MAX : MOBILE_COLUMNS_MAX
}

function resolveHorizontalPaddingPx(railWidth: number): number {
  // Mobile: padding lateral menor para caber imagem ~20% maior mantendo 5 colunas.
  return resolveColumnsMax(railWidth) === DESKTOP_COLUMNS_MAX ? HORIZONTAL_PADDING_PX : 16
}

function computeChipWidthPx(railWidth: number, grupoCount: number): number {
  const columnsMax = resolveColumnsMax(railWidth)
  const columnsVisible = Math.min(Math.max(grupoCount, 1), columnsMax)
  const gaps = (columnsVisible - 1) * CHIP_GAP_PX
  const horizontalPadding = resolveHorizontalPaddingPx(railWidth)
  const minChip = columnsMax === DESKTOP_COLUMNS_MAX ? 72 : 56
  const usable = Math.max(railWidth - horizontalPadding - gaps, columnsVisible * minChip)
  return usable / columnsVisible
}

export function DeliveryGrupoChips({
  config,
  grupos,
  interactive = false,
  embedded = false,
  onGrupoClick,
}: DeliveryGrupoChipsProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startScrollLeft: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const [chipWidthPx, setChipWidthPx] = useState(0)
  const [sidePaddingPx, setSidePaddingPx] = useState(HORIZONTAL_PADDING_PX / 2)
  const [imageDiameterPx, setImageDiameterPx] = useState(MOBILE_IMAGE_MAX_PX)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const update = () => {
      const width = rail.clientWidth
      const nextChip = Math.round(computeChipWidthPx(width, grupos.length) * 100) / 100
      const nextSidePadding = resolveHorizontalPaddingPx(width) / 2
      const isDesktop = resolveColumnsMax(width) === DESKTOP_COLUMNS_MAX
      const maxImage = isDesktop ? DESKTOP_IMAGE_MAX_PX : MOBILE_IMAGE_MAX_PX
      const nextDiameter = Math.round(
        Math.min(maxImage, Math.max(36, nextChip - CHIP_IMAGE_INSET_PX))
      )

      setChipWidthPx(prev => (Math.abs(prev - nextChip) < 0.5 ? prev : nextChip))
      setSidePaddingPx(prev => (prev === nextSidePadding ? prev : nextSidePadding))
      setImageDiameterPx(prev => (prev === nextDiameter ? prev : nextDiameter))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [grupos.length])

  if (!config.categorias.mostrar || grupos.length === 0) return null

  const marginClass = embedded ? '' : 'mt-3'
  const chipStyle = {
    flex: `0 0 ${chipWidthPx || 72}px`,
    width: `${chipWidthPx || 72}px`,
    minWidth: `${chipWidthPx || 72}px`,
  } as const

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return
    const scroller = scrollRef.current
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 1) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
    }
    scroller.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const scroller = scrollRef.current
    if (!drag || !scroller || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    if (Math.abs(delta) > 4) {
      drag.moved = true
      suppressClickRef.current = true
    }
    scroller.scrollLeft = drag.startScrollLeft - delta
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const scroller = scrollRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  const handleGrupoActivate = (grupoId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onGrupoClick?.(grupoId)
  }

  return (
    <div ref={railRef} className={`w-full max-w-full min-w-0 ${marginClass}`.trim()}>
      <div
        ref={scrollRef}
        className="w-full max-w-full min-w-0 cursor-grab touch-pan-x overflow-x-auto overflow-y-hidden active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex"
          style={{
            width: 'max-content',
            gap: `${CHIP_GAP_PX}px`,
            paddingLeft: sidePaddingPx,
            paddingRight: sidePaddingPx,
          }}
        >
          {grupos.map(grupo => {
            const content = (
              <>
                <DeliveryGrupoCategoriaVisual
                  config={config}
                  grupo={grupo}
                  size="lg"
                  diameterPx={imageDiameterPx}
                />
                <span
                  className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight @sm:text-xs @lg:text-sm @xl:text-base"
                  style={{
                    color: 'var(--delivery-text)',
                    fontFamily: 'var(--delivery-font-body)',
                  }}
                >
                  {grupo.nome}
                </span>
              </>
            )

            if (interactive && onGrupoClick) {
              return (
                <button
                  key={grupo.id}
                  type="button"
                  onClick={() => handleGrupoActivate(grupo.id)}
                  className="flex flex-col items-center gap-1.5 @lg:gap-2"
                  style={chipStyle}
                >
                  {content}
                </button>
              )
            }

            return (
              <div
                key={grupo.id}
                className="flex flex-col items-center gap-1.5 @lg:gap-2"
                style={chipStyle}
              >
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
