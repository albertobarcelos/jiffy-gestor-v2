'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionValue } from 'framer-motion'

const LONG_PRESS_MS = 500
const REMOVE_OFFSET_PX = -88
const ARM_MOVE_CANCEL_PX = 10

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
  const [armed, setArmed] = useState(false)
  const x = useMotionValue(0)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const armedRef = useRef(false)
  const removedRef = useRef(false)
  const offsetRef = useRef(0)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const resetGesture = () => {
    clearPressTimer()
    startRef.current = null
    armedRef.current = false
    offsetRef.current = 0
    setArmed(false)
    x.set(0)
  }

  useEffect(() => () => clearPressTimer(), [])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, select')) return

    removedRef.current = false
    offsetRef.current = 0
    armedRef.current = false
    setArmed(false)
    x.set(0)
    startRef.current = { x: event.clientX, y: event.clientY }

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }

    clearPressTimer()
    pressTimerRef.current = setTimeout(() => {
      armedRef.current = true
      setArmed(true)
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current || removedRef.current) return

    const dx = event.clientX - startRef.current.x
    const dy = event.clientY - startRef.current.y

    if (!armedRef.current) {
      if (Math.abs(dx) > ARM_MOVE_CANCEL_PX || Math.abs(dy) > ARM_MOVE_CANCEL_PX) {
        clearPressTimer()
      }
      return
    }

    // Só permite arrastar para a esquerda.
    const nextX = Math.min(0, dx)
    offsetRef.current = nextX
    x.set(nextX)

    if (Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault()
    }
  }

  const finishGesture = () => {
    clearPressTimer()
    startRef.current = null

    if (removedRef.current) return

    if (armedRef.current && offsetRef.current <= REMOVE_OFFSET_PX) {
      removedRef.current = true
      armedRef.current = false
      setArmed(false)
      onSwipeRemove()
      return
    }

    resetGesture()
  }

  return (
    <motion.div
      layout
      initial={false}
      style={{ x, touchAction: armed ? 'none' : 'pan-y' }}
      animate={
        armed
          ? {
              scale: 1.04,
              y: -6,
              boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
            }
          : {
              scale: 1,
              y: 0,
              boxShadow: '0 0 0 rgba(0,0,0,0)',
            }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      exit={{ x: '-110%', opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      className={
        armed
          ? 'relative z-[2] rounded-xl bg-[var(--delivery-surface)]'
          : 'relative z-0 rounded-xl'
      }
      data-carrinho-item={itemId}
    >
      {children}
    </motion.div>
  )
}
