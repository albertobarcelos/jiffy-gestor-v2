'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryGrupoChips } from '../../../shared/components/DeliveryGrupoChips'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../shared/types/deliveryPublicoViewModel'
import { DeliveryBasicoCatalogStickyNav } from './DeliveryBasicoCatalogStickyNav'
import type { RefObject } from 'react'

function readCssPx(el: HTMLElement, varName: string): number {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim()
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 0
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
  const gruposComProdutos = useMemo(
    () => grupos.filter(grupo => grupo.produtos.length > 0),
    [grupos]
  )

  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    gruposComProdutos[0]?.id ?? null
  )
  /** Centraliza chip só após clique do usuário (não no spy). */
  const [centerActiveChip, setCenterActiveChip] = useState(false)
  /** Enquanto navega por clique, o spy não sobrescreve o chip ativo. */
  const lockedGrupoIdRef = useRef<string | null>(null)
  const unlockTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!gruposComProdutos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(gruposComProdutos[0]?.id ?? null)
    }
  }, [gruposComProdutos, activeGrupoId])

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current != null) {
        window.clearTimeout(unlockTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const root = catalogRootRef.current
    if (!root) return

    const grupoIds = gruposComProdutos.map(grupo => grupo.id)
    if (grupoIds.length === 0) return

    let rafId = 0
    let sections: HTMLElement[] = []

    const refreshSections = () => {
      sections = grupoIds
        .map(id => document.getElementById(`grupo-${id}`))
        .filter((el): el is HTMLElement => Boolean(el))
    }

    refreshSections()

    const scrollRoot =
      (root.closest('.delivery-preview-viewport') as HTMLElement | null) ??
      (root.closest('.delivery-publico-scroll') as HTMLElement | null)

    const syncActiveGrupoFromScroll = () => {
      if (sections.length === 0) {
        refreshSections()
        if (sections.length === 0) return
      }

      const lockedId = lockedGrupoIdRef.current
      if (lockedId) {
        const lockedEl = document.getElementById(`grupo-${lockedId}`)
        if (!lockedEl) return

        const viewportTop = scrollRoot?.getBoundingClientRect().top ?? 0
        const stickyLine =
          viewportTop + readCssPx(root, '--delivery-sticky-toolbar-h') + 12
        const lockedTop = lockedEl.getBoundingClientRect().top
        // Liberou quando a seção alvo chegou perto da linha sticky.
        if (Math.abs(lockedTop - stickyLine) <= 48) {
          lockedGrupoIdRef.current = null
          if (unlockTimerRef.current != null) {
            window.clearTimeout(unlockTimerRef.current)
            unlockTimerRef.current = null
          }
        } else {
          return
        }
      }

      const viewportTop = scrollRoot?.getBoundingClientRect().top ?? 0
      const stickyLine =
        viewportTop + readCssPx(root, '--delivery-sticky-toolbar-h') + 12

      let nextId = sections[0].id.replace(/^grupo-/, '')
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= stickyLine) {
          nextId = section.id.replace(/^grupo-/, '')
        } else {
          break
        }
      }

      setCenterActiveChip(false)
      setActiveGrupoId(prev => (prev === nextId ? prev : nextId))
    }

    const onScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        syncActiveGrupoFromScroll()
      })
    }

    const scrollTarget: HTMLElement | Window = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    syncActiveGrupoFromScroll()

    return () => {
      scrollTarget.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [catalogRootRef, gruposComProdutos])

  const scrollToGrupo = useCallback(
    (grupoId: string) => {
      const root = catalogRootRef.current
      const section = document.getElementById(`grupo-${grupoId}`)
      if (!section) return

      const scrollRoot =
        (root?.closest('.delivery-preview-viewport') as HTMLElement | null) ??
        (root?.closest('.delivery-publico-scroll') as HTMLElement | null)

      if (!scrollRoot || !root) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      const stickyH = readCssPx(root, '--delivery-sticky-toolbar-h')
      const rootRect = scrollRoot.getBoundingClientRect()
      const sectionRect = section.getBoundingClientRect()
      const nextTop =
        scrollRoot.scrollTop + (sectionRect.top - rootRect.top) - stickyH - 4

      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
    },
    [catalogRootRef]
  )

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      lockedGrupoIdRef.current = grupoId
      if (unlockTimerRef.current != null) {
        window.clearTimeout(unlockTimerRef.current)
      }
      // Fallback: libera o spy se o scroll não estabilizar.
      unlockTimerRef.current = window.setTimeout(() => {
        lockedGrupoIdRef.current = null
        unlockTimerRef.current = null
      }, 1200)

      setCenterActiveChip(true)
      setActiveGrupoId(grupoId)
      scrollToGrupo(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick, scrollToGrupo]
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
          grupos={gruposComProdutos}
          activeGrupoId={activeGrupoId}
          interactive={interactive}
          embedded
          centerActiveChip={centerActiveChip}
          onGrupoClick={handleGrupoClick}
        />
      </div>
    </DeliveryBasicoCatalogStickyNav>
  )
})
