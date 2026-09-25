'use client'

import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Tooltip } from '@mui/material'
import {
  MdAddAPhoto,
  MdClose,
  MdDeleteOutline,
  MdImageNotSupported,
  MdVisibility,
} from 'react-icons/md'
import { ProdutoValorInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoValorInput'
import { ProdutoNomeInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoNomeInput'
import { MenuProdutoPauseControl } from '@/src/presentation/components/features/menus/MenuProdutoPauseControl'
import { cn } from '@/src/shared/utils/cn'
import { formatBRLFromMaskedInput } from '@/src/shared/utils/formatters'
import {
  NOME_CATALOGO_LISTA_MAX_CHARS,
  truncarNomeCatalogoLista,
} from '@/src/shared/utils/catalogoListaNome'
import type { CatalogListVariant } from './types'

const FOTO_BOX = 'h-14 w-14 shrink-0 self-start md:h-16 md:w-16 md:self-auto'
const NOME_COL = 'min-w-0 max-w-none justify-self-start md:max-w-[25ch]'
const AREA_FOTO = 'catalog-row-area-foto'
const AREA_NOME = 'catalog-row-area-nome'
const AREA_CODIGO = 'catalog-row-area-codigo'
const AREA_ACOES = 'catalog-row-area-acoes'
const AREA_CATEG = 'catalog-row-area-categ'
const AREA_META = 'catalog-row-area-meta'
const AREA_SIDE = 'catalog-row-area-side'

export function catalogRowGridClass(opts: {
  isMenu: boolean
  hideCodigo: boolean
  hasActions: boolean
  hasCategoria: boolean
}): string {
  if (opts.isMenu && opts.hideCodigo) {
    return opts.hasActions
      ? 'catalog-row-menu-hidecodigo-actions'
      : 'catalog-row-menu-hidecodigo'
  }
  if (opts.isMenu) {
    return 'catalog-row-menu'
  }
  if (opts.hasCategoria) {
    return 'catalog-row-base-categoria'
  }
  return 'catalog-row-base'
}

export interface CatalogProductRowProps {
  variant: CatalogListVariant
  id: string
  nome: string
  valor: number
  /** Preço promocional do snapshot (menu). Exibido à esquerda quando vigente. */
  valorPromocional?: number | null
  promocaoAtiva?: boolean
  ativo: boolean
  imagemUrl?: string | null
  codigo?: string
  actionsSlot?: ReactNode
  categoriaSlot?: ReactNode
  isSavingValor?: boolean
  isSavingStatus?: boolean
  isSavingImage?: boolean
  isSavingNome?: boolean
  onNomeChange?: (id: string, nome: string) => void | boolean | Promise<void | boolean>
  onValorChange?: (id: string, valor: number) => void | boolean | Promise<void | boolean>
  onSwitchToggle?: (id: string, status: boolean) => void
  onEdit: (id: string) => void
  onRemove?: (id: string) => void
  /** Troca a imagem (cadastro base ou snapshot do cardápio) — abre o crop no pai. */
  onChangeImage?: (id: string, file: File) => void
  /** Esconde preço e pause/status (ex.: categorias neste cardápio). */
  hidePauseAndPrice?: boolean
  /** Esconde o selo COD. */
  hideCodigo?: boolean
}

function CatalogProductRowInner({
  variant,
  id,
  nome,
  valor,
  valorPromocional = null,
  promocaoAtiva = false,
  ativo,
  imagemUrl,
  codigo,
  actionsSlot,
  categoriaSlot,
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
  hidePauseAndPrice = false,
  hideCodigo = false,
}: CatalogProductRowProps) {
  const [imagemExpandida, setImagemExpandida] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { exibicao: nomeExibicao, truncado: nomeTruncado } = truncarNomeCatalogoLista(
    nome,
    NOME_CATALOGO_LISTA_MAX_CHARS
  )
  const imagemPreview = imagemUrl?.trim() || null
  const isMenu = variant === 'menu'
  const pausadoNoMenu = isMenu && !ativo
  const podeTrocarImagem = Boolean(onChangeImage)
  const podeEditarNome = Boolean(onNomeChange)
  const podeEditarValor = Boolean(onValorChange)
  const promoNum = Number(valorPromocional ?? 0)
  const mostrarPrecoPromocional =
    isMenu &&
    promocaoAtiva &&
    Number.isFinite(promoNum) &&
    promoNum > 0 &&
    promoNum < Number(valor)

  const renderPauseMenu = () =>
    hidePauseAndPrice ? null : (
      <MenuProdutoPauseControl
        isAtivo={ativo}
        disabled={isSavingStatus}
        onToggle={status => onSwitchToggle?.(id, status)}
      />
    )

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
        'flex items-center justify-center rounded-lg border border-dashed',
        FOTO_BOX,
        podeTrocarImagem
          ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
          : 'border-gray-300 bg-gray-50 text-secondary-text'
      )}
      aria-hidden={!podeTrocarImagem}
      title={podeTrocarImagem ? undefined : 'Sem imagem'}
    >
      <MdImageNotSupported className="h-7 w-7 md:h-8 md:w-8" />
    </span>
  )

  return (
    <>
      <div
        onClick={() => onEdit(id)}
        className={cn(
          'grid cursor-pointer items-start gap-x-2 gap-y-1.5 px-2 py-2 md:items-center md:gap-x-2 md:gap-y-2 md:px-4',
          'relative z-0 has-[.tooltip-hover-above:hover]:z-[100] has-[.tooltip-hover-below:hover]:z-[100]',
          isMenu ? 'border border-gray-200' : null,
          pausadoNoMenu
            ? 'bg-gray-200 hover:bg-gray-200'
            : 'bg-white hover:bg-secondary-text/10',
          catalogRowGridClass({
            isMenu,
            hideCodigo,
            hasActions: Boolean(actionsSlot),
            hasCategoria: Boolean(categoriaSlot),
          })
        )}
      >
        {isMenu && imagemPreview ? (
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
            className={cn(
              'group relative overflow-hidden rounded-lg border border-gray-200 bg-white disabled:opacity-60',
              FOTO_BOX,
              AREA_FOTO
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- preview do snapshot/cadastro */}
            <img
              src={imagemPreview}
              alt=""
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              {podeTrocarImagem ? (
                <MdAddAPhoto className="text-white drop-shadow" size={22} />
              ) : (
                <MdVisibility className="text-white drop-shadow" size={24} />
              )}
            </span>
          </button>
        ) : isMenu && podeTrocarImagem ? (
          <button
            type="button"
            title="Adicionar imagem"
            aria-label={`Adicionar imagem de ${nome}`}
            disabled={isSavingImage}
            onClick={e => {
              e.stopPropagation()
              abrirSeletorImagem()
            }}
            className={cn('shrink-0 disabled:opacity-60', AREA_FOTO)}
          >
            {placeholderSemImagem}
          </button>
        ) : isMenu ? (
          <span className={AREA_FOTO}>{placeholderSemImagem}</span>
        ) : null}

        {podeEditarNome && onNomeChange ? (
          <div className={cn(NOME_COL, AREA_NOME)}>
            <ProdutoNomeInput
              nome={nome}
              maxChars={NOME_CATALOGO_LISTA_MAX_CHARS}
              disabled={isSavingNome}
              onCommit={novoNome => onNomeChange(id, novoNome)}
            />
          </div>
        ) : (
          <span
            className={cn(
              NOME_COL,
              AREA_NOME,
              'truncate text-sm font-normal tracking-wide text-primary-text md:text-base'
            )}
            title={nomeTruncado ? nome : undefined}
          >
            {nomeExibicao}
          </span>
        )}

        {actionsSlot ? (
          <div
            className={cn(
              AREA_ACOES,
              'flex min-w-0 flex-nowrap items-center',
              hideCodigo
                ? 'justify-self-end md:justify-self-center'
                : 'w-full justify-start md:w-auto md:justify-center'
            )}
          >
            {actionsSlot}
          </div>
        ) : null}

        {isMenu ? null : categoriaSlot ? (
          <div className={cn(AREA_CATEG, 'flex min-w-0 justify-start justify-self-stretch md:justify-center')}>
            {categoriaSlot}
          </div>
        ) : (
          <div className="catalog-row-area-spacer hidden min-w-0 md:block" aria-hidden />
        )}

        <div className={cn(AREA_SIDE, 'flex flex-col items-stretch gap-1 md:contents')}>
          <div className="flex items-center justify-end gap-1 md:contents">
            {hideCodigo ? null : (
              <span className={cn(
                AREA_CODIGO,
                'inline-flex h-5 max-w-[4.75rem] shrink-0 items-center justify-center rounded-md border border-primary/35 px-1.5 text-[9px] font-semibold tabular-nums leading-none text-primary md:h-6 md:text-[10px]'
              )}>
                COD. {codigo?.trim() ? codigo : '—'}
              </span>
            )}
            {hidePauseAndPrice || !isMenu ? null : (
              <span className="inline-flex shrink-0 md:hidden">{renderPauseMenu()}</span>
            )}
          </div>

          <div
            className={cn(
              AREA_META,
              'flex items-center justify-end gap-1 md:mr-4 md:w-auto md:flex-row md:gap-4'
            )}
          >
            {hidePauseAndPrice ? null : (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-end gap-1.5',
                  // Reserva espaço do badge promo + preço para a coluna de ações
                  // não mudar de posição entre linhas com/sem promoção.
                  'min-w-[calc(4.5rem+0.375rem+6rem)]'
                )}
              >
                {mostrarPrecoPromocional ? (
                  <span
                    className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border border-emerald-600/40 bg-emerald-50 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-700 md:text-sm"
                    title="Preço promocional"
                  >
                    {formatBRLFromMaskedInput(promoNum)}
                  </span>
                ) : null}
                {podeEditarValor && onValorChange ? (
                  <ProdutoValorInput
                    valor={valor}
                    disabled={isSavingValor}
                    className={
                      mostrarPrecoPromocional
                        ? 'text-secondary-text line-through decoration-primary/60'
                        : undefined
                    }
                    onCommit={novoValor => onValorChange(id, novoValor)}
                  />
                ) : (
                  <span
                    className={cn(
                      'inline-flex w-24 items-center justify-center rounded-lg border border-primary/50 bg-info p-2 text-center text-xs font-normal text-primary-text md:text-sm',
                      mostrarPrecoPromocional &&
                        'text-secondary-text line-through decoration-primary/60'
                    )}
                  >
                    {formatBRLFromMaskedInput(valor)}
                  </span>
                )}
              </div>
            )}
            {hidePauseAndPrice || !isMenu ? null : (
              <span className="hidden shrink-0 md:inline-flex">{renderPauseMenu()}</span>
            )}
            {onRemove ? (
              <Tooltip
                title={isMenu ? 'Remover deste cardápio' : 'Excluir produto'}
                arrow
                placement="top"
              >
                <button
                  type="button"
                  aria-label={
                    isMenu ? `Remover ${nome} deste cardápio` : `Excluir produto ${nome}`
                  }
                  onClick={e => {
                    e.stopPropagation()
                    onRemove(id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-red-400 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <MdDeleteOutline size={18} />
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>
      {isMenu && podeTrocarImagem ? (
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
    prev.valorPromocional === next.valorPromocional &&
    prev.promocaoAtiva === next.promocaoAtiva &&
    prev.ativo === next.ativo &&
    prev.imagemUrl === next.imagemUrl &&
    prev.codigo === next.codigo &&
    prev.actionsSlot === next.actionsSlot &&
    prev.categoriaSlot === next.categoriaSlot &&
    prev.isSavingValor === next.isSavingValor &&
    prev.isSavingStatus === next.isSavingStatus &&
    prev.isSavingImage === next.isSavingImage &&
    prev.isSavingNome === next.isSavingNome &&
    prev.onNomeChange === next.onNomeChange &&
    prev.onValorChange === next.onValorChange &&
    prev.onSwitchToggle === next.onSwitchToggle &&
    prev.onEdit === next.onEdit &&
    prev.onRemove === next.onRemove &&
    prev.onChangeImage === next.onChangeImage &&
    prev.hidePauseAndPrice === next.hidePauseAndPrice &&
    prev.hideCodigo === next.hideCodigo
  )
}

export const CatalogProductRow = memo(CatalogProductRowInner, arePropsEqual)
