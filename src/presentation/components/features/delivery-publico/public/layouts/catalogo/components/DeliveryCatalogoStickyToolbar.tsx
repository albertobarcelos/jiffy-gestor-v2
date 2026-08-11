'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react'
import { DeliveryPinnedGrupoTituloOverlay } from '../../../../shared/components/DeliveryPinnedGrupoTituloOverlay'
import { useDeliveryActiveGrupoFromScroll } from '../../../../shared/hooks/useDeliveryActiveGrupoFromScroll'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import {
  DeliveryBasicoCatalogStickyNav,
  type DeliveryCatalogPinMetrics,
} from '../../basico/DeliveryBasicoCatalogStickyNav'
import { DeliveryCatalogoCategoriaTabs } from './DeliveryCatalogoCategoriaTabs'
import { DeliveryCatalogoSearch } from './DeliveryCatalogoSearch'

const PINNED_TITLE_GAP_PX = 10

type DeliveryCatalogoStickyToolbarProps = {
  catalogRootRef: RefObject<HTMLElement | null>
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  termoBusca: string
  interactive?: boolean
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
  onMenuClick?: () => void
}

/**
 * Busca + tabs + título do grupo ativo em `position: fixed`
 * (mesmo padrão Grade / Vitrine / Básico).
 */
export const DeliveryCatalogoStickyToolbar = memo(function DeliveryCatalogoStickyToolbar({
  catalogRootRef,
  config,
  grupos,
  termoBusca,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
  onMenuClick,
}: DeliveryCatalogoStickyToolbarProps) {
  const [pinMetrics, setPinMetrics] = useState<DeliveryCatalogPinMetrics>({
    pinned: false,
    height: 0,
    left: 0,
    width: 0,
    top: 0,
  })
  const [showPinnedTitle, setShowPinnedTitle] = useState(false)

  const { activeGrupoId, setActiveGrupoId } = useDeliveryActiveGrupoFromScroll({
    catalogRootRef,
    grupos,
  })

  const activeGrupo = useMemo(
    () => grupos.find(grupo => grupo.id === activeGrupoId) ?? null,
    [grupos, activeGrupoId]
  )

  const handlePinMetricsChange = useCallback((next: DeliveryCatalogPinMetrics) => {
    setPinMetrics(prev =>
      prev.pinned === next.pinned &&
      prev.height === next.height &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.top === next.top
        ? prev
        : next
    )
  }, [])

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick, setActiveGrupoId]
  )

  useEffect(() => {
    const root = catalogRootRef.current
    if (!root || !pinMetrics.pinned || !activeGrupoId) {
      setShowPinnedTitle(false)
      return
    }

    const scrollRoot =
      (root.closest('.delivery-preview-viewport') as HTMLElement | null) ??
      (root.closest('.delivery-publico-scroll') as HTMLElement | null)

    let rafId = 0
    let hiddenTitle: HTMLElement | null = null

    const clearHiddenTitle = () => {
      if (!hiddenTitle) return
      hiddenTitle.style.visibility = ''
      hiddenTitle.removeAttribute('data-delivery-title-pinned-hidden')
      hiddenTitle = null
    }

    const sync = () => {
      const title = document
        .getElementById(`grupo-${activeGrupoId}`)
        ?.querySelector('.delivery-grupo-title') as HTMLElement | null

      if (!title) {
        clearHiddenTitle()
        setShowPinnedTitle(false)
        return
      }

      const viewportTop = scrollRoot?.getBoundingClientRect().top ?? 0
      const stickyLine = viewportTop + pinMetrics.height + PINNED_TITLE_GAP_PX
      const next = title.getBoundingClientRect().top < stickyLine - 0.5

      if (next) {
        if (hiddenTitle && hiddenTitle !== title) clearHiddenTitle()
        title.style.visibility = 'hidden'
        title.setAttribute('data-delivery-title-pinned-hidden', 'true')
        hiddenTitle = title
      } else {
        clearHiddenTitle()
      }

      setShowPinnedTitle(prev => (prev === next ? prev : next))
    }

    const onScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        sync()
      })
    }

    const scrollTarget = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    sync()

    return () => {
      scrollTarget.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
      clearHiddenTitle()
    }
  }, [catalogRootRef, pinMetrics.pinned, pinMetrics.height, activeGrupoId])

  return (
    <>
      <DeliveryBasicoCatalogStickyNav
        catalogRootRef={catalogRootRef}
        onPinMetricsChange={handlePinMetricsChange}
      >
        <div
          className="border-b pb-0"
          style={{
            borderColor: 'var(--delivery-card-border)',
            backgroundColor: 'var(--delivery-bg, var(--delivery-surface))',
          }}
        >
          <DeliveryCatalogoSearch
            termoBusca={termoBusca}
            interactive={interactive}
            embedded
            onChange={onBuscaChange}
          />
          <DeliveryCatalogoCategoriaTabs
            grupos={grupos}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            onGrupoClick={handleGrupoClick}
            onMenuClick={onMenuClick}
            embedded
          />
        </div>
      </DeliveryBasicoCatalogStickyNav>

      {pinMetrics.pinned && showPinnedTitle && activeGrupo ? (
        <DeliveryPinnedGrupoTituloOverlay
          config={config}
          grupo={activeGrupo}
          top={pinMetrics.top + pinMetrics.height}
          left={pinMetrics.left}
          width={pinMetrics.width}
          gapPx={PINNED_TITLE_GAP_PX}
        />
      ) : null}
    </>
  )
})
