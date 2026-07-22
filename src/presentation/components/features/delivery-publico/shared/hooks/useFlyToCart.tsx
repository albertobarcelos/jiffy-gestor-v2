'use client'

import { useCallback, useState } from 'react'
import { FlyingProduct } from '../components/FlyingProduct'

export type FlyToCartParams = {
  imageUrl: string
  targetElement: HTMLElement | null
  onFinish?: () => void
}

type FlyingSession = {
  id: string
  imageUrl: string
  targetElement: HTMLElement
  onFinish?: () => void
}

export function useFlyToCart() {
  const [session, setSession] = useState<FlyingSession | null>(null)

  const flyToCart = useCallback(({ imageUrl, targetElement, onFinish }: FlyToCartParams) => {
    if (!targetElement || !imageUrl.trim()) {
      onFinish?.()
      return
    }

    setSession({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      imageUrl,
      targetElement,
      onFinish,
    })
  }, [])

  const handleFinish = useCallback(() => {
    setSession(current => {
      const finish = current?.onFinish
      if (finish) {
        // Garante que a cópia voadora já sumiu antes da miniatura entrar no footer.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            finish()
          })
        })
      }
      return null
    })
  }, [])

  const flyingNode = session ? (
    <FlyingProduct
      key={session.id}
      imageUrl={session.imageUrl}
      targetElement={session.targetElement}
      onFinish={handleFinish}
    />
  ) : null

  return { flyToCart, flyingNode, isFlying: Boolean(session) }
}
