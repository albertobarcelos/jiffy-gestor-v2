'use client'

import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryCatalogoCategoriaTabsProps = {
  grupos: DeliveryPublicoGrupoViewModel[]
  activeGrupoId: string | null
  interactive?: boolean
  onGrupoClick?: (grupoId: string) => void
}

export function DeliveryCatalogoCategoriaTabs({
  grupos,
  activeGrupoId,
  interactive = false,
  onGrupoClick,
}: DeliveryCatalogoCategoriaTabsProps) {
  if (grupos.length === 0) return null

  return (
    <div
      className="z-20 border-b"
      style={{
        borderColor: 'var(--delivery-card-border)',
        backgroundColor: 'var(--delivery-bg, var(--delivery-surface))',
      }}
    >
      <div className="min-w-0 overflow-x-auto px-2 scrollbar-hide @sm:px-3">
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
  )
}
