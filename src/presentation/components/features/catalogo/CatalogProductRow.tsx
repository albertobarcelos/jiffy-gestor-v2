'use client'

import { memo, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MdClose, MdDeleteOutline, MdImageNotSupported, MdVisibility } from 'react-icons/md'
import { ProdutoValorInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoValorInput'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { cn } from '@/src/shared/utils/cn'
import type { CatalogListVariant } from './types'

export interface CatalogProductRowProps {
  variant: CatalogListVariant
  id: string
  nome: string
  valor: number
  ativo: boolean
  imagemUrl?: string | null
  codigo?: string
  actionsSlot?: ReactNode
  isSavingValor?: boolean
  isSavingStatus?: boolean
  onValorChange: (id: string, valor: number) => void
  onSwitchToggle: (id: string, status: boolean) => void
  onEdit: (id: string) => void
  onRemove?: (id: string) => void
}

function CatalogProductRowInner({
  variant,
  id,
  nome,
  valor,
  ativo,
  imagemUrl,
  codigo,
  actionsSlot,
  isSavingValor,
  isSavingStatus,
  onValorChange,
  onSwitchToggle,
  onEdit,
  onRemove,
}: CatalogProductRowProps) {
  const [imagemExpandida, setImagemExpandida] = useState(false)
  const nomeExibicao = nome.length > 30 ? `${nome.slice(0, 30)}…` : nome
  const imagemPreview = imagemUrl?.trim() || null
  const isMenu = variant === 'menu'

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
            aria-label={`Imagem de ${nome}`}
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
            {/* eslint-disable-next-line @next/next/no-img-element -- preview do snapshot/cadastro */}
            <img
              src={imagemPreview}
              alt={nome}
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
        onClick={() => onEdit(id)}
        className={cn(
          'grid cursor-pointer items-center gap-x-1.5 gap-y-2 border border-gray-200 bg-white px-2 py-2 hover:bg-secondary-text/10 md:gap-x-2 md:px-4',
          isMenu
            ? '[grid-template-columns:auto_minmax(0,1fr)_auto] md:[grid-template-columns:auto_minmax(0,1fr)_auto]'
            : '[grid-template-columns:auto_minmax(0,1fr)_auto] md:[grid-template-columns:auto_minmax(0,30ch)_auto_auto_minmax(0,1fr)_auto]'
        )}
      >
        {imagemPreview ? (
          <button
            type="button"
            title="Ver imagem"
            aria-label={`Ver imagem de ${nome}`}
            onClick={e => {
              e.stopPropagation()
              setImagemExpandida(true)
            }}
            className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:h-12 md:w-12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview do snapshot/cadastro */}
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
          title={nome.length > 30 ? nome : undefined}
        >
          {nomeExibicao}
        </span>

        {!isMenu ? (
          <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-2 py-0.5 text-[10px] font-semibold leading-tight text-primary md:text-[11px]">
            COD. {codigo ?? '—'}
          </span>
        ) : null}

        {!isMenu && actionsSlot ? (
          <div
            className="col-span-3 flex items-center gap-1 md:col-span-1 md:gap-1.5"
            onClick={e => e.stopPropagation()}
          >
            {actionsSlot}
          </div>
        ) : null}

        {!isMenu ? <div className="hidden min-w-0 md:block" aria-hidden /> : null}

        <div
          className={cn(
            'flex flex-wrap items-center justify-end gap-2 md:gap-4',
            isMenu ? '' : 'col-span-3 md:col-span-1 md:mr-4'
          )}
          onClick={e => e.stopPropagation()}
        >
          <ProdutoValorInput
            valor={valor}
            disabled={isSavingValor}
            onCommit={novoValor => onValorChange(id, novoValor)}
          />
          <ProdutoStatusSwitch
            isAtivo={ativo}
            disabled={isSavingStatus}
            onChange={status => onSwitchToggle(id, status)}
          />
          {isMenu && onRemove ? (
            <button
              type="button"
              title="Remover deste cardápio"
              aria-label={`Remover ${nome} deste cardápio`}
              onClick={() => onRemove(id)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary/10"
            >
              <MdDeleteOutline size={18} />
            </button>
          ) : null}
        </div>
      </div>
      {lightbox}
    </>
  )
}

function arePropsEqual(prev: CatalogProductRowProps, next: CatalogProductRowProps): boolean {
  return (
    prev.variant === next.variant &&
    prev.id === next.id &&
    prev.nome === next.nome &&
    prev.valor === next.valor &&
    prev.ativo === next.ativo &&
    prev.imagemUrl === next.imagemUrl &&
    prev.codigo === next.codigo &&
    prev.actionsSlot === next.actionsSlot &&
    prev.isSavingValor === next.isSavingValor &&
    prev.isSavingStatus === next.isSavingStatus &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onEdit === next.onEdit &&
    prev.onRemove === next.onRemove
  )
}

export const CatalogProductRow = memo(CatalogProductRowInner, arePropsEqual)
