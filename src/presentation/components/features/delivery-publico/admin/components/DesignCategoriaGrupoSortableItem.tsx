'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'
import { DeliveryGrupoCategoriaVisual } from '../../shared/components/DeliveryGrupoCategoriaVisual'

type DesignCategoriaGrupoSortableItemProps = {
  grupo: DesignCategoriaGrupo
  config: DeliveryPublicoDesignConfig
  isSelected: boolean
  disabled?: boolean
  onSelect: (grupoId: string) => void
}

export function DesignCategoriaGrupoSortableItem({
  grupo,
  config,
  isSelected,
  disabled = false,
  onSelect,
}: DesignCategoriaGrupoSortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: grupo.id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={cn(
          'flex w-full items-center gap-1 rounded-lg border-2 transition-colors',
          isSelected
            ? 'border-secondary bg-secondary/5 text-primary-text'
            : 'border-gray-200 text-primary-text hover:border-gray-300'
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="flex shrink-0 cursor-grab touch-manipulation items-center px-2 py-2 text-secondary-text active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          title="Arraste para reordenar"
          style={{ touchAction: 'none' }}
          aria-label={`Reordenar ${grupo.nome}`}
        >
          <span className="text-base leading-none">☰</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect(grupo.id)}
          className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pr-3 text-left text-sm font-semibold"
        >
          <DeliveryGrupoCategoriaVisual config={config} grupo={grupo} size="sm" />
          <span className="truncate">{grupo.nome}</span>
        </button>
      </div>
    </li>
  )
}
