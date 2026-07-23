'use client'

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'

const CHIP_GAP_PX = 8
const SIDE_PADDING_PX = 16

type DeliveryGrupoChipsProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  activeGrupoId?: string | null
  interactive?: boolean
  embedded?: boolean
  onGrupoClick?: (grupoId: string) => void
}

export function DeliveryGrupoChips({
  config,
  grupos,
  activeGrupoId = null,
  interactive = false,
  embedded = false,
  onGrupoClick,
}: DeliveryGrupoChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeChipRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startScrollLeft: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    if (!activeGrupoId) return
    activeChipRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [activeGrupoId])

  if (!config.categorias.mostrar || grupos.length === 0) return null

  const marginClass = embedded ? '' : 'mt-3'

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
    <div className={`w-full max-w-full min-w-0 ${marginClass}`.trim()}>
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
            paddingLeft: SIDE_PADDING_PX,
            paddingRight: SIDE_PADDING_PX,
          }}
        >
          {grupos.map(grupo => {
            const active = grupo.id === activeGrupoId
            const className =
              'shrink-0 rounded-lg border-2 px-3 py-1.5 text-center text-xs font-medium leading-tight transition-[border-color,color] duration-150 @sm:px-3.5 @sm:text-sm @lg:text-base'
            const style = {
              color: active ? 'var(--delivery-primary-dark)' : 'var(--delivery-text)',
              fontFamily: 'var(--delivery-font-body)',
              borderColor: active
                ? 'var(--delivery-primary-dark)'
                : 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface)',
            } as const

            if (interactive && onGrupoClick) {
              return (
                <button
                  key={grupo.id}
                  ref={active ? el => { activeChipRef.current = el } : undefined}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleGrupoActivate(grupo.id)}
                  className={className}
                  style={style}
                >
                  {grupo.nome}
                </button>
              )
            }

            return (
              <div
                key={grupo.id}
                ref={active ? el => { activeChipRef.current = el } : undefined}
                className={className}
                style={style}
              >
                {grupo.nome}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
