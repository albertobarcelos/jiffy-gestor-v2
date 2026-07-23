'use client'

import { useCallback, useEffect, useState } from 'react'
import { DeliveryBuscaProdutos } from '../../../shared/components/DeliveryBuscaProdutos'
import { DeliveryPedidoFooter } from '../../../shared/components/DeliveryPedidoFooter'
import { filterViewModelByBusca } from '../../../shared/utils/filterViewModelByBusca'
import type { DeliveryLayoutHomeProps } from '../DeliveryLayoutHomeProps'
import { DeliveryVitrineHeader } from './components/DeliveryVitrineHeader'
import { DeliveryVitrineCategoriaTabs } from './components/DeliveryVitrineCategoriaTabs'
import { DeliveryVitrineSecaoGrupo } from './components/DeliveryVitrineSecaoGrupo'
import { DeliveryPublicoLojaFooter } from '../../../shared/components/DeliveryPublicoLojaFooter'

export function VitrineLayoutHome({
  config,
  viewModel,
  enderecoTexto,
  interactive = false,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onPedidoClick,
  carrinhoThumbs,
  carrinhoThumbsBounceKey,
  carrinhoThumbsTargetRef,
}: DeliveryLayoutHomeProps) {
  const filtered = filterViewModelByBusca(viewModel)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(
    filtered.grupos[0]?.id ?? null
  )

  useEffect(() => {
    if (!filtered.grupos.some(grupo => grupo.id === activeGrupoId)) {
      setActiveGrupoId(filtered.grupos[0]?.id ?? null)
    }
  }, [filtered.grupos, activeGrupoId])

  const mostrarCategorias = config.categorias.mostrar

  const handleGrupoClick = useCallback(
    (grupoId: string) => {
      setActiveGrupoId(grupoId)
      onGrupoClick?.(grupoId)
    },
    [onGrupoClick]
  )

  const stickyFooterVisible = viewModel.carrinho.quantidadeItens > 0

  return (
    <div className="flex min-h-full flex-col pb-24">
      <DeliveryVitrineHeader
        config={config}
        disponivel={viewModel.disponivel}
      />

      {mostrarCategorias ? (
        <DeliveryVitrineCategoriaTabs
          grupos={filtered.grupos}
          activeGrupoId={activeGrupoId}
          interactive={interactive}
          onGrupoClick={handleGrupoClick}
          onSearchToggle={() => setBuscaAberta(current => !current)}
        />
      ) : null}

      {buscaAberta ? (
        <DeliveryBuscaProdutos
          value={viewModel.termoBusca}
          interactive={interactive}
          onChange={onBuscaChange}
        />
      ) : null}

      <div className="flex-1 pb-4">
        {filtered.grupos.map(grupo => (
          <DeliveryVitrineSecaoGrupo
            key={grupo.id}
            grupo={grupo}
            interactive={interactive}
            onProdutoClick={onProdutoClick}
          />
        ))}
      </div>

      {stickyFooterVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 pt-2 backdrop-blur-sm">
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
        horarioTexto={viewModel.horarioTexto}
      />
    </div>
  )
}
