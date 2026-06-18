'use client'

import { useCallback, useRef, useState } from 'react'

export function useHorizontalDragScroll<T extends HTMLElement>() {
  const scrollRef = useRef<T>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)

  const handleMouseDown = useCallback((event: React.MouseEvent<T>) => {
    if (!scrollRef.current) return
    hasMovedRef.current = false
    setIsDragging(true)

    startXRef.current = event.pageX - scrollRef.current.offsetLeft
    scrollLeftRef.current = scrollRef.current.scrollLeft
    scrollRef.current.style.cursor = 'grabbing'
    scrollRef.current.style.userSelect = 'none'

    const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (!scrollRef.current) return

      const x = moveEvent.pageX - scrollRef.current.offsetLeft
      const walk = (x - startXRef.current) * 2

      if (Math.abs(walk) > 5) {
        hasMovedRef.current = true
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

      setTimeout(() => {
        hasMovedRef.current = false
      }, 100)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
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
  }
}
