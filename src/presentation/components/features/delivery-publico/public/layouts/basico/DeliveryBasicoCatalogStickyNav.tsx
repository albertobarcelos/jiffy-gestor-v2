'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

export type DeliveryCatalogPinMetrics = {
  pinned: boolean
  height: number
  left: number
  width: number
  top: number
}

type DeliveryBasicoCatalogStickyNavProps = {
  children: ReactNode
  catalogRootRef: RefObject<HTMLElement | null>
  onPinMetricsChange?: (metrics: DeliveryCatalogPinMetrics) => void
}

type PinMetrics = {
  height: number
  left: number
  width: number
  top: number
}

/**
 * Barra busca/grupos: em vez de `position: sticky` (instável no iOS ao re-render),
 * usa spacer + `position: fixed` quando o topo da barra alcança o scrollport.
 */
export function DeliveryBasicoCatalogStickyNav({
  children,
  catalogRootRef,
  onPinMetricsChange,
}: DeliveryBasicoCatalogStickyNavProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const onPinMetricsChangeRef = useRef(onPinMetricsChange)
  const [pinned, setPinned] = useState(false)
  const [metrics, setMetrics] = useState<PinMetrics>({
    height: 0,
    left: 0,
    width: 0,
    top: 0,
  })

  useEffect(() => {
    onPinMetricsChangeRef.current = onPinMetricsChange
  }, [onPinMetricsChange])

  const resolveScrollRoot = useCallback((): HTMLElement | null => {
    const root = catalogRootRef.current
    if (!root) return null
    return (
      (root.closest('.delivery-preview-viewport') as HTMLElement | null) ??
      (root.closest('.delivery-publico-scroll') as HTMLElement | null)
    )
  }, [catalogRootRef])

  const measure = useCallback(() => {
    const nav = navRef.current
    const root = catalogRootRef.current
    const scrollRoot = resolveScrollRoot()
    if (!nav || !root) return

    const height = Math.round(nav.offsetHeight)
    const prevHeight = root.style.getPropertyValue('--delivery-sticky-toolbar-h')
    const nextHeight = `${height}px`
    if (prevHeight !== nextHeight) {
      root.style.setProperty('--delivery-sticky-toolbar-h', nextHeight)
    }

    const scrollRect = scrollRoot?.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    const column = root.querySelector(
      '.delivery-publico-content-column, .delivery-basico-content-column'
    ) as HTMLElement | null
    const columnRect = column?.getBoundingClientRect()
    const candidate = root.closest(
      '.delivery-preview-shell'
    ) as HTMLElement | null
    const candidateTransform = candidate
      ? getComputedStyle(candidate).transform
      : 'none'
    const fixedContainingBlock =
      candidate && candidateTransform && candidateTransform !== 'none'
        ? candidate
        : null
    const containingRect = fixedContainingBlock?.getBoundingClientRect()

    const portTop = scrollRect?.top ?? 0
    const portLeft = columnRect?.left ?? scrollRect?.left ?? navRect.left
    const portWidth = columnRect?.width ?? scrollRect?.width ?? navRect.width

    const next: PinMetrics = {
      height,
      top: Math.round(containingRect ? portTop - containingRect.top : portTop),
      left: Math.round(containingRect ? portLeft - containingRect.left : portLeft),
      width: Math.round(portWidth),
    }

    setMetrics(prev =>
      prev.height === next.height &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.top === next.top
        ? prev
        : next
    )
  }, [catalogRootRef, resolveScrollRoot])

  const syncPinned = useCallback(() => {
    const sentinel = sentinelRef.current
    const scrollRoot = resolveScrollRoot()
    if (!sentinel) return

    const scrollTop = scrollRoot?.getBoundingClientRect().top ?? 0
    const sentinelTop = sentinel.getBoundingClientRect().top
    const nextPinned = sentinelTop <= scrollTop + 0.5
    setPinned(prev => (prev === nextPinned ? prev : nextPinned))
  }, [resolveScrollRoot])

  useEffect(() => {
    measure()
    syncPinned()

    const nav = navRef.current
    const resizeObserver = nav ? new ResizeObserver(measure) : null
    if (nav && resizeObserver) resizeObserver.observe(nav)

    const scrollRoot = resolveScrollRoot()

    const onScroll = () => {
      syncPinned()
    }
    const onResize = () => {
      measure()
      syncPinned()
    }

    scrollRoot?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      resizeObserver?.disconnect()
      scrollRoot?.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      catalogRootRef.current?.style.removeProperty('--delivery-sticky-toolbar-h')
    }
  }, [catalogRootRef, measure, resolveScrollRoot, syncPinned])

  useEffect(() => {
    measure()
  }, [pinned, measure])

  useEffect(() => {
    const root = catalogRootRef.current
    if (!root) return
    if (pinned) {
      root.setAttribute('data-delivery-toolbar-pinned', 'true')
    } else {
      root.removeAttribute('data-delivery-toolbar-pinned')
    }
    return () => {
      root.removeAttribute('data-delivery-toolbar-pinned')
    }
  }, [catalogRootRef, pinned])

  useEffect(() => {
    onPinMetricsChangeRef.current?.({
      pinned,
      ...metrics,
    })
  }, [pinned, metrics])

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none"
        style={{ height: pinned ? metrics.height : 0 }}
      />
      <div
        ref={navRef}
        className="delivery-basico-sticky-nav"
        style={
          pinned
            ? {
                position: 'fixed',
                top: metrics.top,
                left: metrics.left,
                width: metrics.width,
                zIndex: 40,
              }
            : { position: 'relative' }
        }
      >
        {children}
      </div>
    </>
  )
}
