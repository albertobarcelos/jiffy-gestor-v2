'use client'

import { useRef } from 'react'
import { DeliveryLojaHeader } from '../../../shared/components/DeliveryLojaHeader'
import { DeliveryTipoEntregaToggle } from '../../../shared/components/DeliveryTipoEntregaToggle'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryGrupoChips } from '../../../shared/components/DeliveryGrupoChips'
import { DeliverySecaoGrupo } from '../../../shared/components/DeliverySecaoGrupo'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryBasicoCatalogStickyNav } from './DeliveryBasicoCatalogStickyNav'

export function BasicoLayoutHome({
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
  const catalogRootRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={catalogRootRef} className="delivery-basico-catalog-root flex min-h-full flex-col pb-2">
      <DeliveryLojaHeader config={config} />
      <div className="mt-3">
        <DeliveryTipoEntregaToggle
          value={viewModel.tipoEntrega}
          interactive={interactive}
          onChange={onTipoEntregaChange}
        />
      </div>
      <DeliveryStatusHorario
        disponivel={viewModel.disponivel}
        horarioTexto={viewModel.horarioTexto}
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
            interactive={interactive}
            embedded
            onGrupoClick={onGrupoClick}
          />
        </div>
      </DeliveryBasicoCatalogStickyNav>
      <div className="flex-1">
        {filtered.grupos.map(grupo => (
          <DeliverySecaoGrupo
            key={grupo.id}
            grupo={grupo}
            interactive={interactive}
            stickyTitle
            onProdutoClick={onProdutoClick}
          />
        ))}
      </div>
      {viewModel.carrinho.quantidadeItens > 0 ? (
        <div
          className="sticky bottom-0 z-30 mt-4 pt-2 backdrop-blur-sm"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--delivery-bg, var(--delivery-surface)) 95%, transparent)',
          }}
        >
          <DeliveryPedidoFooter
            total={viewModel.carrinho.total}
            interactive={interactive}
            onClick={onPedidoClick}
          />
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
