'use client'

import { useCallback, useRef } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryGradeHeader } from './components/DeliveryGradeHeader'
import { DeliveryGradeStickyToolbar } from './components/DeliveryGradeStickyToolbar'
import { DeliveryGradeSecaoGrupo } from './components/DeliveryGradeSecaoGrupo'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'

export function GradeLayoutHome({
  config,
  viewModel,
  enderecoTexto,
  lojaInformacoes = null,
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
  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0

  const handleMenuClick = useCallback(() => {
    const firstGrupo = filtered.grupos[0]
    if (firstGrupo) onGrupoClick?.(firstGrupo.id)
  }, [filtered.grupos, onGrupoClick])

  return (
    <div ref={rootRef} className="flex min-h-full flex-col pb-24">
      <div
        className="delivery-publico-content-column flex min-h-0 w-full flex-1 flex-col"
        style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
      >
        <DeliveryGradeHeader config={config} />

        <div
          className="relative z-0 -mt-10 flex flex-1 flex-col rounded-t-xl pb-2 pt-12 @sm:-mt-12 @sm:pt-14"
          style={{ backgroundColor: 'var(--delivery-bg, var(--delivery-surface))' }}
        >
          <DeliveryStatusHorario
            disponivel={viewModel.disponivel}
            horarioTexto={viewModel.horarioTexto}
            interactive={interactive}
            lojaInformacoes={lojaInformacoes}
          />

          <DeliveryGradeStickyToolbar
            catalogRootRef={rootRef}
            config={config}
            grupos={filtered.grupos}
            termoBusca={viewModel.termoBusca}
            carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
            interactive={interactive}
            onBuscaChange={onBuscaChange}
            onGrupoClick={onGrupoClick}
            onPedidoClick={onPedidoClick}
            onMenuClick={handleMenuClick}
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
