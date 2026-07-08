'use client'

import { DeliveryLojaHeader } from '../../../shared/components/DeliveryLojaHeader'
import { DeliveryTipoEntregaToggle } from '../../../shared/components/DeliveryTipoEntregaToggle'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryGrupoChips } from '../../../shared/components/DeliveryGrupoChips'
import { DeliverySecaoGrupo } from '../../../shared/components/DeliverySecaoGrupo'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'

export function BasicoLayoutHome({
  config,
  viewModel,
  interactive = false,
  onTipoEntregaChange,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onPedidoClick,
}: DeliveryLayoutHomeProps) {
  const filtered = filterViewModelByBusca(viewModel)

  return (
    <div className="flex min-h-full flex-col pb-2">
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
      <DeliveryBuscaProdutos
        value={viewModel.termoBusca}
        interactive={interactive}
        onChange={onBuscaChange}
      />
      <DeliveryGrupoChips
        config={config}
        grupos={filtered.grupos}
        interactive={interactive}
        onGrupoClick={onGrupoClick}
      />
      <div className="flex-1">
        {filtered.grupos.map(grupo => (
          <DeliverySecaoGrupo
            key={grupo.id}
            grupo={grupo}
            interactive={interactive}
            onProdutoClick={onProdutoClick}
          />
        ))}
      </div>
      {viewModel.carrinho.quantidadeItens > 0 ? (
        <div className="sticky bottom-0 mt-4 bg-white/95 pt-2 backdrop-blur-sm">
          <DeliveryPedidoFooter
            total={viewModel.carrinho.total}
            interactive={interactive}
            onClick={onPedidoClick}
          />
        </div>
      ) : null}
    </div>
  )
}
