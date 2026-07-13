'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdRemove } from 'react-icons/md'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import type { DeliveryCarrinhoComplemento } from '../stores/deliveryCarrinhoStore'

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 8
const SWIPE_REMOVE_PX = 72
const MAX_DRAG_PX = 120

type DeliveryCarrinhoComplementoRowProps = {
  complemento: DeliveryCarrinhoComplemento
  onRemove: () => void
}

export function DeliveryCarrinhoComplementoRow({
  complemento,
  onRemove,
}: DeliveryCarrinhoComplementoRowProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [armed, setArmed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(false)

  const armedRef = useRef(false)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const offsetRef = useRef(0)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const resetGesture = useCallback(() => {
    clearLongPress()
    armedRef.current = false
    draggingRef.current = false
    pointerIdRef.current = null
    offsetRef.current = 0
    setArmed(false)
    setDragging(false)
    setOffsetX(0)
  }, [clearLongPress])

  useEffect(() => () => clearLongPress(), [clearLongPress])

  const commitRemove = useCallback(() => {
    setExiting(true)
    setOffsetX(offsetRef.current < 0 ? -MAX_DRAG_PX * 1.5 : MAX_DRAG_PX * 1.5)
    window.setTimeout(() => {
      onRemove()
    }, 180)
  }, [onRemove])

  const handlePointerDown = (e: React.PointerEvent<HTMLLIElement>) => {
    if (exiting || e.button !== 0) return

    const target = e.currentTarget
    pointerIdRef.current = e.pointerId
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    offsetRef.current = 0
    setOffsetX(0)

    clearLongPress()
    longPressTimerRef.current = setTimeout(() => {
      armedRef.current = true
      setArmed(true)
      try {
        target.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12)
      }
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    if (pointerIdRef.current !== e.pointerId || exiting) return

    const dx = e.clientX - startXRef.current
    const dy = e.clientY - startYRef.current

    if (!armedRef.current) {
      if (Math.abs(dx) > MOVE_CANCEL_PX || Math.abs(dy) > MOVE_CANCEL_PX) {
        clearLongPress()
      }
      return
    }

    e.preventDefault()
    draggingRef.current = true
    setDragging(true)

    const next = Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, dx))
    offsetRef.current = next
    setOffsetX(next)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLLIElement>) => {
    if (pointerIdRef.current !== e.pointerId) return

    const wasArmed = armedRef.current
    const finalOffset = offsetRef.current
    clearLongPress()

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    pointerIdRef.current = null

    if (wasArmed && Math.abs(finalOffset) >= SWIPE_REMOVE_PX) {
      commitRemove()
      return
    }

    resetGesture()
  }

  const handlePointerCancel = () => {
    if (exiting) return
    resetGesture()
  }

  return (
    <li
      className="relative overflow-hidden rounded-md select-none touch-pan-y"
      style={{
        opacity: exiting ? 0 : 1,
        transition: exiting ? 'opacity 180ms ease' : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-end px-2"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          opacity: armed ? Math.min(1, Math.abs(offsetX) / SWIPE_REMOVE_PX) : 0,
          transition: dragging ? 'none' : 'opacity 150ms ease',
        }}
        aria-hidden
      >
        <MdRemove className="h-4 w-4 text-red-500" />
      </div>

      <div
        className="relative flex items-center gap-2 py-0.5 text-xs"
        style={{
          transform: `translateX(${offsetX}px) scale(${armed && !dragging ? 1.02 : 1})`,
          transition: dragging || exiting ? 'none' : 'transform 180ms ease',
          backgroundColor: armed ? 'var(--delivery-surface-muted)' : 'transparent',
          borderRadius: 6,
          boxShadow: armed ? '0 0 0 1px rgba(239, 68, 68, 0.25)' : 'none',
        }}
      >
        <span className="w-5 shrink-0 text-right font-medium tabular-nums delivery-text-secondary">
          {complemento.quantidade}
        </span>
        <span
          className="min-w-0 flex-1 truncate delivery-text-secondary"
          title={complemento.nome}
        >
          {complemento.nome}
        </span>
        <span className="shrink-0 font-medium tabular-nums delivery-text-accent">
          {formatarValorComplemento(
            complemento.valor,
            normalizeTipoImpactoPreco(complemento.tipoImpactoPreco)
          )}
        </span>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          onPointerDown={e => e.stopPropagation()}
          className="shrink-0 p-0.5 text-red-500"
          aria-label={`Remover complemento ${complemento.nome}`}
        >
          <MdRemove className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
