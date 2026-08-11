'use client'

import { useRef } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryVitrineHeader } from './components/DeliveryVitrineHeader'
import { DeliveryVitrineStickyToolbar } from './components/DeliveryVitrineStickyToolbar'
import { DeliveryVitrineSecaoGrupo } from './components/DeliveryVitrineSecaoGrupo'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'

export function VitrineLayoutHome({
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

  return (
    <div ref={rootRef} className="flex min-h-full flex-col pb-24">
      <div className="delivery-publico-content-column flex min-h-0 w-full flex-1 flex-col">
        <DeliveryVitrineHeader config={config} />

        <DeliveryStatusHorario
          disponivel={viewModel.disponivel}
          horarioTexto={viewModel.horarioTexto}
          interactive={interactive}
          lojaInformacoes={lojaInformacoes}
        />

        <DeliveryVitrineStickyToolbar
          catalogRootRef={rootRef}
          config={config}
          grupos={filtered.grupos}
          termoBusca={viewModel.termoBusca}
          interactive={interactive}
          onBuscaChange={onBuscaChange}
          onGrupoClick={onGrupoClick}
        />

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
