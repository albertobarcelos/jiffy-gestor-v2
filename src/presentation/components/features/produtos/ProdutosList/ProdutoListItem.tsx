'use client'

import { memo, useMemo } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { CatalogProductRow } from '@/src/presentation/components/features/catalogo/CatalogProductRow'
import { ProdutoActionIcons } from './ProdutoActionIcons'

export interface ProdutoListItemProps {
  produto: Produto
  isSavingValor?: boolean
  isSavingStatus?: boolean
  isSavingNome?: boolean
  onNomeChange: (produtoId: string, nome: string) => void | boolean | Promise<void | boolean>
  onValorChange: (produtoId: string, valor: number) => void | boolean | Promise<void | boolean>
  onSwitchToggle: (produtoId: string, status: boolean) => void
  onToggleBoolean: (produtoId: string, field: ToggleField, value: boolean) => void
  onEditProduto: (produtoId: string) => void
  onCopyProduto: (produtoId: string) => void
}

function ProdutoListItemBase({
  produto,
  isSavingValor,
  isSavingStatus,
  isSavingNome,
  onNomeChange,
  onValorChange,
  onSwitchToggle,
  onToggleBoolean,
  onEditProduto,
  onCopyProduto,
}: ProdutoListItemProps) {
  const produtoId = produto.getId()
  const toggleStates = useMemo<Record<ToggleField, boolean>>(
    () => ({
      favorito: produto.isFavorito(),
      permiteAcrescimo: produto.permiteAcrescimoAtivo(),
      permiteDesconto: produto.permiteDescontoAtivo(),
      abreComplementos: produto.abreComplementosAtivo(),
      permiteAlterarPreco: produto.permiteAlterarPrecoAtivo(),
      incideTaxa: produto.incideTaxaAtivo(),
      ativoDelivery: produto.isAtivoDelivery(),
    }),
    [produto]
  )

  return (
    <CatalogProductRow
      variant="base"
      id={produtoId}
      nome={produto.getNome()}
      valor={produto.getValor()}
      ativo={produto.isAtivo()}
      codigo={produto.getCodigoProduto()}
      isSavingValor={isSavingValor}
      isSavingStatus={isSavingStatus}
      isSavingNome={isSavingNome}
      onNomeChange={onNomeChange}
      onValorChange={onValorChange}
      onSwitchToggle={onSwitchToggle}
      onEdit={onEditProduto}
      actionsSlot={
        <>
          <div className="md:hidden">
            <ProdutoActionIcons
              produto={produto}
              toggleStates={toggleStates}
              variant="mobile"
              onToggleBoolean={onToggleBoolean}
              onCopyProduto={onCopyProduto}
            />
          </div>
          <div className="hidden md:block">
            <ProdutoActionIcons
              produto={produto}
              toggleStates={toggleStates}
              variant="desktop"
              onToggleBoolean={onToggleBoolean}
              onCopyProduto={onCopyProduto}
            />
          </div>
        </>
      }
    />
  )
}

function arePropsEqual(prev: ProdutoListItemProps, next: ProdutoListItemProps): boolean {
  return (
    prev.produto === next.produto &&
    prev.isSavingValor === next.isSavingValor &&
    prev.isSavingStatus === next.isSavingStatus &&
    prev.isSavingNome === next.isSavingNome &&
    prev.onNomeChange === next.onNomeChange &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onToggleBoolean === next.onToggleBoolean &&
    prev.onEditProduto === next.onEditProduto &&
    prev.onCopyProduto === next.onCopyProduto
  )
}

export const ProdutoListItem = memo(ProdutoListItemBase, arePropsEqual)
