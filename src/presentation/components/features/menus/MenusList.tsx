'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdSearch } from 'react-icons/md'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { MenuFormPanel } from './MenuFormPanel'
import { MenuListItem } from './MenuListItem'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import type { Menu } from '@/src/shared/types/menus'

type StatusFilter = 'Todos' | 'Ativo' | 'Inativo'

export function MenusList() {
  const { toGestao } = useGestaoPath()
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('Ativo')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchText])

  const ativoFilter =
    filterStatus === 'Ativo' ? true : filterStatus === 'Inativo' ? false : null

  const { data, isLoading, isError, error } = useMenus({
    q: debouncedSearch,
    ativo: ativoFilter,
    limit: 50,
  })
  const { deleteMenu, updateMenu } = useMenuMutations()

  const items = data?.items ?? []
  const total = data?.count ?? items.length

  const emptyLabel = useMemo(() => {
    if (debouncedSearch.trim()) return 'Nenhum menu encontrado.'
    return 'Nenhum menu cadastrado.'
  }, [debouncedSearch])

  const openCreate = () => {
    setEditing(null)
    setPanelOpen(true)
  }

  const handleDelete = async (menu: Menu) => {
    if (menu.tipo === 'principal') {
      showToast.error('O menu principal não pode ser excluído.')
      return
    }
    if (!window.confirm(`Excluir o menu "${menu.nome}"?`)) return
    try {
      await deleteMenu.mutateAsync(menu.id)
      showToast.success('Menu excluído')
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const handleToggleStatus = async (menu: Menu, ativo: boolean) => {
    try {
      await updateMenu.mutateAsync({ id: menu.id, input: { ativo } })
      showToast.success(ativo ? 'Menu ativado' : 'Menu desativado')
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-1 py-[4px] md:px-[30px]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="md:pl-5">
              <p className="text-sm font-semibold text-primary">Menus cadastrados</p>
              <p className="text-sm font-normal text-tertiary md:text-[22px]">
                Total {items.length} de {total}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 md:flex-nowrap">
              <button
                type="button"
                onClick={openCreate}
                className="flex h-8 items-center gap-2 rounded-lg bg-primary px-[30px] text-sm font-semibold text-info transition-colors hover:bg-primary/90"
              >
                Novo
                <span className="text-lg">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[2px] border-t-2 border-primary/70" />

      <div className="flex gap-3 px-1 py-2">
        <div className="min-w-[180px] max-w-[360px] flex-1">
          <div className="relative h-8">
            <input
              id="menus-search"
              type="text"
              placeholder="Pesquisar menu..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-full w-full rounded-lg border border-gray-200 bg-info px-5 pl-12 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
              <MdSearch size={18} />
            </span>
          </div>
        </div>

        <div className="flex w-full items-center gap-1 sm:w-[160px]">
          <label className="mb-1 block text-xs font-semibold text-secondary-text">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
            className="h-8 w-full rounded-lg border border-gray-200 bg-info px-5 text-sm text-primary-text focus:border-primary focus:outline-none"
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="px-1">
        <div className="flex h-10 items-center gap-[10px] rounded-lg bg-custom-2 px-4">
          <div className="flex-[4] text-left text-[10px] font-semibold text-primary-text md:text-sm">
            Nome
          </div>
          <div className="hidden flex-[2] text-[10px] font-semibold text-primary-text md:block md:text-sm">
            Tipo
          </div>
          <div className="hidden flex-[2] text-[10px] font-semibold text-primary-text md:block md:text-sm">
            Código
          </div>
          <div className="flex-[2] text-right text-[10px] font-semibold text-primary-text md:text-end md:text-sm">
            Status
          </div>
        </div>
      </div>

      <div
        className="mt-1 flex-1 overflow-y-auto px-1 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <JiffyLoading />
          </div>
        )}

        {isError && (
          <p className="px-4 py-6 text-sm text-error">
            {(error as Error)?.message || 'Não foi possível carregar os menus.'}
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">{emptyLabel}</p>
          </div>
        )}

        {items.map((menu, index) => (
          <MenuListItem
            key={menu.id}
            menu={menu}
            index={index}
            onEdit={(m) => {
              setEditing(m)
              setPanelOpen(true)
            }}
            onOpenCardapio={(m) => router.push(toGestao(`/menus/${m.id}`))}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <MenuFormPanel
        open={panelOpen}
        menu={editing}
        onClose={() => {
          setPanelOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
