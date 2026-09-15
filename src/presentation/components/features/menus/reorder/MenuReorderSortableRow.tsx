'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MdDragIndicator } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'

type MenuReorderSortableRowProps = {
  id: string
  label: string
  isSelected: boolean
  disabled?: boolean
  onSelect: (id: string) => void
}

export function MenuReorderSortableRow({
  id,
  label,
  isSelected,
  disabled = false,
  onSelect,
}: MenuReorderSortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'z-10')}>
      <div
        className={cn(
          'flex w-full items-center gap-1 rounded-lg border-2 transition-colors',
          isSelected
            ? 'border-secondary bg-gray-100 text-primary-text'
            : 'border-gray-200 text-primary-text hover:border-gray-300',
          isDragging && 'border-primary text-primary'
        )}
      >
        {!disabled ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex shrink-0 cursor-grab touch-manipulation items-center px-2 py-2 text-secondary-text active:cursor-grabbing"
            title="Arraste para reordenar"
            style={{ touchAction: 'none' }}
            aria-label={`Reordenar ${label}`}
          >
            <MdDragIndicator size={18} />
          </button>
        ) : (
          <span className="w-8 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onSelect(id)}
          className="min-w-0 flex-1 truncate py-2 pr-3 text-left text-sm"
          title={label}
        >
          {label}
        </button>
      </div>
    </li>
  )
}
