'use client'

import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  MdAddAPhoto,
  MdClose,
  MdDeleteOutline,
  MdImageNotSupported,
  MdVisibility,
} from 'react-icons/md'
import { ProdutoValorInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoValorInput'
import { ProdutoNomeInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoNomeInput'
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
  /** Texto formatado no lugar do input de valor (ex.: pizza — "À partir de R$ X"). */
  valorExibicao?: string
  /** Oculta edição inline de preço (sabores pizza). */
  valorSomenteLeitura?: boolean
  isSavingValor?: boolean
  isSavingStatus?: boolean
  isSavingImage?: boolean
  isSavingNome?: boolean
  onNomeChange?: (id: string, nome: string) => void | boolean | Promise<void | boolean>
  onValorChange: (id: string, valor: number) => void | boolean | Promise<void | boolean>
  onSwitchToggle: (id: string, status: boolean) => void
  onEdit: (id: string) => void
  onRemove?: (id: string) => void
  /** Troca a imagem (cadastro base ou snapshot do cardápio) — abre o crop no pai. */
  onChangeImage?: (id: string, file: File) => void
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
  valorExibicao,
  valorSomenteLeitura = false,
  isSavingValor,
  isSavingStatus,
  isSavingImage,
  isSavingNome,
  onNomeChange,
  onValorChange,
  onSwitchToggle,
  onEdit,
  onRemove,
  onChangeImage,
}: CatalogProductRowProps) {
  const [imagemExpandida, setImagemExpandida] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nomeExibicao = nome.length > 30 ? `${nome.slice(0, 30)}…` : nome
  const imagemPreview = imagemUrl?.trim() || null
  const isMenu = variant === 'menu'
  const podeTrocarImagem = Boolean(onChangeImage)
  const podeEditarNome = Boolean(onNomeChange)

  const abrirSeletorImagem = () => {
    if (isSavingImage) return
    fileInputRef.current?.click()
  }

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

  const placeholderSemImagem = (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed md:h-12 md:w-12',
        podeTrocarImagem
          ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
          : 'border-gray-300 bg-gray-50 text-secondary-text'
      )}
      aria-hidden={!podeTrocarImagem}
      title={podeTrocarImagem ? undefined : 'Sem imagem'}
    >
      <MdImageNotSupported className="h-6 w-6 md:h-7 md:w-7" />
    </span>
  )

  return (
    <>
      <div
        onClick={() => onEdit(id)}
        className={cn(
          'grid cursor-pointer items-center gap-x-1.5 gap-y-2 border border-gray-200 bg-white px-2 py-2 hover:bg-secondary-text/10 md:gap-x-2 md:px-4',
          isMenu
            ? '[grid-template-columns:auto_minmax(0,1fr)_auto] md:[grid-template-columns:auto_minmax(0,30ch)_auto_minmax(0,1fr)_auto]'
            : '[grid-template-columns:auto_minmax(0,1fr)_auto] md:[grid-template-columns:auto_minmax(0,30ch)_auto_auto_minmax(0,1fr)_auto]'
        )}
      >
        {imagemPreview ? (
          <div className="relative h-11 w-11 shrink-0 md:h-12 md:w-12">
            <button
              type="button"
              title={podeTrocarImagem ? 'Trocar imagem' : 'Ver imagem'}
              aria-label={
                podeTrocarImagem ? `Trocar imagem de ${nome}` : `Ver imagem de ${nome}`
              }
              disabled={isSavingImage}
              onClick={e => {
                e.stopPropagation()
                if (podeTrocarImagem) abrirSeletorImagem()
                else setImagemExpandida(true)
              }}
              className="group relative h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- preview do snapshot/cadastro */}
              <img
                src={imagemPreview}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                {podeTrocarImagem ? (
                  <MdAddAPhoto className="text-white drop-shadow" size={20} />
                ) : (
                  <MdVisibility className="text-white drop-shadow" size={22} />
                )}
              </span>
            </button>
            <button
              type="button"
              title="Ver imagem"
              aria-label={`Ver imagem de ${nome}`}
              onClick={e => {
                e.stopPropagation()
                setImagemExpandida(true)
              }}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-primary text-white shadow"
            >
              <MdVisibility size={12} />
            </button>
          </div>
        ) : podeTrocarImagem ? (
          <button
            type="button"
            title="Adicionar imagem"
            aria-label={`Adicionar imagem de ${nome}`}
            disabled={isSavingImage}
            onClick={e => {
              e.stopPropagation()
              abrirSeletorImagem()
            }}
            className="shrink-0 disabled:opacity-60"
          >
            {placeholderSemImagem}
          </button>
        ) : (
          placeholderSemImagem
        )}

        {podeEditarNome && onNomeChange ? (
          <div className="min-w-0" onClick={e => e.stopPropagation()}>
            <ProdutoNomeInput
              nome={nome}
              disabled={isSavingNome}
              onCommit={novoNome => onNomeChange(id, novoNome)}
            />
          </div>
        ) : (
          <span
            className="min-w-0 truncate text-sm font-normal tracking-wide text-primary-text md:text-base"
            title={nome.length > 30 ? nome : undefined}
          >
            {nomeExibicao}
          </span>
        )}

        {!isMenu ? (
          <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary px-2 py-0.5 text-[10px] font-semibold leading-tight text-primary md:text-[11px]">
            COD. {codigo ?? '—'}
          </span>
        ) : null}

        {actionsSlot ? (
          <div
            className={cn(
              'flex items-center gap-1 md:gap-1.5',
              isMenu
                ? 'col-span-2 md:col-span-1'
                : 'col-span-3 md:col-span-1'
            )}
            onClick={e => e.stopPropagation()}
          >
            {actionsSlot}
          </div>
        ) : null}

        <div className="hidden min-w-0 md:block" aria-hidden />

        <div
          className={cn(
            'flex flex-wrap items-center justify-end gap-2 md:gap-4',
            isMenu ? 'col-span-2 md:col-span-1 md:mr-4' : 'col-span-3 md:col-span-1 md:mr-4'
          )}
          onClick={e => e.stopPropagation()}
        >
          {valorSomenteLeitura ? (
          <span
            className="shrink-0 text-xs font-medium text-secondary-text md:text-sm"
            title={valorExibicao}
          >
            {valorExibicao ?? '—'}
          </span>
        ) : (
          <ProdutoValorInput
            valor={valor}
            disabled={isSavingValor}
            onCommit={novoValor => onValorChange(id, novoValor)}
          />
        )}
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
      {podeTrocarImagem ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file && onChangeImage) onChangeImage(id, file)
          }}
        />
      ) : null}
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
    prev.valorExibicao === next.valorExibicao &&
    prev.valorSomenteLeitura === next.valorSomenteLeitura &&
    prev.isSavingValor === next.isSavingValor &&
    prev.isSavingStatus === next.isSavingStatus &&
    prev.isSavingImage === next.isSavingImage &&
    prev.isSavingNome === next.isSavingNome &&
    prev.onNomeChange === next.onNomeChange &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onEdit === next.onEdit &&
    prev.onRemove === next.onRemove &&
    prev.onChangeImage === next.onChangeImage
  )
}

export const CatalogProductRow = memo(CatalogProductRowInner, arePropsEqual)
