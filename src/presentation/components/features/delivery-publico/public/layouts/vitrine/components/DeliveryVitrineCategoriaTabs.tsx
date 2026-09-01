'use client'

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
  if (grupos.length === 0) return null

  return (
    <div
      className="sticky top-0 z-20 border-b bg-white"
      style={{ borderColor: 'var(--delivery-card-border)' }}
    >
      <div className="flex items-center gap-2 px-2 @sm:px-3">
        <div className="flex min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex w-max min-w-full">
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
                    onClick={() => onGrupoClick(grupo.id)}
                    className={className}
                    style={style}
                  >
                    {grupo.nome}
                  </button>
                )
              }

              return (
                <span key={grupo.id} className={className} style={style}>
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--delivery-primary)] disabled:cursor-default"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
