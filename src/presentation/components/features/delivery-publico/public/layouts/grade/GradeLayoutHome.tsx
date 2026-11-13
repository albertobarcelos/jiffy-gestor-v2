'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryBasicoCatalogStickyNav } from '../basico/DeliveryBasicoCatalogStickyNav'
import { DeliveryGradeHeader } from './components/DeliveryGradeHeader'
import { DeliveryGradeToolbar } from './components/DeliveryGradeToolbar'
import { DeliveryGradeSecaoGrupo } from './components/DeliveryGradeSecaoGrupo'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'

export function GradeLayoutHome({
  config,
  viewModel,
  enderecoTexto,
  telefoneTexto,
  cnpjTexto,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onProdutoAddRapido,
  onPedidoClick,
  onMeuPedidoClick,
  onInformacoesClick,
  quantidadePorProduto,
  carrinhoThumbs,
  carrinhoThumbsBounceKey,
  carrinhoThumbsTargetRef,
}: DeliveryLayoutHomeProps) {
  const filtered = filterViewModelByBusca(viewModel)
  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0
  const catalogRootRef = useRef<HTMLDivElement>(null)

  const gruposComProdutos = useMemo(
    () => filtered.grupos.filter(grupo => grupo.produtos.length > 0),
    [filtered.grupos]
  )

  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    gruposComProdutos[0]?.id ?? null
  )

  useEffect(() => {
    if (!gruposComProdutos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(gruposComProdutos[0]?.id ?? null)
    }
  }, [gruposComProdutos, activeGrupoId])

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick]
  )

  return (
    <div
      ref={catalogRootRef}
      className={`flex min-h-full flex-col${stickyFooterVisible ? ' pb-24' : ''}`}
      style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
    >
      <DeliveryGradeHeader
        config={config}
        disponivel={viewModel.disponivel}
        statusMensagem={viewModel.statusMensagem ?? ''}
        statusDetalheHorario={viewModel.statusDetalheHorario}
        carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
        interactive={interactive}
        onInformacoesClick={onInformacoesClick}
        onPedidoClick={onPedidoClick}
        onMeuPedidoClick={onMeuPedidoClick}
      />

      <div
        className="-mt-1 flex flex-1 flex-col rounded-t-[1.75rem] pb-2 pt-2"
        style={{ backgroundColor: 'var(--delivery-bg, var(--delivery-surface))' }}
      >
        <DeliveryBasicoCatalogStickyNav catalogRootRef={catalogRootRef}>
          <DeliveryGradeToolbar
            config={config}
            grupos={gruposComProdutos}
            termoBusca={viewModel.termoBusca}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            onBuscaChange={onBuscaChange}
            onGrupoClick={handleGrupoClick}
          />
        </DeliveryBasicoCatalogStickyNav>

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

        {stickyFooterVisible ? (
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
      </div>

      <DeliveryPublicoLojaFooter
        config={config}
        enderecoTexto={enderecoTexto}
        telefoneTexto={telefoneTexto}
        cnpjTexto={cnpjTexto}
      />
    </div>
  )
}
