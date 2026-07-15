'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { DeliveryGrupoCategoriaVisual } from './DeliveryGrupoCategoriaVisual'

const MOBILE_COLUMNS_MAX = 5
const CHIP_GAP_PX = 8
const HORIZONTAL_PADDING_PX = 32

type DeliveryGrupoChipsProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  interactive?: boolean
  embedded?: boolean
  onGrupoClick?: (grupoId: string) => void
}

function computeChipWidthPx(railWidth: number, grupoCount: number): number {
  const columnsVisible = Math.min(Math.max(grupoCount, 1), MOBILE_COLUMNS_MAX)
  const gaps = (columnsVisible - 1) * CHIP_GAP_PX
  const usable = Math.max(railWidth - HORIZONTAL_PADDING_PX - gaps, columnsVisible * 48)
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

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const update = () => {
      const next = Math.round(computeChipWidthPx(rail.clientWidth, grupos.length) * 100) / 100
      setChipWidthPx(prev => (Math.abs(prev - next) < 0.5 ? prev : next))
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
            paddingLeft: HORIZONTAL_PADDING_PX / 2,
            paddingRight: HORIZONTAL_PADDING_PX / 2,
          }}
        >
          {grupos.map(grupo => {
            const content = (
              <>
                <DeliveryGrupoCategoriaVisual config={config} grupo={grupo} size="lg" />
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
