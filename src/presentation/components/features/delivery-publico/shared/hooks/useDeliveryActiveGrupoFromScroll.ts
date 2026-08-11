'use client'

import { useEffect, useState, type RefObject } from 'react'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'

function readCssPx(el: HTMLElement, varName: string): number {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim()
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 0
}

type UseDeliveryActiveGrupoFromScrollOptions = {
  catalogRootRef: RefObject<HTMLElement | null>
  grupos: DeliveryPublicoGrupoViewModel[]
}

/**
 * Destaca o grupo ativo na barra de categorias conforme a rolagem da lista
 * (mesmo critério do layout Básico: seção cujo topo passou a linha sticky).
 */
export function useDeliveryActiveGrupoFromScroll({
  catalogRootRef,
  grupos,
}: UseDeliveryActiveGrupoFromScrollOptions) {
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
        viewportTop + readCssPx(root, '--delivery-sticky-toolbar-h') + 12

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

  return { activeGrupoId, setActiveGrupoId }
}
