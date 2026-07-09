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

  useEffect(() => {
    const nav = navRef.current
    const root = catalogRootRef.current
    if (!nav || !root) return

    const syncToolbarHeight = () => {
      root.style.setProperty('--delivery-sticky-toolbar-h', `${nav.offsetHeight}px`)
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
