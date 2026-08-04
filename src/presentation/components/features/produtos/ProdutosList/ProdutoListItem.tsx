'use client'

import { memo, useMemo, useRef } from 'react'
import { MdPhotoCamera } from 'react-icons/md'
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

function ProdutoListItemThumb({
  nome,
  imagemUrl,
  isUploading,
  onSelectFile,
}: {
  nome: string
  imagemUrl?: string | null
  isUploading?: boolean
  onSelectFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasImage = Boolean(imagemUrl)
  const label = hasImage ? `Trocar imagem de ${nome}` : `Inserir imagem de ${nome}`

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        if (isUploading) return
        inputRef.current?.click()
      }}
      disabled={isUploading}
      aria-label={label}
      title={label}
      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 md:h-12 md:w-12"
    >
      <input
        ref={inputRef}
        type="file"
        accept={DELIVERY_IMAGE_ACCEPT}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onSelectFile(file)
        }}
      />
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagemUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <MdPhotoCamera className="h-4 w-4 text-secondary-text/70 md:h-5 md:w-5" />
        </div>
      )}
      {isUploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      ) : null}
    </button>
  )
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

  return (
    <div
      onClick={() => onEditProduto(produtoId)}
      className="grid cursor-pointer items-center gap-x-2 border border-gray-200 bg-white px-2 py-1 hover:bg-secondary-text/10 md:gap-x-3 md:px-4 md:py-2 [grid-template-columns:auto_minmax(0,30ch)_5.25rem_auto_minmax(0,1fr)_auto]"
    >
      <ProdutoListItemThumb
        nome={nomeCompleto}
        imagemUrl={imagemUrl}
        isUploading={isUploadingImagem}
        onSelectFile={file => onUploadImagem(produtoId, file)}
      />

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
