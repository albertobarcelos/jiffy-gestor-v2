'use client'

import { useCallback, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MdDragIndicator } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'

export type ArrasteControle = Pick<
  ReturnType<typeof useSortable>,
  'attributes' | 'listeners' | 'isDragging'
>

type ListaArrastavelProps = {
  ids: string[]
  onDragEnd: (event: DragEndEvent) => void
  className?: string
  as?: 'ul' | 'div'
  /** Caixa visível da lista. O arraste não passa dessa área e não rola o modal. */
  limiteRef: RefObject<HTMLElement | null>
  children: ReactNode
}

function restringirAoLimite(limiteRef: RefObject<HTMLElement | null>): Modifier {
  return ({ transform, draggingNodeRect }) => {
    const next = { ...transform, x: 0 }
    const limite = limiteRef.current
    if (!draggingNodeRect || !limite) return next
    const box = limite.getBoundingClientRect()
    const topo = draggingNodeRect.top + next.y
    const base = draggingNodeRect.bottom + next.y
    if (draggingNodeRect.height >= box.height) {
      if (topo < box.top) next.y = box.top - draggingNodeRect.top
      return next
    }
    if (topo < box.top) next.y = box.top - draggingNodeRect.top
    else if (base > box.bottom) next.y = box.bottom - draggingNodeRect.bottom
    return next
  }
}

export function ListaArrastavel({
  ids,
  onDragEnd,
  className,
  as = 'ul',
  limiteRef,
  children,
}: ListaArrastavelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const modifiers = useMemo(() => [restringirAoLimite(limiteRef)], [limiteRef])
  const rolagemMaxRef = useRef(0)
  const Tag = as

  const limitarRolagem = useCallback(() => {
    const el = limiteRef.current
    if (!el) return
    if (el.scrollTop > rolagemMaxRef.current) {
      el.scrollTop = rolagemMaxRef.current
    }
    if (el.scrollLeft !== 0) {
      el.scrollLeft = 0
    }
  }, [limiteRef])

  const iniciarLimiteRolagem = useCallback(() => {
    const el = limiteRef.current
    if (!el) return
    rolagemMaxRef.current = Math.max(0, el.scrollHeight - el.clientHeight)
    limitarRolagem()
    el.removeEventListener('scroll', limitarRolagem)
    el.addEventListener('scroll', limitarRolagem)
  }, [limiteRef, limitarRolagem])

  const encerrarLimiteRolagem = useCallback(() => {
    limiteRef.current?.removeEventListener('scroll', limitarRolagem)
  }, [limiteRef, limitarRolagem])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      autoScroll={{
        threshold: { x: 0, y: 0.2 },
        layoutShiftCompensation: false,
        canScroll: element => element === limiteRef.current,
      }}
      onDragStart={iniciarLimiteRolagem}
      onDragMove={limitarRolagem}
      onDragCancel={encerrarLimiteRolagem}
      onDragEnd={event => {
        encerrarLimiteRolagem()
        onDragEnd(event)
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Tag className={className}>{children}</Tag>
      </SortableContext>
    </DndContext>
  )
}

type LinhaArrastavelProps = {
  id: string
  disabled?: boolean
  className?: string
  as?: 'li' | 'div'
  children: (arraste: ArrasteControle) => ReactNode
}

export function LinhaArrastavel({
  id,
  disabled = false,
  className,
  as = 'div',
  children,
}: LinhaArrastavelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const Tag = as

  return (
    <Tag
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging && 'relative z-10 bg-white shadow-sm')}
    >
      {children({ attributes, listeners, isDragging })}
    </Tag>
  )
}

export function AlcaArraste({
  label,
  attributes,
  listeners,
  disabled = false,
}: Pick<ArrasteControle, 'attributes' | 'listeners'> & { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      className="flex shrink-0 cursor-grab touch-manipulation items-center rounded p-1 text-secondary-text active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
      title="Arraste para reordenar"
      style={{ touchAction: 'none' }}
      aria-label={`Reordenar ${label}`}
    >
      <MdDragIndicator size={18} />
    </button>
  )
}
