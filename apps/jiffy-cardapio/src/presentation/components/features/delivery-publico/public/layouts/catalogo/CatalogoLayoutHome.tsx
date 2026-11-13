'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryCatalogoHeader } from './components/DeliveryCatalogoHeader'
import { DeliveryCatalogoSearch } from './components/DeliveryCatalogoSearch'
import { DeliveryCatalogoCategoriaTabs } from './components/DeliveryCatalogoCategoriaTabs'
import { DeliveryBasicoCatalogStickyNav } from '../basico/DeliveryBasicoCatalogStickyNav'
import { DeliveryCatalogoSecaoGrupo } from './components/DeliveryCatalogoSecaoGrupo'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../shared/constants/deliveryPublicoSugestoes'

export function CatalogoLayoutHome({
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
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    filtered.grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!filtered.grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(filtered.grupos[0]?.id ?? null)
    }
  }, [filtered.grupos, activeGrupoId])

  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0
  const catalogRootRef = useRef<HTMLDivElement>(null)

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
      className={`flex min-h-full flex-1 flex-col${
        stickyFooterVisible ? ' delivery-home-bottom-spacer' : ''
      }`}
    >
      <DeliveryCatalogoHeader
        config={config}
        disponivel={viewModel.disponivel}
        statusMensagem={viewModel.statusMensagem}
        statusDetalheHorario={viewModel.statusDetalheHorario}
        carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
        interactive={interactive}
        onPedidoClick={onPedidoClick}
        onMeuPedidoClick={onMeuPedidoClick}
        onInformacoesClick={onInformacoesClick}
      />

      <DeliveryBasicoCatalogStickyNav catalogRootRef={catalogRootRef}>
        <div
          className="space-y-2 pb-0 pt-2"
          style={{ backgroundColor: 'var(--delivery-bg, var(--delivery-surface))' }}
        >
          <DeliveryCatalogoSearch
            termoBusca={viewModel.termoBusca}
            interactive={interactive}
            onChange={onBuscaChange}
          />
          <DeliveryCatalogoCategoriaTabs
            grupos={filtered.grupos}
            activeGrupoId={activeGrupoId}
            interactive={interactive}
            onGrupoClick={handleGrupoClick}
          />
        </div>
      </DeliveryBasicoCatalogStickyNav>

      <div className="flex-1 pb-4">
        {filtered.grupos.map((grupo, index) => (
          <DeliveryCatalogoSecaoGrupo
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
          className="fixed inset-x-0 bottom-0 z-40 pt-2"
          style={{
            backgroundColor: 'var(--delivery-bg, var(--delivery-surface, #f5f5f5))',
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
        telefoneTexto={telefoneTexto}
        cnpjTexto={cnpjTexto}
      />
    </div>
  )
}
