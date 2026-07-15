'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

type DeliveryBasicoCatalogStickyNavProps = {
  children: ReactNode
  catalogRootRef: RefObject<HTMLDivElement | null>
}

export function DeliveryBasicoCatalogStickyNav({
  children,
  catalogRootRef,
}: DeliveryBasicoCatalogStickyNavProps) {
  const navRef = useRef<HTMLDivElement>(null)
  const lastHeightRef = useRef<number | null>(null)

  useEffect(() => {
    const nav = navRef.current
    const root = catalogRootRef.current
    if (!nav || !root) return

    const syncToolbarHeight = () => {
      const next = Math.round(nav.offsetHeight)
      if (lastHeightRef.current === next) return
      lastHeightRef.current = next
      root.style.setProperty('--delivery-sticky-toolbar-h', `${next}px`)
    }

    syncToolbarHeight()

    const observer = new ResizeObserver(syncToolbarHeight)
    observer.observe(nav)

    return () => observer.disconnect()
  }, [catalogRootRef])

  return (
    <div ref={navRef} className="delivery-basico-sticky-nav">
      {children}
    </div>
  )
}
