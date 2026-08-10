'use client'

import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineCategoriaTabsProps = {
  grupos: DeliveryPublicoGrupoViewModel[]
  activeGrupoId: string | null
  interactive?: boolean
  onGrupoClick?: (grupoId: string) => void
  onSearchToggle?: () => void
}

export function DeliveryVitrineCategoriaTabs({
  grupos,
  activeGrupoId,
  interactive = false,
  onGrupoClick,
  onSearchToggle,
}: DeliveryVitrineCategoriaTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement | HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!activeGrupoId) return
    const scroller = scrollRef.current
    const tab = activeTabRef.current
    if (!scroller || !tab) return

    const scrollerRect = scroller.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    const tabOffset = tabRect.left - scrollerRect.left + scroller.scrollLeft
    const target = tabOffset - (scroller.clientWidth - tabRect.width) / 2
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    const nextLeft = Math.max(0, Math.min(target, maxScroll))

    if (Math.abs(scroller.scrollLeft - nextLeft) < 1) return
    scroller.scrollTo({ left: nextLeft, behavior: 'auto' })
  }, [activeGrupoId])

  if (grupos.length === 0) return null

  return (
    <div className="flex items-end gap-2 px-2 @sm:px-3">
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 overflow-x-auto scrollbar-hide"
      >
        <div className="flex w-max min-w-full">
          {grupos.map(grupo => {
            const active = grupo.id === activeGrupoId
            // pb menor: underline fica perto do nome (não “flutuando” no fundo da barra).
            const className = `shrink-0 border-b-2 px-3 pt-2.5 pb-1 text-sm font-semibold transition-colors @sm:px-4 @sm:pt-3 @sm:pb-1.5 ${
              active ? 'border-[var(--delivery-primary)]' : 'border-transparent'
            }`

            const style = {
              color: active ? 'var(--delivery-primary)' : 'var(--delivery-text-secondary)',
              fontFamily: 'var(--delivery-font-body)',
            } as const

            if (interactive && onGrupoClick) {
              return (
                <button
                  key={grupo.id}
                  type="button"
                  ref={active ? activeTabRef : undefined}
                  onClick={() => onGrupoClick(grupo.id)}
                  className={className}
                  style={style}
                >
                  {grupo.nome}
                </button>
              )
            }

            return (
              <span
                key={grupo.id}
                ref={active ? activeTabRef : undefined}
                className={className}
                style={style}
              >
                {grupo.nome}
              </span>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Pesquisar produtos"
        disabled={!interactive}
        onClick={() => interactive && onSearchToggle?.()}
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--delivery-primary)] disabled:cursor-default"
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}
