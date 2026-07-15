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
  onOpenComplementosModal: (produto: Produto) => void
  onOpenImpressorasModal: (produto: Produto) => void
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
      className="relative mr-2 w-12 shrink-0 self-stretch overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 md:mr-3 md:w-14"
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
          <MdPhotoCamera className="h-5 w-5 text-secondary-text/70 md:h-6 md:w-6" />
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
  onOpenComplementosModal,
  onOpenImpressorasModal,
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
      className="flex cursor-pointer items-stretch border border-gray-200 bg-white px-2 py-1 hover:bg-secondary-text/10 md:px-4 md:py-2"
    >
      <ProdutoListItemThumb
        nome={produto.getNome()}
        imagemUrl={imagemUrl}
        isUploading={isUploadingImagem}
        onSelectFile={file => onUploadImagem(produtoId, file)}
      />

      <div className="min-w-0 flex-1">
        {/* Nome e código */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex flex-col-reverse items-start text-sm font-normal text-primary-text md:flex-row md:items-center md:gap-2 md:text-base">
            <span className="tracking-wide">{produto.getNome()}</span>
            <span className="inline-flex items-center gap-1 text-sm text-secondary-text md:ml-2">
              <span className="text-xs">Cód. </span>
              <span className="font-normal">{produto.getCodigoProduto()}</span>
            </span>
          </p>
        </div>

        {/* Mobile: linha 1 (3 ícones) */}
        <div className="mt-1.5 inline-grid w-fit grid-cols-3 gap-1 md:hidden">
          <ProdutoActionIcons {...sharedIconProps} variant="mobile-row1" />
        </div>

        {/* Mobile: linha 2 (6 ícones restantes) */}
        <div className="mt-1.5 inline-grid w-fit grid-cols-3 gap-1 md:hidden">
          <ProdutoActionIcons {...sharedIconProps} variant="mobile-row2" />
        </div>

        {/* Desktop: linha única */}
        <div className="mt-1.5 hidden items-center gap-1.5 md:flex">
          <ProdutoActionIcons {...sharedIconProps} variant="desktop" />
        </div>
      </div>

      {/* Lado direito: valor + toggle */}
      <div
        className="flex flex-col-reverse flex-wrap items-end justify-end gap-4 md:mr-16 md:flex-row md:items-center"
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
    prev.onOpenComplementosModal === next.onOpenComplementosModal &&
    prev.onOpenImpressorasModal === next.onOpenImpressorasModal &&
    prev.onEditProduto === next.onEditProduto &&
    prev.onCopyProduto === next.onCopyProduto &&
    prev.onUploadImagem === next.onUploadImagem
  )
}

export const ProdutoListItem = memo(ProdutoListItemBase, arePropsEqual)
