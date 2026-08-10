'use client'

import { useCallback, useEffect, useState } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryCatalogoCategoriaTabs } from '../catalogo/components/DeliveryCatalogoCategoriaTabs'
import { DeliveryGradeHeader } from './components/DeliveryGradeHeader'
import { DeliveryGradeToolbar } from './components/DeliveryGradeToolbar'
import { DeliveryGradeSecaoGrupo } from './components/DeliveryGradeSecaoGrupo'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'

export function GradeLayoutHome({
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
  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    filtered.grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!filtered.grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(filtered.grupos[0]?.id ?? null)
    }
  }, [filtered.grupos, activeGrupoId])

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick]
  )

  const handleMenuClick = useCallback(() => {
    const firstGrupo = filtered.grupos[0]
    if (firstGrupo) handleGrupoClick(firstGrupo.id)
  }, [filtered.grupos, handleGrupoClick])

  return (
    <div className="flex min-h-full flex-col pb-24">
      <div
        className="delivery-publico-content-column flex min-h-0 w-full flex-1 flex-col"
        style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
      >
        <DeliveryGradeHeader config={config} disponivel={viewModel.disponivel} />

        <div
          className="-mt-1 flex flex-1 flex-col rounded-t-[1.75rem] pb-2 pt-4"
          style={{ backgroundColor: 'var(--delivery-bg, var(--delivery-surface))' }}
        >
          <DeliveryGradeToolbar
            termoBusca={viewModel.termoBusca}
            carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
            interactive={interactive}
            onBuscaChange={onBuscaChange}
            onPedidoClick={onPedidoClick}
            onMenuClick={handleMenuClick}
          />

          <DeliveryCatalogoCategoriaTabs
            grupos={filtered.grupos}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            onGrupoClick={handleGrupoClick}
          />

          <div className="flex-1 pb-4">
            {filtered.grupos.map((grupo, index) => (
              <DeliveryGradeSecaoGrupo
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
