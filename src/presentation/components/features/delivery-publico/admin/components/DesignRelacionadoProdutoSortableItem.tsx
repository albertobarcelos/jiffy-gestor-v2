'use client'

import { Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/src/shared/utils/cn'

type DesignRelacionadoProdutoSortableItemProps = {
  id: string
  nome: string
  codigo?: number
  ordem: number
  disabled?: boolean
  onRemove: (produtoId: string) => void
}

/** Item sortable da lista "Ordem no carrossel" na aba Relacionados. */
export function DesignRelacionadoProdutoSortableItem({
  id,
  nome,
  codigo,
  ordem,
  disabled = false,
  onRemove,
}: DesignRelacionadoProdutoSortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'mb-1 flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50',
        isDragging && 'z-10 shadow-md'
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
        aria-label={`Reordenar ${nome}`}
      >
        <span className="text-base leading-none">☰</span>
      </button>

      <span className="w-5 shrink-0 text-center text-xs font-semibold text-black">
        {ordem}
      </span>

      <div className="min-w-0 flex-1 py-2 pr-1">
        <p className="truncate text-sm text-primary-text">{nome}</p>
        {codigo != null ? (
          <p className="text-[11px] text-secondary-text">COD. {codigo}</p>
        ) : null}
      </div>

      <button
        type="button"
        className="flex shrink-0 items-center justify-center px-2.5 py-2 text-red-600 hover:text-red-700"
        onClick={() => onRemove(id)}
        title={`Remover ${nome}`}
        aria-label={`Remover ${nome}`}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
    </li>
  )
}
