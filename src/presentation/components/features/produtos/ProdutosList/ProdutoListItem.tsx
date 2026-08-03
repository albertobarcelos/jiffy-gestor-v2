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

  const nomeCompleto = produto.getNome()
  const nomeExibicao =
    nomeCompleto.length > 30 ? `${nomeCompleto.slice(0, 30)}…` : nomeCompleto

  return (
    <div
      onClick={() => onEditProduto(produtoId)}
      className="grid cursor-pointer items-center gap-x-2 border border-gray-200 bg-white px-2 py-1 hover:bg-secondary-text/10 md:gap-x-3 md:px-4 md:py-2 [grid-template-columns:minmax(0,30ch)_5.25rem_auto_minmax(0,1fr)_auto]"
    >
      <span
        className="min-w-0 truncate text-sm font-normal tracking-wide text-primary-text md:text-base"
        title={nomeCompleto.length > 30 ? nomeCompleto : undefined}
      >
        {nomeExibicao}
      </span>

      <span className="inline-flex w-full items-center justify-center rounded-md border border-primary/50 bg-info px-1.5 py-px text-[10px] font-medium leading-tight text-primary">
        COD. {produto.getCodigoProduto() ?? '—'}
      </span>

      <div
        className="flex items-center gap-1 md:gap-1.5"
        onClick={e => e.stopPropagation()}
      >
        <div className="contents md:hidden">
          <ProdutoActionIcons {...sharedIconProps} variant="mobile-row1" />
          <ProdutoActionIcons {...sharedIconProps} variant="mobile-row2" />
        </div>
        <div className="hidden md:contents">
          <ProdutoActionIcons {...sharedIconProps} variant="desktop" />
        </div>
      </div>

      <div className="min-w-0" aria-hidden />

      <div
        className="flex flex-col-reverse flex-wrap items-end justify-end gap-3 md:mr-8 md:flex-row md:items-center md:gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <ProdutoValorInput
            valor={produto.getValor()}
            disabled={isSavingValor}
            onCommit={valor => onValorChange(produtoId, valor)}
          />
        </div>
        <ProdutoStatusSwitch
          isAtivo={isAtivo}
          disabled={isSavingStatus}
          onChange={status => onSwitchToggle(produtoId, status)}
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
