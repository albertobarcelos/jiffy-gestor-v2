'use client'

import { useCallback, useEffect, useState } from 'react'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryGradeDeliverySelector } from '../grade/components/DeliveryGradeDeliverySelector'
import { DeliveryCatalogoHeader } from './components/DeliveryCatalogoHeader'
import { DeliveryCatalogoSearch } from './components/DeliveryCatalogoSearch'
import { DeliveryCatalogoCategoriaTabs } from './components/DeliveryCatalogoCategoriaTabs'
import { DeliveryCatalogoSecaoGrupo } from './components/DeliveryCatalogoSecaoGrupo'

export function CatalogoLayoutHome({
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
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    filtered.grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!filtered.grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(filtered.grupos[0]?.id ?? null)
    }
  }, [filtered.grupos, activeGrupoId])

  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0
  const mostrarCategorias = config.categorias.mostrar

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
    <div className="flex min-h-full flex-col pb-2">
      <DeliveryCatalogoHeader
        config={config}
        disponivel={viewModel.disponivel}
        carrinhoQuantidade={viewModel.carrinho.quantidadeItens}
        interactive={interactive}
        onPedidoClick={onPedidoClick}
      />

      <div className="mt-2 space-y-3">
        <DeliveryGradeDeliverySelector
          tipoEntrega={viewModel.tipoEntrega}
          interactive={interactive}
          onChange={onTipoEntregaChange}
        />

        <DeliveryCatalogoSearch
          termoBusca={viewModel.termoBusca}
          interactive={interactive}
          onChange={onBuscaChange}
        />
      </div>

      {mostrarCategorias ? (
        <DeliveryCatalogoCategoriaTabs
          grupos={filtered.grupos}
          activeGrupoId={activeGrupoId}
          interactive={interactive}
          onGrupoClick={handleGrupoClick}
          onMenuClick={handleMenuClick}
        />
      ) : null}

      <div className="flex-1 pb-4">
        {filtered.grupos.map(grupo => (
          <DeliveryCatalogoSecaoGrupo
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
