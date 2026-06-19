'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('button, a, input, select, textarea, [role="button"], label')
  )
}

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef({ startY: 0, startScrollTop: 0 })

  const stopDragging = useCallback(() => {
    setIsDragging(false)
  }, [])

  const startDrag = useCallback((clientY: number) => {
    const el = ref.current
    if (!el) return
    dragState.current = {
      startY: clientY,
      startScrollTop: el.scrollTop,
    }
    setIsDragging(true)
  }, [])

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      if (isInteractiveElement(event.target)) return
      event.stopPropagation()
      startDrag(event.clientY)
      event.preventDefault()
    },
    [startDrag]
  )

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (isInteractiveElement(event.target)) return
      if (event.touches.length !== 1) return
      event.stopPropagation()
      startDrag(event.touches[0].clientY)
    },
    [startDrag]
  )

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (isInteractiveElement(event.target)) return
    event.stopPropagation()
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      const el = ref.current
      if (!el) return
      const deltaY = event.clientY - dragState.current.startY
      el.scrollTop = dragState.current.startScrollTop - deltaY
    }

    const handleTouchMove = (event: TouchEvent) => {
      const el = ref.current
      if (!el || event.touches.length !== 1) return
      const deltaY = event.touches[0].clientY - dragState.current.startY
      el.scrollTop = dragState.current.startScrollTop - deltaY
      event.preventDefault()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopDragging)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', stopDragging)
    document.addEventListener('touchcancel', stopDragging)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopDragging)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', stopDragging)
      document.removeEventListener('touchcancel', stopDragging)
    }
  }, [isDragging, stopDragging])

  return {
    ref,
    isDragging,
    dragScrollProps: {
      onPointerDown: handlePointerDown,
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
  }
}
