'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryVitrineHeader } from './components/DeliveryVitrineHeader'
import { DeliveryVitrineCategoriaTabs } from './components/DeliveryVitrineCategoriaTabs'
import { DeliveryVitrineSecaoGrupo } from './components/DeliveryVitrineSecaoGrupo'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'

export function VitrineLayoutHome({
  config,
  viewModel,
  enderecoTexto,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onProdutoAddRapido,
  onPedidoClick,
  quantidadePorProduto,
  carrinhoThumbs,
  carrinhoThumbsBounceKey,
  carrinhoThumbsTargetRef,
}: DeliveryLayoutHomeProps) {
  const filtered = filterViewModelByBusca(viewModel)
  const rootRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    filtered.grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!filtered.grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(filtered.grupos[0]?.id ?? null)
    }
  }, [filtered.grupos, activeGrupoId])

  // Altura da barra sticky (tabs + busca) para os títulos de grupo pararem abaixo dela.
  useEffect(() => {
    const root = rootRef.current
    const toolbar = toolbarRef.current
    if (!root || !toolbar) return

    const syncToolbarHeight = () => {
      root.style.setProperty(
        '--delivery-sticky-toolbar-h',
        `${Math.round(toolbar.offsetHeight)}px`
      )
    }

    syncToolbarHeight()
    const observer = new ResizeObserver(syncToolbarHeight)
    observer.observe(toolbar)

    return () => {
      observer.disconnect()
      root.style.removeProperty('--delivery-sticky-toolbar-h')
    }
  }, [buscaAberta, filtered.grupos.length])

  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick]
  )

  return (
    <div ref={rootRef} className="flex min-h-full flex-col pb-24">
      <div className="delivery-publico-content-column flex min-h-0 w-full flex-1 flex-col">
        <DeliveryVitrineHeader
          config={config}
          disponivel={viewModel.disponivel}
        />

        {/* Tabs + busca no mesmo sticky: senão a busca abre fora da viewport ao rolar. */}
        <div
          ref={toolbarRef}
          className="sticky top-0 z-40 border-b pb-0"
          style={{
            borderColor: 'var(--delivery-card-border)',
            backgroundColor: 'var(--delivery-bg, var(--delivery-surface))',
          }}
        >
          <DeliveryVitrineCategoriaTabs
            grupos={filtered.grupos}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            onGrupoClick={handleGrupoClick}
            onSearchToggle={() => setBuscaAberta(current => !current)}
          />

          {buscaAberta ? (
            <div className="pb-3">
              <DeliveryBuscaProdutos
                value={viewModel.termoBusca}
                interactive={interactive}
                embedded
                onChange={onBuscaChange}
              />
            </div>
          ) : null}
        </div>

        <div className="flex-1 pb-4">
          {filtered.grupos.map((grupo, index) => (
            <DeliveryVitrineSecaoGrupo
              key={grupo.id}
              config={config}
              grupo={grupo}
              interactive={interactive}
              denseTop={
                index > 0 &&
                filtered.grupos[index - 1]?.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
              }
              quantidadePorProduto={quantidadePorProduto}
              onProdutoClick={onProdutoClick}
              onProdutoAddRapido={onProdutoAddRapido}
              onAbrirCarrinho={onPedidoClick}
            />
          ))}
        </div>

        <DeliveryPublicoLojaFooter
          config={config}
          enderecoTexto={enderecoTexto}
          horarioTexto={viewModel.horarioSemanalTexto}
        />
      </div>

      {stickyFooterVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div
            className="delivery-publico-content-column pt-2 backdrop-blur-sm"
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
        </div>
      ) : null}
    </div>
  )
}
