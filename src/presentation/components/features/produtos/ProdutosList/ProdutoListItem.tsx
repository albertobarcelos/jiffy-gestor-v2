'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  MdClose,
  MdImageNotSupported,
  MdPhotoCamera,
  MdVisibility,
} from 'react-icons/md'
import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { DELIVERY_IMAGE_ACCEPT } from '@/src/shared/constants/deliveryImageUpload'
import { ProdutoActionIcons } from './ProdutoActionIcons'
import { ProdutoValorInput } from './ProdutoValorInput'
import { ProdutoStatusSwitch } from './ProdutoStatusSwitch'

export interface ProdutoListItemProps {
  produto: Produto
  isSavingValor?: boolean
  isSavingStatus?: boolean
  isUploadingImagem?: boolean
  imagemUrl?: string | null
  onValorChange: (produtoId: string, valor: number) => void
  onSwitchToggle: (produtoId: string, status: boolean) => void
  onToggleBoolean: (produtoId: string, field: ToggleField, value: boolean) => void
  onEditProduto: (produtoId: string) => void
  onCopyProduto: (produtoId: string) => void
  onUploadImagem: (produtoId: string, file: File) => void
}

function ProdutoListItemBase({
  produto,
  isSavingValor,
  isSavingStatus,
  isUploadingImagem,
  imagemUrl = null,
  onValorChange,
  onSwitchToggle,
  onToggleBoolean,
  onEditProduto,
  onCopyProduto,
  onUploadImagem,
}: ProdutoListItemProps) {
  const produtoId = produto.getId()
  const isAtivo = produto.isAtivo()
  const [imagemExpandida, setImagemExpandida] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  /** Evita abrir o modal do produto após o diálogo nativo de arquivo (click fantasma). */
  const suppressRowClickRef = useRef(false)
  const imagemPreview = imagemUrl ?? null

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

  const nomeCompleto = produto.getNome()
  const nomeExibicao =
    nomeCompleto.length > 30 ? `${nomeCompleto.slice(0, 30)}…` : nomeCompleto

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

  const openFilePicker = () => {
    if (isUploadingImagem) return
    suppressRowClickRef.current = true
    // Abre depois do evento atual para o browser não reemitir o click na row ao fechar o diálogo.
    window.setTimeout(() => {
      inputRef.current?.click()
    }, 0)
    window.setTimeout(() => {
      suppressRowClickRef.current = false
    }, 800)
  }

  const stopRowInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleRowClick = () => {
    if (suppressRowClickRef.current) return
    onEditProduto(produtoId)
  }

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
            {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada da API de mídia */}
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
        onClick={handleRowClick}
        className="grid cursor-pointer items-center gap-x-1.5 gap-y-2 border border-gray-200 bg-white px-2 py-2 hover:bg-secondary-text/10 md:gap-x-2 md:px-4 [grid-template-columns:auto_minmax(0,1fr)_auto] md:[grid-template-columns:auto_minmax(0,30ch)_auto_auto_minmax(0,1fr)_auto]"
      >
        <input
          ref={inputRef}
          type="file"
          accept={DELIVERY_IMAGE_ACCEPT}
          className="hidden"
          onClick={e => e.stopPropagation()}
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onUploadImagem(produtoId, file)
          }}
        />

        <div
          className="relative h-11 w-11 shrink-0 md:h-12 md:w-12"
          onClick={stopRowInteraction}
          onMouseDown={stopRowInteraction}
        >
          {imagemPreview ? (
            <>
              <button
                type="button"
                title="Ver imagem"
                aria-label={`Ver imagem de ${nomeCompleto}`}
                onClick={e => {
                  stopRowInteraction(e)
                  setImagemExpandida(true)
                }}
                className="group relative h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada da API de mídia */}
                <img
                  src={imagemPreview}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <MdVisibility className="text-white drop-shadow" size={22} />
                </span>
              </button>
              <button
                type="button"
                title="Trocar imagem"
                aria-label={`Trocar imagem de ${nomeCompleto}`}
                disabled={isUploadingImagem}
                onClick={e => {
                  stopRowInteraction(e)
                  openFilePicker()
                }}
                className="absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-primary text-white shadow disabled:cursor-wait disabled:opacity-60"
              >
                <MdPhotoCamera className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              title={`Inserir imagem de ${nomeCompleto}`}
              aria-label={`Inserir imagem de ${nomeCompleto}`}
              disabled={isUploadingImagem}
              onClick={e => {
                stopRowInteraction(e)
                openFilePicker()
              }}
              className="relative flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <MdImageNotSupported className="h-6 w-6 md:h-7 md:w-7" />
            </button>
          )}
          {isUploadingImagem ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/35">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : null}
        </div>

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
    prev.isUploadingImagem === next.isUploadingImagem &&
    prev.imagemUrl === next.imagemUrl &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onToggleBoolean === next.onToggleBoolean &&
    prev.onEditProduto === next.onEditProduto &&
    prev.onCopyProduto === next.onCopyProduto &&
    prev.onUploadImagem === next.onUploadImagem
  )
}

export const ProdutoListItem = memo(ProdutoListItemBase, arePropsEqual)
