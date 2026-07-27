'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { Trash2 } from 'lucide-react'

/** Área da lixeira = 1/4 da largura do card (modal mobile full / desktop ~40%). */
const ACTION_WIDTH_RATIO = 0.25
const DIRECTION_LOCK_PX = 8
const EXIT_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

type DeliveryCarrinhoSwipeableItemProps = {
  itemId: string
  onSwipeRemove: () => void
  children: ReactNode
}

export function DeliveryCarrinhoSwipeableItem({
  itemId,
  onSwipeRemove,
  children,
}: DeliveryCarrinhoSwipeableItemProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [actionWidth, setActionWidth] = useState(72)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const x = useMotionValue(0)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const offsetRef = useRef(0)
  const axisLockRef = useRef<'x' | 'y' | null>(null)
  const openRef = useRef(false)
  const draggingRef = useRef(false)
  const actionWidthRef = useRef(actionWidth)

  openRef.current = open
  actionWidthRef.current = actionWidth

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const updateWidth = () => {
      const next = Math.max(56, Math.round(el.clientWidth * ACTION_WIDTH_RATIO))
      setActionWidth(next)
      actionWidthRef.current = next
      if (openRef.current) {
        offsetRef.current = -next
        x.set(-next)
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [x])

  const snapTo = (target: number, nextOpen: boolean) => {
    offsetRef.current = target
    setOpen(nextOpen)
    void animate(x, target, { type: 'spring', stiffness: 420, damping: 32 })
  }

  const resetPointer = () => {
    startRef.current = null
    axisLockRef.current = null
    draggingRef.current = false
    setDragging(false)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('[data-carrinho-swipe-action]')) return
    if (target?.closest('button, a, input, textarea, select')) return

    startRef.current = { x: event.clientX, y: event.clientY }
    axisLockRef.current = null
    offsetRef.current = openRef.current ? -actionWidthRef.current : 0

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return

    const dx = event.clientX - startRef.current.x
    const dy = event.clientY - startRef.current.y
    const width = actionWidthRef.current

    if (!axisLockRef.current) {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return
      axisLockRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
      if (axisLockRef.current === 'y') {
        resetPointer()
        return
      }
      draggingRef.current = true
      setDragging(true)
    }

    if (axisLockRef.current !== 'x') return

    const base = openRef.current ? -width : 0
    const nextX = Math.min(0, Math.max(-width, base + dx))
    offsetRef.current = nextX
    x.set(nextX)
    event.preventDefault()
  }

  const finishGesture = () => {
    if (!startRef.current && !draggingRef.current) return

    const width = actionWidthRef.current
    const shouldOpen = offsetRef.current <= -(width * 0.4)
    snapTo(shouldOpen ? -width : 0, shouldOpen)
    resetPointer()
  }

  return (
    <motion.div
      ref={rootRef}
      layout
      initial={false}
      // Exit no root: card + lixeira (absoluta) saem juntos.
      exit={{ x: '-110%', transition: EXIT_TRANSITION }}
      className="relative overflow-hidden border-b"
      style={{ borderColor: 'var(--delivery-border)' }}
      data-carrinho-item={itemId}
    >
      <div
        className="absolute inset-y-0 right-0 z-0 flex items-center justify-center"
        style={{
          width: actionWidth,
          backgroundColor: '#ffffff',
        }}
        aria-hidden={!open}
      >
        <button
          type="button"
          data-carrinho-swipe-action
          onClick={onSwipeRemove}
          aria-label="Remover item"
          className="flex h-full w-full items-center justify-center bg-white text-red-500"
        >
          <Trash2 className="h-14 w-14" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <motion.div
        initial={false}
        style={{ x, touchAction: dragging ? 'none' : 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        className="relative z-[1] bg-[var(--delivery-bg,var(--delivery-surface,#ffffff))] pr-3"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
