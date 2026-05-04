'use client'

import { memo, useMemo } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { ProdutoActionIcons } from './ProdutoActionIcons'
import { ProdutoValorInput } from './ProdutoValorInput'
import { ProdutoStatusSwitch } from './ProdutoStatusSwitch'

export interface ProdutoListItemProps {
  produto: Produto
  isSavingValor?: boolean
  isSavingStatus?: boolean
  onValorChange: (produtoId: string, valor: number) => void
  onSwitchToggle: (produtoId: string, status: boolean) => void
  onToggleBoolean: (produtoId: string, field: ToggleField, value: boolean) => void
  onOpenComplementosModal: (produto: Produto) => void
  onOpenImpressorasModal: (produto: Produto) => void
  onEditProduto: (produtoId: string) => void
  onCopyProduto: (produtoId: string) => void
}

function ProdutoListItemBase({
  produto,
  isSavingValor,
  isSavingStatus,
  onValorChange,
  onSwitchToggle,
  onToggleBoolean,
  onOpenComplementosModal,
  onOpenImpressorasModal,
  onEditProduto,
  onCopyProduto,
}: ProdutoListItemProps) {
  const produtoId = produto.getId()
  const isAtivo = produto.isAtivo()

  const toggleStates = useMemo<Record<ToggleField, boolean>>(
    () => ({
      favorito: produto.isFavorito(),
      permiteAcrescimo: produto.permiteAcrescimoAtivo(),
      permiteDesconto: produto.permiteDescontoAtivo(),
      abreComplementos: produto.abreComplementosAtivo(),
      permiteAlterarPreco: produto.permiteAlterarPrecoAtivo(),
      incideTaxa: produto.incideTaxaAtivo(),
    }),
    [produto]
  )

  const sharedIconProps = {
    produto,
    toggleStates,
    onToggleBoolean,
    onOpenComplementosModal,
    onOpenImpressorasModal,
    onCopyProduto,
  }

  return (
    <div
      onClick={() => onEditProduto(produtoId)}
      className="bg-white border border-gray-200 hover:bg-secondary-text/10 md:px-4 px-2 md:py-2 py-1 flex items-center cursor-pointer"
    >
      <div className="flex-1">
        {/* Nome e código */}
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-primary-text font-normal md:text-base text-sm flex flex-col-reverse md:flex-row md:items-center items-start md:gap-2">
            <span className="tracking-wide">{produto.getNome()}</span>
            <span className="text-sm text-secondary-text md:ml-2 inline-flex items-center gap-1">
              <span className="text-xs">Cód. </span>
              <span className="font-normal">{produto.getCodigoProduto()}</span>
            </span>
          </p>
        </div>

        {/* Mobile: linha 1 (3 ícones) */}
        <div className="mt-1.5 inline-grid grid-cols-3 gap-1 w-fit md:hidden">
          <ProdutoActionIcons {...sharedIconProps} variant="mobile-row1" />
        </div>

        {/* Mobile: linha 2 (6 ícones restantes) */}
        <div className="mt-1.5 inline-grid grid-cols-3 gap-1 w-fit md:hidden">
          <ProdutoActionIcons {...sharedIconProps} variant="mobile-row2" />
        </div>

        {/* Desktop: linha única */}
        <div className="hidden md:flex items-center gap-1.5 mt-1.5">
          <ProdutoActionIcons {...sharedIconProps} variant="desktop" />
        </div>
      </div>

      {/* Lado direito: valor + toggle */}
      <div
        className="flex flex-col-reverse md:flex-row md:mr-16 items-end gap-4 flex-wrap justify-end md:items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <ProdutoValorInput
            valor={produto.getValor()}
            disabled={isSavingValor}
            onCommit={(valor) => onValorChange(produtoId, valor)}
          />
        </div>
        <ProdutoStatusSwitch
          isAtivo={isAtivo}
          disabled={isSavingStatus}
          onChange={(status) => onSwitchToggle(produtoId, status)}
        />
      </div>
    </div>
  )
}

function arePropsEqual(prev: ProdutoListItemProps, next: ProdutoListItemProps): boolean {
  return (
    prev.produto === next.produto &&
    prev.isSavingValor === next.isSavingValor &&
    prev.isSavingStatus === next.isSavingStatus &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onToggleBoolean === next.onToggleBoolean &&
    prev.onOpenComplementosModal === next.onOpenComplementosModal &&
    prev.onOpenImpressorasModal === next.onOpenImpressorasModal &&
    prev.onEditProduto === next.onEditProduto &&
    prev.onCopyProduto === next.onCopyProduto
  )
}

export const ProdutoListItem = memo(ProdutoListItemBase, arePropsEqual)
