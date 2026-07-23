'use client'

import { useCallback, useRef, useState } from 'react'
import { FlyingProduct } from '../components/FlyingProduct'

export type FlyToCartParams = {
  imageUrl: string
  targetElement: HTMLElement | null
  /** Chamado no momento em que a imagem chega ao footer (ainda visível). */
  onArrive?: () => void
  /** Chamado após a cópia voadora sumir. */
  onFinish?: () => void
}

type FlyingSession = {
  id: string
  imageUrl: string
  targetElement: HTMLElement
  onArrive?: () => void
  onFinish?: () => void
}

export function useFlyToCart() {
  const [session, setSession] = useState<FlyingSession | null>(null)
  const sessionRef = useRef<FlyingSession | null>(null)
  sessionRef.current = session

  const flyToCart = useCallback(({ imageUrl, targetElement, onArrive, onFinish }: FlyToCartParams) => {
    if (!targetElement || !imageUrl.trim()) {
      onArrive?.()
      onFinish?.()
      return
    }

    setSession({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      imageUrl,
      targetElement,
      onArrive,
      onFinish,
    })
  }, [])

  const handleArrive = useCallback(() => {
    sessionRef.current?.onArrive?.()
  }, [])

  const handleFinish = useCallback(() => {
    const finish = sessionRef.current?.onFinish
    setSession(null)
    finish?.()
  }, [])

  const flyingNode = session ? (
    <FlyingProduct
      key={session.id}
      imageUrl={session.imageUrl}
      targetElement={session.targetElement}
      onArrive={handleArrive}
      onFinish={handleFinish}
    />
  ) : null

  return { flyToCart, flyingNode, isFlying: Boolean(session) }
}
