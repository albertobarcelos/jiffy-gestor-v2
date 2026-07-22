'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimationControls } from 'framer-motion'

const START_SIZE = 168
const END_SIZE = 52
const EASE = [0.22, 1, 0.36, 1] as const

export type FlyingProductProps = {
  imageUrl: string
  targetElement: HTMLElement
  onFinish: () => void
}

export function FlyingProduct({ imageUrl, targetElement, onFinish }: FlyingProductProps) {
  const controls = useAnimationControls()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let cancelled = false

    const run = async () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const target = targetElement.getBoundingClientRect()

      const startX = vw / 2 - START_SIZE / 2
      const startY = vh / 2 - START_SIZE / 2
      const endX = target.left + target.width / 2 - START_SIZE / 2
      const endY = target.top + target.height / 2 - START_SIZE / 2
      const midX = (startX + endX) / 2
      const midY = Math.min(startY, endY) - Math.max(60, Math.abs(endY - startY) * 0.25)
      const endScale = END_SIZE / START_SIZE

      await controls.set({
        x: startX,
        y: startY,
        scale: 1.08,
        rotate: 0,
        opacity: 1,
      })

      if (cancelled) return

      await controls.start({
        scale: endScale,
        transition: { duration: 0.55, ease: EASE, delay: 0.18 },
      })

      if (cancelled) return

      await controls.start({
        x: [startX, midX, endX],
        y: [startY, midY, endY],
        rotate: [0, -14, 10],
        scale: endScale,
        opacity: [1, 1, 0],
        transition: {
          duration: 0.9,
          ease: EASE,
          times: [0, 0.55, 1],
        },
      })

      if (cancelled) return

      await controls.set({ opacity: 0 })
      if (!cancelled) onFinish()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [controls, mounted, onFinish, targetElement])

  if (!mounted) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]" aria-hidden>
      <div className="absolute inset-0 bg-black/25" />
      <motion.div
        animate={controls}
        className="fixed left-0 top-0 overflow-hidden rounded-2xl shadow-xl"
        style={{
          width: START_SIZE,
          height: START_SIZE,
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
