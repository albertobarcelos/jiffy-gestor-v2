'use client'

import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { cn } from '@/src/shared/utils/cn'

type MenuReorderSortableColumnProps = {
  title: string
  itemIds: string[]
  isLoading?: boolean
  emptyLabel?: string
  readOnly?: boolean
  readOnlyHint?: string
  onDragEnd?: (event: DragEndEvent) => void
  children: ReactNode
}

export function MenuReorderSortableColumn({
  title,
  itemIds,
  isLoading = false,
  emptyLabel = 'Nenhum item',
  readOnly = false,
  readOnlyHint,
  onDragEnd,
  children,
}: MenuReorderSortableColumnProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const list = (
    <ul className="min-h-[120px] space-y-1">
      {isLoading ? (
        <li className="flex justify-center py-8">
          <JiffyLoading />
        </li>
      ) : itemIds.length === 0 ? (
        <li className="px-2 py-6 text-center text-sm text-secondary-text">{emptyLabel}</li>
      ) : (
        children
      )}
    </ul>
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-gray-200 last:border-r-0">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-primary-text">{title}</h3>
        {readOnly && readOnlyHint ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-secondary-text">
            {readOnlyHint}
          </span>
        ) : null}
      </div>
      <div className={cn('min-h-0 flex-1 overflow-y-auto p-2', readOnly && 'opacity-90')}>
        {readOnly || !onDragEnd ? (
          list
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {list}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
