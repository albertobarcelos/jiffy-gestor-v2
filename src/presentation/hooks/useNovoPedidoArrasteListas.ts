'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Arraste horizontal nas listas do modal de pedido (grupos de produtos e meios de pagamento).
 */
export function useNovoPedidoArrasteListas() {
  const gruposScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)

  const meiosPagamentoScrollRef = useRef<HTMLDivElement>(null)
  const [isDraggingMeiosPagamento, setIsDraggingMeiosPagamento] = useState(false)
  const startXMeiosPagamentoRef = useRef(0)
  const scrollLeftMeiosPagamentoRef = useRef(0)
  const hasMovedMeiosPagamentoRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gruposScrollRef.current) return
    hasMovedRef.current = false
    setIsDragging(true)
    const startXValue = e.pageX - gruposScrollRef.current.offsetLeft
    const scrollLeftValue = gruposScrollRef.current.scrollLeft
    startXRef.current = startXValue
    scrollLeftRef.current = scrollLeftValue
    gruposScrollRef.current.style.cursor = 'grabbing'
    gruposScrollRef.current.style.userSelect = 'none'

    const handleGlobalMouseMove = (ev: MouseEvent) => {
      if (!gruposScrollRef.current) return
      const x = ev.pageX - gruposScrollRef.current.offsetLeft
      const walk = (x - startXRef.current) * 2
      if (Math.abs(walk) > 5) {
        hasMovedRef.current = true
        ev.preventDefault()
        ev.stopPropagation()
      }
      if (hasMovedRef.current) {
        gruposScrollRef.current.scrollLeft = scrollLeftRef.current - walk
      }
    }

    const handleGlobalMouseUp = () => {
      if (!gruposScrollRef.current) return
      setIsDragging(false)
      gruposScrollRef.current.style.cursor = 'grab'
      gruposScrollRef.current.style.userSelect = 'auto'
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      setTimeout(() => {
        hasMovedRef.current = false
      }, 100)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const handleMouseMove = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {}, [])
  const handleMouseUp = useCallback(() => {}, [])
  const handleMouseLeave = useCallback(() => {}, [])

  const handleMouseDownMeiosPagamento = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!meiosPagamentoScrollRef.current) return
    hasMovedMeiosPagamentoRef.current = false
    setIsDraggingMeiosPagamento(true)
    const startXValue = e.pageX - meiosPagamentoScrollRef.current.offsetLeft
    const scrollLeftValue = meiosPagamentoScrollRef.current.scrollLeft
    startXMeiosPagamentoRef.current = startXValue
    scrollLeftMeiosPagamentoRef.current = scrollLeftValue
    meiosPagamentoScrollRef.current.style.cursor = 'grabbing'
    meiosPagamentoScrollRef.current.style.userSelect = 'none'

    const handleGlobalMouseMove = (ev: MouseEvent) => {
      if (!meiosPagamentoScrollRef.current) return
      const x = ev.pageX - meiosPagamentoScrollRef.current.offsetLeft
      const walk = (x - startXMeiosPagamentoRef.current) * 2
      if (Math.abs(walk) > 5) {
        hasMovedMeiosPagamentoRef.current = true
        ev.preventDefault()
        ev.stopPropagation()
      }
      if (hasMovedMeiosPagamentoRef.current) {
        meiosPagamentoScrollRef.current.scrollLeft = scrollLeftMeiosPagamentoRef.current - walk
      }
    }

    const handleGlobalMouseUp = () => {
      if (!meiosPagamentoScrollRef.current) return
      setIsDraggingMeiosPagamento(false)
      meiosPagamentoScrollRef.current.style.cursor = 'grab'
      meiosPagamentoScrollRef.current.style.userSelect = 'auto'
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      setTimeout(() => {
        hasMovedMeiosPagamentoRef.current = false
      }, 100)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  return {
    gruposScrollRef,
    isDragging,
    hasMovedRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    meiosPagamentoScrollRef,
    isDraggingMeiosPagamento,
    hasMovedMeiosPagamentoRef,
    handleMouseDownMeiosPagamento,
  }
}
