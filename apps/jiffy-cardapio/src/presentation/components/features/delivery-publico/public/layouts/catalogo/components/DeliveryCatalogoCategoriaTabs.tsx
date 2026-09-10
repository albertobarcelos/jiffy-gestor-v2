'use client'

import { Menu } from 'lucide-react'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryCatalogoCategoriaTabsProps = {
  grupos: DeliveryPublicoGrupoViewModel[]
  activeGrupoId: string | null
  interactive?: boolean
  onGrupoClick?: (grupoId: string) => void
  onMenuClick?: () => void
}

export function DeliveryCatalogoCategoriaTabs({
  grupos,
  activeGrupoId,
  interactive = false,
  onGrupoClick,
  onMenuClick,
}: DeliveryCatalogoCategoriaTabsProps) {
  if (grupos.length === 0) return null

  return (
    <div
      className="sticky top-0 z-20 mt-3 border-b"
      style={{
        borderColor: 'var(--delivery-card-border)',
        backgroundColor: 'var(--delivery-bg, var(--delivery-surface))',
      }}
    >
      <div className="flex items-center gap-1 px-2 @sm:px-3">
        <button
          type="button"
          aria-label="Menu de categorias"
          disabled={!interactive}
          onClick={() => interactive && onMenuClick?.()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:cursor-default"
          style={{ color: 'var(--delivery-primary)' }}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
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
      </div>
    </div>
  )
}
