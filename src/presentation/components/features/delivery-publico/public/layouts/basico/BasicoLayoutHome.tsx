'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DeliveryLojaHeader } from '../../../shared/components/DeliveryLojaHeader'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryGrupoChips } from '../../../shared/components/DeliveryGrupoChips'
import { DeliverySecaoGrupo } from '../../../shared/components/DeliverySecaoGrupo'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryBasicoCatalogStickyNav } from './DeliveryBasicoCatalogStickyNav'
import { DeliveryBasicoTopNav } from './DeliveryBasicoTopNav'

function readCssPx(el: HTMLElement, varName: string): number {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim()
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 0
}

export function BasicoLayoutHome({
  config,
  viewModel,
  enderecoTexto,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onPedidoClick,
  carrinhoThumbs,
  carrinhoThumbsBounceKey,
  carrinhoThumbsTargetRef,
}: DeliveryLayoutHomeProps) {
  const filtered = filterViewModelByBusca(viewModel)
  const catalogRootRef = useRef<HTMLDivElement>(null)
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    filtered.grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!filtered.grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(filtered.grupos[0]?.id ?? null)
    }
  }, [filtered.grupos, activeGrupoId])

  useEffect(() => {
    const root = catalogRootRef.current
    if (!root) return

    const grupoIds = filtered.grupos.map(grupo => grupo.id)
    if (grupoIds.length === 0) return

    let rafId = 0

    const scrollRoot = root.closest('.delivery-preview-viewport')

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
        readCssPx(root, '--delivery-basico-topnav-h') +
        readCssPx(root, '--delivery-sticky-toolbar-h') +
        12

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
  }, [filtered.grupos])

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick]
  )

  return (
    <div ref={catalogRootRef} className="delivery-basico-catalog-root flex min-h-full flex-col pb-24">
      <DeliveryBasicoTopNav
        config={config}
        carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
        interactive={interactive}
        catalogRootRef={catalogRootRef}
        onPedidoClick={onPedidoClick}
      />
      <DeliveryLojaHeader config={config} />
      <DeliveryStatusHorario
        disponivel={viewModel.disponivel}
        horarioTexto={viewModel.horarioTexto}
        interactive={interactive}
      />
      <DeliveryBasicoCatalogStickyNav catalogRootRef={catalogRootRef}>
        <div className="min-w-0 space-y-2 pb-3 pt-3">
          <DeliveryBuscaProdutos
            value={viewModel.termoBusca}
            interactive={interactive}
            embedded
            onChange={onBuscaChange}
          />
          <DeliveryGrupoChips
            config={config}
            grupos={filtered.grupos}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            embedded
            onGrupoClick={handleGrupoClick}
          />
        </div>
      </DeliveryBasicoCatalogStickyNav>
      <div className="flex-1">
        {filtered.grupos.map(grupo => (
          <DeliverySecaoGrupo
            key={grupo.id}
            config={config}
            grupo={grupo}
            interactive={interactive}
            stickyTitle
            onProdutoClick={onProdutoClick}
          />
        ))}
      </div>
      {viewModel.carrinho.quantidadeItens > 0 ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 pt-2 backdrop-blur-sm"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--delivery-bg, var(--delivery-surface)) 95%, transparent)',
          }}
        >
          <DeliveryPedidoFooter
            total={viewModel.carrinho.total}
            quantidadeItens={viewModel.carrinho.quantidadeItens}
            interactive={interactive}
            onClick={onPedidoClick}
            thumbs={carrinhoThumbs}
            thumbsBounceKey={carrinhoThumbsBounceKey}
            thumbsTargetRef={carrinhoThumbsTargetRef}
          />
        </div>
      ) : null}

      <DeliveryPublicoLojaFooter
        config={config}
        enderecoTexto={enderecoTexto}
        horarioTexto={viewModel.horarioTexto}
      />
    </div>
  )
}
