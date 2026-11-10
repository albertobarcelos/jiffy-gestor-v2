'use client'

import { Search } from 'lucide-react'
import { DeliveryGrupoChips } from '../../../../shared/components/DeliveryGrupoChips'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryGradeToolbarProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  termoBusca: string
  activeGrupoId?: string | null
  interactive?: boolean
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
}

export function DeliveryGradeToolbar({
  config,
  grupos,
  termoBusca,
  activeGrupoId = null,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
}: DeliveryGradeToolbarProps) {
  return (
    <div className="min-w-0 space-y-1.5 pb-2 pt-2">
      <div className="px-4">
        <label className="relative block w-full">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--delivery-text-muted)' }}
            aria-hidden
          />
          <input
            type="search"
            value={termoBusca}
            readOnly={!interactive}
            onChange={e => interactive && onBuscaChange?.(e.target.value)}
            placeholder="Pesquisar por produtos"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--delivery-primary)_35%,transparent)]"
            style={{
              borderColor: 'var(--delivery-card-border)',
              color: 'var(--delivery-text)',
              fontFamily: 'var(--delivery-font-body)',
              backgroundColor: 'var(--delivery-surface)',
            }}
          />
        </label>
      </div>

      <DeliveryGrupoChips
        config={config}
        grupos={grupos}
        activeGrupoId={activeGrupoId}
        interactive={interactive}
        embedded
        onGrupoClick={onGrupoClick}
      />
    </div>
  )
}
