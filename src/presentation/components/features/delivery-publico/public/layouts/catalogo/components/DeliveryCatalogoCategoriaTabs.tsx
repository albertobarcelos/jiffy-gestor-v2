'use client'

import { useEffect, useRef } from 'react'
import { Menu } from 'lucide-react'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryCatalogoCategoriaTabsProps = {
  grupos: DeliveryPublicoGrupoViewModel[]
  activeGrupoId: string | null
  interactive?: boolean
  onGrupoClick?: (grupoId: string) => void
  /** Se omitido, o botão de menu não é renderizado (ex.: Grade já tem menu na toolbar). */
  onMenuClick?: () => void
  /**
   * Quando true, remove sticky/borda próprios — a barra fica dentro de um
   * container fixed (ex.: Grade sticky toolbar).
   */
  embedded?: boolean
}

export function DeliveryCatalogoCategoriaTabs({
  grupos,
  activeGrupoId,
  interactive = false,
  onGrupoClick,
  onMenuClick,
  embedded = false,
}: DeliveryCatalogoCategoriaTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLElement | null>(null)

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
    <div
      className={
        embedded
          ? 'mt-1'
          : 'sticky top-0 z-20 mt-3 border-b'
      }
      style={
        embedded
          ? undefined
          : {
              borderColor: 'var(--delivery-card-border)',
              backgroundColor: 'var(--delivery-bg, var(--delivery-surface))',
            }
      }
    >
      <div className="flex max-w-full min-w-0 items-center gap-1 px-2 @sm:px-3">
        {onMenuClick ? (
          <button
            type="button"
            aria-label="Menu de categorias"
            disabled={!interactive}
            onClick={() => interactive && onMenuClick()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:cursor-default"
            style={{ color: 'var(--delivery-primary)' }}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        ) : null}

        <div
          ref={scrollRef}
          className="max-w-full min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex w-max">
            {grupos.map(grupo => {
              const active = grupo.id === activeGrupoId
              const className = `shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors @sm:px-4 ${
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
                    ref={active ? el => { activeTabRef.current = el } : undefined}
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
                  ref={active ? el => { activeTabRef.current = el } : undefined}
                  className={className}
                  style={style}
                >
                  {grupo.nome}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
