'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useGruposProdutosInfinite } from '@/src/presentation/hooks/useGruposProdutos'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { listarIdsProdutosDoGrupo } from '@/src/presentation/utils/listarIdsProdutosDoGrupo'
import { showToast } from '@/src/shared/utils/toast'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { MENU_MODAL_CANCEL_VARIANT, MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'

interface AddCategoriasToMenuPanelProps {
  open: boolean
  menuId: string
  categoriasJaNoMenu: Set<string>
  produtosJaNoMenu: Set<string>
  onClose: () => void
  onCadastrarNova?: () => void
}

export function AddCategoriasToMenuPanel({
  open,
  menuId,
  categoriasJaNoMenu,
  produtosJaNoMenu,
  onClose,
  onCadastrarNova,
}: AddCategoriasToMenuPanelProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { syncProdutos } = useMenuMutations(menuId)

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
    () => ({
      name: debouncedSearch || undefined,
      ativo: true as boolean,
      limit: 100,
      enabled: open,
    }),
    [debouncedSearch, open]
  )

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGruposProdutosInfinite(queryParams)

  useEffect(() => {
    if (!open) return
    if (hasNextPage && !isFetchingNextPage && !isFetching && data) {
      void fetchNextPage()
    }
  }, [open, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, data])

  const grupos = useMemo(() => {
    if (!data?.pages) return []
    const map = new Map<string, GrupoProduto>()
    data.pages.forEach(page => {
      page.grupos.forEach(g => {
        if (!map.has(g.getId())) map.set(g.getId(), g)
      })
    })
    return Array.from(map.values())
  }, [data])

  const totalApi = data?.pages?.[0]?.count ?? 0

  const disponiveis = useMemo(
    () => grupos.filter(g => !categoriasJaNoMenu.has(g.getId())),
    [grupos, categoriasJaNoMenu]
  )

  const closeAndReset = () => {
    setSelected(new Set())
    setSearchText('')
    setDebouncedSearch('')
    onClose()
  }

  const allSelected =
    disponiveis.length > 0 && disponiveis.every(g => selected.has(g.getId()))
  const someSelected = disponiveis.some(g => selected.has(g.getId()))

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
        disponiveis.forEach(g => next.delete(g.getId()))
      } else {
        disponiveis.forEach(g => next.add(g.getId()))
      }
      return next
    })
  }

  const handleConfirm = async () => {
    const grupoIds = Array.from(selected)
    if (grupoIds.length === 0) {
      showToast.error('Selecione ao menos uma categoria')
      return
    }
    try {
      const addSet = new Set<string>()
      const vazias: string[] = []
      for (const grupoId of grupoIds) {
        const ids = await listarIdsProdutosDoGrupo(grupoId)
        const novos = ids.filter(id => !produtosJaNoMenu.has(id))
        if (novos.length === 0) {
          const nome = disponiveis.find(g => g.getId() === grupoId)?.getNome() ?? grupoId
          vazias.push(nome)
          continue
        }
        novos.forEach(id => addSet.add(id))
      }
      if (addSet.size === 0) {
        showToast.error(
          vazias.length > 0
            ? 'Essas categorias não têm produtos no cadastro. Cadastre um produto nelas para aparecerem neste cardápio.'
            : 'Nenhum produto novo para adicionar'
        )
        return
      }
      await syncProdutos.mutateAsync({ add: Array.from(addSet) })
      showToast.success(
        addSet.size === 1
          ? 'Categoria adicionada a este cardápio'
          : `${grupoIds.length - vazias.length} categorias adicionadas a este cardápio`
      )
      if (vazias.length > 0) {
        showToast.warning(
          `Sem produtos no cadastro: ${vazias.join(', ')}. Cadastre um produto para elas aparecerem.`
        )
      }
      closeAndReset()
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={closeAndReset}
      title="Adicionar categorias"
      subtitle="Inclui nesta vitrine os produtos do cadastro que estão nessas categorias."
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: MENU_MODAL_CANCEL_VARIANT,
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
              <p className="text-sm font-semibold text-primary">Categorias cadastradas</p>
              <p className="text-sm font-medium text-tertiary">
                Total {disponiveis.length} de {totalApi}
              </p>
            </div>
            {onCadastrarNova ? (
              <button
                type="button"
                onClick={() => {
                  closeAndReset()
                  onCadastrarNova()
                }}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary bg-white px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:text-sm"
              >
                Cadastrar produto neste Menu
                <span className="text-base leading-none">+</span>
              </button>
            ) : null}
          </div>
          <div className="relative h-8">
            <input
              type="text"
              placeholder="Pesquisar categoria..."
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
              Nenhuma categoria disponível para adicionar.
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
              <span>Selecionar todas</span>
            </label>
          )}
          {disponiveis.map((grupo, index) => {
            const id = grupo.getId()
            const checked = selected.has(id)
            const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
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
                <span className="min-w-0 flex-1 truncate">{grupo.getNome()}</span>
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
