'use client'

import { useRef } from 'react'
import { DeliveryLojaHeader } from '../../../shared/components/DeliveryLojaHeader'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import { DeliverySecaoGrupo } from '../../../shared/components/DeliverySecaoGrupo'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryBasicoCatalogToolbar } from './DeliveryBasicoCatalogToolbar'
import { DeliveryBasicoTopNav } from './DeliveryBasicoTopNav'

export function BasicoLayoutHome({
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
  const catalogRootRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={catalogRootRef} className="delivery-basico-catalog-root flex min-h-full flex-col pb-24">
      <DeliveryBasicoTopNav
        config={config}
        carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
        interactive={interactive}
        onPedidoClick={onPedidoClick}
      />

      <div className="delivery-publico-content-column delivery-basico-content-column flex min-h-0 w-full flex-1 flex-col">
        <DeliveryLojaHeader config={config} />
        <DeliveryStatusHorario
          disponivel={viewModel.disponivel}
          horarioTexto={viewModel.horarioTexto}
          interactive={interactive}
          lojaInformacoes={lojaInformacoes}
        />
        <DeliveryBasicoCatalogToolbar
          config={config}
          grupos={filtered.grupos}
          termoBusca={viewModel.termoBusca}
          interactive={interactive}
          catalogRootRef={catalogRootRef}
          onBuscaChange={onBuscaChange}
          onGrupoClick={onGrupoClick}
        />
        <div className="flex-1">
          {filtered.grupos.map((grupo, index) => (
            <DeliverySecaoGrupo
              key={grupo.id}
              config={config}
              grupo={grupo}
              interactive={interactive}
              stickyTitle
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

      {viewModel.carrinho.quantidadeItens > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div
            className="delivery-publico-content-column delivery-basico-content-column pt-2 backdrop-blur-sm"
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

      <DeliveryPublicoLojaFooter
        config={config}
        enderecoTexto={enderecoTexto}
        horarioTexto={viewModel.horarioSemanalTexto}
      />
    </div>
  )
}
