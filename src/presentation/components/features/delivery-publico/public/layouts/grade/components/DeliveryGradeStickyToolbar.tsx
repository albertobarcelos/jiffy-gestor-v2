'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react'
import { DeliveryGrupoTituloBar } from '../../../../shared/components/DeliveryGrupoTituloBar'
import { useDeliveryActiveGrupoFromScroll } from '../../../../shared/hooks/useDeliveryActiveGrupoFromScroll'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import {
  DeliveryBasicoCatalogStickyNav,
  type DeliveryCatalogPinMetrics,
} from '../../basico/DeliveryBasicoCatalogStickyNav'
import { DeliveryCatalogoCategoriaTabs } from '../../catalogo/components/DeliveryCatalogoCategoriaTabs'
import { DeliveryGradeToolbar } from './DeliveryGradeToolbar'

const PINNED_TITLE_GAP_PX = 10

type DeliveryGradeStickyToolbarProps = {
  catalogRootRef: RefObject<HTMLElement | null>
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  termoBusca: string
  carrinhoQuantidade: number
  interactive?: boolean
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
  onPedidoClick?: () => void
  onMenuClick?: () => void
}

/**
 * Toolbar de busca + grupos + título do grupo ativo em `position: fixed`
 * (mesmo padrão da Vitrine / Básico).
 */
export const DeliveryGradeStickyToolbar = memo(function DeliveryGradeStickyToolbar({
  catalogRootRef,
  config,
  grupos,
  termoBusca,
  carrinhoQuantidade,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
  onPedidoClick,
  onMenuClick,
}: DeliveryGradeStickyToolbarProps) {
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

      // Esconde o título da lista enquanto o clone fixo está ativo (evita duplicata).
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
          <DeliveryGradeToolbar
            termoBusca={termoBusca}
            carrinhoQuantidade={carrinhoQuantidade}
            interactive={interactive}
            onBuscaChange={onBuscaChange}
            onPedidoClick={onPedidoClick}
            onMenuClick={onMenuClick}
          />

          <DeliveryCatalogoCategoriaTabs
            grupos={grupos}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            onGrupoClick={handleGrupoClick}
            embedded
          />
        </div>
      </DeliveryBasicoCatalogStickyNav>

      {pinMetrics.pinned && showPinnedTitle && activeGrupo ? (
        <div
          className="pointer-events-none px-4"
          style={{
            position: 'fixed',
            top: pinMetrics.top + pinMetrics.height + PINNED_TITLE_GAP_PX,
            left: pinMetrics.left,
            width: pinMetrics.width,
            zIndex: 35,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          <DeliveryGrupoTituloBar
            config={config}
            nome={activeGrupo.nome}
            imagemUrl={activeGrupo.imagemUrl}
            className="mb-0 shadow-sm"
          />
        </div>
      ) : null}
    </>
  )
})
