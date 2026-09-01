'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MdImageNotSupported, MdSearch } from 'react-icons/md'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  produtosInfiniteQueryParams,
  useProdutosInfinite,
} from '@/src/presentation/hooks/useProdutos'
import { useImagensProdutosCadastroBase } from '@/src/presentation/hooks/produtos/useImagensProdutosCadastroBase'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { showToast } from '@/src/shared/utils/toast'
import { MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'
import type { Produto } from '@/src/domain/entities/Produto'

interface AddProdutosToMenuPanelProps {
  open: boolean
  menuId: string
  produtosJaNoMenu: Set<string>
  onClose: () => void
  /** Abre o fluxo de cadastro de produto neste cardápio (fecha este painel). */
  onCadastrarNovoProduto?: () => void
}

export function AddProdutosToMenuPanel({
  open,
  menuId,
  produtosJaNoMenu,
  onClose,
  onCadastrarNovoProduto,
}: AddProdutosToMenuPanelProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { syncProdutos } = useMenuMutations(menuId)
  const { data: imagensPorProdutoId = {} } = useImagensProdutosCadastroBase()

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchText])

  const queryParams = useMemo(
    () =>
      produtosInfiniteQueryParams({
        name: debouncedSearch || undefined,
      }),
    [debouncedSearch]
  )

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProdutosInfinite(queryParams)

  useEffect(() => {
    if (!open) return
    if (hasNextPage && !isFetchingNextPage && !isFetching && data) {
      void fetchNextPage()
    }
  }, [open, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, data])

  const produtos = useMemo(() => {
    if (!data?.pages) return []
    const map = new Map<string, Produto>()
    data.pages.forEach(page => {
      page.produtos.forEach(p => {
        if (!map.has(p.getId())) map.set(p.getId(), p)
      })
    })
    return Array.from(map.values())
  }, [data])

  const totalApi = data?.pages?.[0]?.count ?? 0

  const disponiveis = useMemo(
    () => produtos.filter(p => !produtosJaNoMenu.has(p.getId())),
    [produtos, produtosJaNoMenu]
  )

  const closeAndReset = () => {
    setSelected(new Set())
    setSearchText('')
    setDebouncedSearch('')
    onClose()
  }

  const allSelected =
    disponiveis.length > 0 && disponiveis.every(p => selected.has(p.getId()))
  const someSelected = disponiveis.some(p => selected.has(p.getId()))

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        disponiveis.forEach(p => next.delete(p.getId()))
      } else {
        disponiveis.forEach(p => next.add(p.getId()))
      }
      return next
    })
  }

  const handleConfirm = async () => {
    const add = Array.from(selected)
    if (add.length === 0) {
      showToast.error('Selecione ao menos um produto')
      return
    }
    try {
      await syncProdutos.mutateAsync({ add })
      showToast.success(
        add.length === 1
          ? 'Produto adicionado ao cardápio'
          : `${add.length} produtos adicionados ao cardápio`
      )
      closeAndReset()
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={closeAndReset}
      title="Adicionar produtos"
      subtitle="Escolha produtos já cadastrados para incluir neste cardápio."
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: closeAndReset,
        showSave: true,
        saveLabel: selected.size > 0 ? `Adicionar (${selected.size})` : 'Adicionar',
        onSave: handleConfirm,
        saveLoading: syncProdutos.isPending,
        saveDisabled: selected.size === 0 || syncProdutos.isPending,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col p-2 md:p-4">
        <div className="mb-3 rounded-[10px] bg-info p-2 md:p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Produtos cadastrados</p>
              <p className="text-sm font-medium text-tertiary">
                Total {disponiveis.length} de {totalApi}
              </p>
            </div>
            {onCadastrarNovoProduto ? (
              <button
                type="button"
                onClick={() => {
                  closeAndReset()
                  onCadastrarNovoProduto()
                }}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary bg-white px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:text-sm"
              >
                Cadastrar novo produto neste Menu
                <span className="text-base leading-none">+</span>
              </button>
            ) : null}
          </div>
          <div className="relative h-8">
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="h-full w-full rounded-lg border border-gray-200 bg-white px-5 pl-12 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
              <MdSearch size={18} />
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          {isLoading && disponiveis.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <JiffyLoading />
            </div>
          )}
          {!isLoading && disponiveis.length === 0 && (
            <p className="py-8 text-center text-sm text-secondary-text">
              Nenhum produto disponível para adicionar.
            </p>
          )}
          {disponiveis.length > 0 && (
            <label className="mb-2 flex cursor-pointer items-center gap-3 border-b border-gray-200 px-4 py-2.5 text-sm font-semibold text-primary-text">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={toggleAll}
                className="h-4 w-4 accent-primary"
              />
              <span>Selecionar todos</span>
            </label>
          )}
          {disponiveis.map((produto, index) => {
            const id = produto.getId()
            const checked = selected.has(id)
            const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            const imagemUrl =
              imagensPorProdutoId[id]?.trim() || produto.getImagemUrl()?.trim() || null
            return (
              <label
                key={id}
                className={`mb-2 flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-primary-text transition-colors hover:bg-secondary-text/10 ${bgColor}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                {imagemUrl ? (
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview do cadastro */}
                    <img
                      src={imagemUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text"
                    aria-hidden
                  >
                    <MdImageNotSupported className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{produto.getNome()}</span>
                <span className="shrink-0 text-xs font-medium text-secondary-text md:text-sm">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(produto.getValor())}
                </span>
              </label>
            )
          })}
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <JiffyLoading />
            </div>
          )}
        </div>
      </div>
    </JiffySidePanelModal>
  )
}
