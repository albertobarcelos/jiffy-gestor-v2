'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryGrupoChips } from '../../../shared/components/DeliveryGrupoChips'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../shared/types/deliveryPublicoViewModel'
import { DeliveryBasicoCatalogStickyNav } from './DeliveryBasicoCatalogStickyNav'
import type { RefObject } from 'react'

function readCssPx(el: HTMLElement, varName: string, fallback = 0): number {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim()
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : fallback
}

type DeliveryBasicoCatalogToolbarProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  termoBusca: string
  interactive?: boolean
  catalogRootRef: RefObject<HTMLDivElement | null>
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
}

/**
 * Isola estado do scroll-spy (activeGrupoId) para não re-renderizar
 * a lista de produtos a cada troca de grupo durante a rolagem.
 */
export const DeliveryBasicoCatalogToolbar = memo(function DeliveryBasicoCatalogToolbar({
  config,
  grupos,
  termoBusca,
  interactive = false,
  catalogRootRef,
  onBuscaChange,
  onGrupoClick,
}: DeliveryBasicoCatalogToolbarProps) {
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(grupos[0]?.id ?? null)
    }
  }, [grupos, activeGrupoId])

  useEffect(() => {
    const root = catalogRootRef.current
    if (!root) return

    const grupoIds = grupos.map(grupo => grupo.id)
    if (grupoIds.length === 0) return

    let rafId = 0

    const scrollRoot =
      root.closest('.delivery-preview-viewport') ??
      root.closest('.delivery-publico-scroll')

    const syncActiveGrupoFromScroll = () => {
      const sections = grupoIds
        .map(id => document.getElementById(`grupo-${id}`))
        .filter((el): el is HTMLElement => Boolean(el))

      if (sections.length === 0) return

      const viewportTop = scrollRoot
        ? scrollRoot.getBoundingClientRect().top
        : 0
      const stickyLine =
        viewportTop +
        readCssPx(root, '--delivery-sticky-toolbar-h') +
        readCssPx(root, '--delivery-sticky-grupo-gap', 10)

      let nextId = sections[0].id.replace(/^grupo-/, '')
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= stickyLine) {
          nextId = section.id.replace(/^grupo-/, '')
        } else {
          break
        }
      }

      setActiveGrupoId(prev => (prev === nextId ? prev : nextId))
    }

    const onScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        syncActiveGrupoFromScroll()
      })
    }

    const scrollTarget = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    syncActiveGrupoFromScroll()

    return () => {
      scrollTarget.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [catalogRootRef, grupos])

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick]
  )

  return (
    <DeliveryBasicoCatalogStickyNav catalogRootRef={catalogRootRef}>
      <div className="min-w-0 space-y-2 pb-3 pt-3">
        <DeliveryBuscaProdutos
          value={termoBusca}
          interactive={interactive}
          embedded
          onChange={onBuscaChange}
        />
        <DeliveryGrupoChips
          config={config}
          grupos={grupos}
          activeGrupoId={activeGrupoId}
          interactive={interactive}
          embedded
          onGrupoClick={handleGrupoClick}
        />
      </div>
    </DeliveryBasicoCatalogStickyNav>
  )
})
