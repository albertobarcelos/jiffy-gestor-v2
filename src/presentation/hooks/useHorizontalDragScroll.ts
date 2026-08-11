'use client'

import { useCallback, useRef, useState } from 'react'

const DRAG_THRESHOLD_PX = 5

/** Drag horizontal + wheel para faixas com overflow-x (checkout, wizard, etc.). */
export function useHorizontalDragScroll<T extends HTMLElement>() {
  const scrollRef = useRef<T>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)
  /** Mantém clique bloqueado até o capture consumir (ou timeout). */
  const suppressClickRef = useRef(false)
  const touchStartXRef = useRef(0)

  const markMoved = useCallback(() => {
    hasMovedRef.current = true
    suppressClickRef.current = true
  }, [])

  const clearSuppressSoon = useCallback(() => {
    window.setTimeout(() => {
      hasMovedRef.current = false
      suppressClickRef.current = false
    }, 100)
  }, [])

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<T>) => {
      if (!scrollRef.current) return
      // Só botão principal; evita interferir em outros gestos.
      if (event.button !== 0) return

      hasMovedRef.current = false
      suppressClickRef.current = false
      setIsDragging(true)

      startXRef.current = event.pageX - scrollRef.current.offsetLeft
      scrollLeftRef.current = scrollRef.current.scrollLeft
      scrollRef.current.style.cursor = 'grabbing'
      scrollRef.current.style.userSelect = 'none'

      const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
        if (!scrollRef.current) return

        const x = moveEvent.pageX - scrollRef.current.offsetLeft
        const walk = (x - startXRef.current) * 2

        if (Math.abs(walk) > DRAG_THRESHOLD_PX) {
          markMoved()
          moveEvent.preventDefault()
          moveEvent.stopPropagation()
        }

        if (hasMovedRef.current) {
          scrollRef.current.scrollLeft = scrollLeftRef.current - walk
        }
      }

      const handleGlobalMouseUp = () => {
        if (!scrollRef.current) return
        setIsDragging(false)
        scrollRef.current.style.cursor = 'grab'
        scrollRef.current.style.userSelect = 'auto'

        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)

        clearSuppressSoon()
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    },
    [clearSuppressSoon, markMoved]
  )

  const handleTouchStart = useCallback((event: React.TouchEvent<T>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? 0
    hasMovedRef.current = false
    suppressClickRef.current = false
  }, [])

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<T>) => {
      const x = event.touches[0]?.clientX ?? touchStartXRef.current
      if (Math.abs(x - touchStartXRef.current) > DRAG_THRESHOLD_PX) {
        markMoved()
      }
    },
    [markMoved]
  )

  const handleTouchEnd = useCallback(() => {
    clearSuppressSoon()
  }, [clearSuppressSoon])

  /**
   * Bloqueia o click gerado ao soltar o arraste (fase capture, antes dos cards).
   */
  const handleClickCapture = useCallback((event: React.MouseEvent<T>) => {
    if (!suppressClickRef.current && !hasMovedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    hasMovedRef.current = false
    suppressClickRef.current = false
  }, [])

  const noopMouseHandler = useCallback(() => {
    // O movimento real é tratado pelos listeners globais.
  }, [])

  /** Roda do mouse (eixo Y) desloca a faixa horizontal quando há overflow. */
  const handleWheel = useCallback((event: React.WheelEvent<T>) => {
    const el = scrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    el.scrollLeft += event.deltaY
    event.preventDefault()
  }, [])

  return {
    scrollRef,
    isDragging,
    hasMovedRef,
    handleMouseDown,
    handleWheel,
    handleMouseMove: noopMouseHandler,
    handleMouseUp: noopMouseHandler,
    handleMouseLeave: noopMouseHandler,
    handleClickCapture,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
