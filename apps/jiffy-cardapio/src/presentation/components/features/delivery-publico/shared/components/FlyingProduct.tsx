'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimationControls } from 'framer-motion'

/** Tamanho base do elemento animado (escala relativa). */
const BASE_SIZE = 168
/** Tamanho final = miniatura do footer (h-10 / 40px). */
const FOOTER_SIZE = 40
/**
 * Teto do tamanho visual de partida (≈ thumb da lista `w-28` / 112px).
 * Evita miniatura enorme ao partir da foto full do modal.
 */
const MAX_START_SIDE = 112
const EASE = [0.22, 1, 0.36, 1] as const

export type FlySourceRect = {
  left: number
  top: number
  width: number
  height: number
}

export type FlyingProductProps = {
  imageUrl: string
  targetElement: HTMLElement
  /** Retângulo da imagem de origem (viewport). Sem isso, usa o centro da tela. */
  sourceRect?: FlySourceRect | null
  onArrive: () => void
  onFinish: () => void
}

function resolveStart(sourceRect: FlySourceRect | null | undefined) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (sourceRect && sourceRect.width > 0 && sourceRect.height > 0) {
    const side = Math.min(Math.max(sourceRect.width, sourceRect.height), MAX_START_SIDE)
    const startScale = side / BASE_SIZE
    const startX = sourceRect.left + sourceRect.width / 2 - BASE_SIZE / 2
    const startY = sourceRect.top + sourceRect.height / 2 - BASE_SIZE / 2
    return { startX, startY, startScale }
  }

  return {
    startX: vw / 2 - BASE_SIZE / 2,
    startY: vh / 2 - BASE_SIZE / 2,
    startScale: MAX_START_SIDE / BASE_SIZE,
  }
}

export function FlyingProduct({
  imageUrl,
  targetElement,
  sourceRect = null,
  onArrive,
  onFinish,
}: FlyingProductProps) {
  const controls = useAnimationControls()
  const [mounted, setMounted] = useState(false)

  const initialPose = useMemo(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0, scale: 1, rotate: 0, opacity: 0 }
    }
    const { startX, startY, startScale } = resolveStart(sourceRect)
    return { x: startX, y: startY, scale: startScale, rotate: 0, opacity: 1 }
  }, [sourceRect])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let cancelled = false

    const run = async () => {
      const target = targetElement.getBoundingClientRect()
      const { startX, startY, startScale } = resolveStart(sourceRect)

      const endX = target.left + target.width / 2 - BASE_SIZE / 2
      const endY = target.top + target.height / 2 - BASE_SIZE / 2
      const midX = (startX + endX) / 2
      const midY = Math.min(startY, endY) - Math.max(40, Math.abs(endY - startY) * 0.2)
      const midScale = (startScale + FOOTER_SIZE / BASE_SIZE) / 2
      const footerScale = FOOTER_SIZE / BASE_SIZE

      // Garante pose correta sem frame em (0,0).
      await controls.set({
        x: startX,
        y: startY,
        scale: startScale,
        rotate: 0,
        opacity: 1,
      })

      if (cancelled) return

      await controls.start({
        x: [startX, midX, endX],
        y: [startY, midY, endY],
        rotate: [0, -12, 8],
        scale: [startScale, midScale, footerScale],
        opacity: 1,
        transition: {
          duration: 0.62,
          ease: EASE,
          times: [0, 0.45, 1],
        },
      })

      if (cancelled) return

      onArrive()

      await controls.start({
        opacity: 0,
        transition: { duration: 0.08, ease: 'easeOut' },
      })

      if (!cancelled) onFinish()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [controls, mounted, onArrive, onFinish, sourceRect, targetElement])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] touch-none"
      role="presentation"
      aria-busy="true"
      aria-label="Adicionando item ao carrinho"
      onPointerDown={e => e.preventDefault()}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <motion.div
        initial={initialPose}
        animate={controls}
        className="pointer-events-none fixed left-0 top-0 overflow-hidden rounded-2xl shadow-xl"
        style={{
          width: BASE_SIZE,
          height: BASE_SIZE,
          willChange: 'transform',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      </motion.div>
    </div>,
    document.body
  )
}
