'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MdClose, MdImageNotSupported, MdVisibility } from 'react-icons/md'
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
  onEditProduto,
  onCopyProduto,
}: ProdutoListItemProps) {
  const produtoId = produto.getId()
  const isAtivo = produto.isAtivo()
  const [imagemExpandida, setImagemExpandida] = useState(false)

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

  const nomeCompleto = produto.getNome()
  const nomeExibicao =
    nomeCompleto.length > 30 ? `${nomeCompleto.slice(0, 30)}…` : nomeCompleto
  /** URL da foto do produto — quando existir no backend, basta preencher aqui. */
  const imagemPreview: string | null = null

  useEffect(() => {
    if (!imagemExpandida) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImagemExpandida(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [imagemExpandida])

  const lightbox =
    imagemExpandida && imagemPreview && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagem de ${nomeCompleto}`}
            onClick={() => setImagemExpandida(false)}
          >
            <button
              type="button"
              onClick={() => setImagemExpandida(false)}
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-primary-text shadow transition-colors hover:bg-white"
              aria-label="Fechar visualização"
            >
              <MdClose size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- preview local estático */}
            <img
              src={imagemPreview}
              alt={nomeCompleto}
              className="max-h-[85vh] max-w-[min(920px,92vw)] rounded-lg object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div
        onClick={() => onEditProduto(produtoId)}
        className="grid cursor-pointer items-center gap-x-1.5 gap-y-2 border border-gray-200 bg-white px-2 py-2 hover:bg-secondary-text/10 md:gap-x-2 md:px-4 [grid-template-columns:auto_minmax(0,1fr)_auto] md:[grid-template-columns:auto_minmax(0,30ch)_auto_auto_minmax(0,1fr)_auto]"
      >
        {imagemPreview ? (
          <button
            type="button"
            title="Ver imagem"
            aria-label={`Ver imagem de ${nomeCompleto}`}
            onClick={e => {
              e.stopPropagation()
              setImagemExpandida(true)
            }}
            className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:h-12 md:w-12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview local estático */}
            <img
              src={imagemPreview}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              <MdVisibility className="text-white drop-shadow" size={22} />
            </span>
          </button>
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text md:h-12 md:w-12"
            aria-hidden
            title="Sem imagem"
          >
            <MdImageNotSupported className="h-6 w-6 md:h-7 md:w-7" />
          </div>
        )}

        <span
          className="min-w-0 truncate text-sm font-normal tracking-wide text-primary-text md:text-base"
          title={nomeCompleto.length > 30 ? nomeCompleto : undefined}
        >
          {nomeExibicao}
        </span>

        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-2 py-0.5 text-[10px] font-semibold leading-tight text-primary md:text-[11px]">
          COD. {produto.getCodigoProduto() ?? '—'}
        </span>

        <div
          className="col-span-3 flex items-center gap-1 md:col-span-1 md:gap-1.5"
          onClick={e => e.stopPropagation()}
        >
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
        </div>

        <div className="hidden min-w-0 md:block" aria-hidden />

        <div
          className="col-span-3 flex flex-wrap items-center justify-end gap-2 md:col-span-1 md:mr-4 md:gap-4"
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
      {lightbox}
    </>
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
    prev.onEditProduto === next.onEditProduto &&
    prev.onCopyProduto === next.onCopyProduto
  )
}

export const ProdutoListItem = memo(ProdutoListItemBase, arePropsEqual)
