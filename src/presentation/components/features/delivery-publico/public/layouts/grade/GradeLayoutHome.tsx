'use client'

import { useCallback } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryGradeHeader } from './components/DeliveryGradeHeader'
import { DeliveryGradeDeliverySelector } from './components/DeliveryGradeDeliverySelector'
import { DeliveryGradeToolbar } from './components/DeliveryGradeToolbar'
import { DeliveryGradeSecaoGrupo } from './components/DeliveryGradeSecaoGrupo'

export function GradeLayoutHome({
  config,
  viewModel,
  enderecoTexto,
  interactive = false,
  onTipoEntregaChange,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onPedidoClick,
}: DeliveryLayoutHomeProps) {
  const filtered = filterViewModelByBusca(viewModel)
  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0

  const handleMenuClick = useCallback(() => {
    const firstGrupo = filtered.grupos[0]
    if (firstGrupo) onGrupoClick?.(firstGrupo.id)
  }, [filtered.grupos, onGrupoClick])

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
    >
      <DeliveryGradeHeader config={config} disponivel={viewModel.disponivel} />

      <div
        className="-mt-1 flex flex-1 flex-col rounded-t-[1.75rem] pb-2 pt-4"
        style={{ backgroundColor: 'var(--delivery-bg, var(--delivery-surface))' }}
      >
        <DeliveryGradeDeliverySelector
          tipoEntrega={viewModel.tipoEntrega}
          interactive={interactive}
          onChange={onTipoEntregaChange}
        />

        <DeliveryGradeToolbar
          termoBusca={viewModel.termoBusca}
          carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
          interactive={interactive}
          onBuscaChange={onBuscaChange}
          onPedidoClick={onPedidoClick}
          onMenuClick={handleMenuClick}
        />

        <div className="flex-1 pb-4">
          {filtered.grupos.map(grupo => (
            <DeliveryGradeSecaoGrupo
              key={grupo.id}
              grupo={grupo}
              interactive={interactive}
              onProdutoClick={onProdutoClick}
            />
          ))}
        </div>

        {stickyFooterVisible ? (
          <div
            className="sticky bottom-0 z-30 pt-2 backdrop-blur-sm"
            style={{ backgroundColor: 'color-mix(in srgb, var(--delivery-bg, var(--delivery-surface)) 95%, transparent)' }}
          >
            <DeliveryPedidoFooter
              total={viewModel.carrinho.total}
              quantidadeItens={viewModel.carrinho.quantidadeItens}
              interactive={interactive}
              onClick={onPedidoClick}
            />
          </div>
        ) : null}
      </div>

      <DeliveryPublicoLojaFooter
        config={config}
        enderecoTexto={enderecoTexto}
        horarioTexto={viewModel.horarioTexto}
      />
    </div>
  )
}
