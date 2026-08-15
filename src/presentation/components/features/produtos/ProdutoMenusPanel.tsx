'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MdSearch } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useProduto } from '@/src/presentation/hooks/useProdutos'
import { useAtualizarProdutoMenus } from '@/src/presentation/hooks/produtos/useAtualizarProdutoMenus'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type { Menu, ProdutoMenuResumo } from '@/src/shared/types/menus'

/** Limite máximo da listagem de menus no backend. */
const MENUS_API_MAX_LIMIT = 100

export type ProdutoMenusHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
  getSelectedIds: () => string[]
}

export type ProdutoMenusEmbedState = {
  isDirty: boolean
  isSaving: boolean
}

interface ProdutoMenusPanelProps {
  produtoId?: string
  /** Edição: PATCH imediato. Criação/cópia: só seleção local (vai no POST `menuIds`). */
  persistChanges?: boolean
  initialMenusResumo?: ReadonlyArray<ProdutoMenuResumo>
  initialMenuIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onEmbedStateChange?: (state: ProdutoMenusEmbedState) => void
}

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

function idsFromResumo(resumo?: ReadonlyArray<ProdutoMenuResumo>): string[] {
  return (resumo ?? []).map((m) => m.id).filter(Boolean)
}

function initialIdsFromProps(
  initialMenuIds?: string[],
  initialMenusResumo?: ReadonlyArray<ProdutoMenuResumo>
): string[] {
  if (initialMenuIds !== undefined) return [...initialMenuIds]
  return idsFromResumo(initialMenusResumo)
}

/**
 * Aba de vínculos do produto com menus (checkboxes).
 * Na edição, o Salvar persiste via PATCH. Na criação/cópia, a seleção segue no POST.
 */
export const ProdutoMenusPanel = forwardRef<ProdutoMenusHandle, ProdutoMenusPanelProps>(
  function ProdutoMenusPanel(
    {
      produtoId,
      persistChanges = true,
      initialMenusResumo,
      initialMenuIds,
      onSelectionChange,
      onEmbedStateChange,
    },
    ref
  ) {
    const seedIds = initialIdsFromProps(initialMenuIds, initialMenusResumo)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>(() => seedIds)
    const baselineIdsRef = useRef<string[]>(seedIds)
    const isDirtyRef = useRef(false)

    const { data: menusData, isLoading: loadingMenus, isError: menusError } = useMenus({
      ativo: null,
      limit: MENUS_API_MAX_LIMIT,
      enabled: true,
    })
    const { data: produtoDetalhe, isLoading: loadingProduto } = useProduto(
      persistChanges && produtoId ? produtoId : ''
    )
    const mutation = useAtualizarProdutoMenus(persistChanges ? produtoId : undefined)
    const initialIdsRef = useRef(seedIds)

    const menus = menusData?.items ?? []

    useEffect(() => {
      if (!persistChanges) return
      if (!produtoId || loadingProduto) return
      if (isDirtyRef.current) return
      const nextIds = produtoDetalhe
        ? idsFromResumo(produtoDetalhe.getMenus())
        : initialIdsRef.current
      baselineIdsRef.current = nextIds
      setSelectedIds(nextIds)
      onSelectionChange?.(nextIds)
      onEmbedStateChange?.({ isDirty: false, isSaving: false })
    }, [
      persistChanges,
      produtoId,
      produtoDetalhe,
      loadingProduto,
      onEmbedStateChange,
      onSelectionChange,
    ])

    const emitDirty = useCallback(
      (nextIds: string[], isSaving = false) => {
        const dirty = !sameIdSet(nextIds, baselineIdsRef.current)
        isDirtyRef.current = dirty
        onSelectionChange?.(nextIds)
        onEmbedStateChange?.({ isDirty: dirty, isSaving })
      },
      [onEmbedStateChange, onSelectionChange]
    )

    const filteredMenus = useMemo(() => {
      const q = searchQuery.trim().toLowerCase()
      const list = q
        ? menus.filter(
            (m) =>
              m.nome.toLowerCase().includes(q) ||
              m.codigo.toLowerCase().includes(q) ||
              (m.descricao ?? '').toLowerCase().includes(q)
          )
        : menus
      const selected = new Set(selectedIds)
      return [...list].sort((a, b) => {
        const va = selected.has(a.id) ? 1 : 0
        const vb = selected.has(b.id) ? 1 : 0
        if (va !== vb) return vb - va
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      })
    }, [menus, searchQuery, selectedIds])

    const toggleMenu = useCallback(
      (menu: Menu, checked: boolean) => {
        const next = checked
          ? selectedIds.includes(menu.id)
            ? selectedIds
            : [...selectedIds, menu.id]
          : selectedIds.filter((id) => id !== menu.id)
        setSelectedIds(next)
        emitDirty(next)
      },
      [selectedIds, emitDirty]
    )

    const save = useCallback(async (): Promise<boolean> => {
      if (!persistChanges || !produtoId) {
        baselineIdsRef.current = selectedIds
        isDirtyRef.current = false
        onEmbedStateChange?.({ isDirty: false, isSaving: false })
        return true
      }
      const baseline = new Set(baselineIdsRef.current)
      const selected = new Set(selectedIds)
      const add = selectedIds.filter((id) => !baseline.has(id))
      const remove = baselineIdsRef.current.filter((id) => !selected.has(id))

      if (add.length === 0 && remove.length === 0) return true

      emitDirty(selectedIds, true)
      try {
        await mutation.mutateAsync({ add, remove })
        baselineIdsRef.current = selectedIds
        isDirtyRef.current = false
        onEmbedStateChange?.({ isDirty: false, isSaving: false })
        showToast.success('Menus do produto atualizados')
        return true
      } catch (err) {
        emitDirty(selectedIds, false)
        showToast.error(err instanceof Error ? err.message : 'Erro ao salvar menus')
        return false
      }
    }, [persistChanges, produtoId, selectedIds, mutation, emitDirty, onEmbedStateChange])

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => !sameIdSet(selectedIds, baselineIdsRef.current),
        save,
        getSelectedIds: () => selectedIds,
      }),
      [selectedIds, save]
    )

    const isLoading = loadingMenus || (persistChanges && loadingProduto)
    const isSaving = mutation.isPending

    if (isLoading) {
      return (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center">
          <JiffyLoading />
        </div>
      )
    }

    if (menusError) {
      return (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-secondary-text">
          Não foi possível carregar os menus.
        </div>
      )
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <p className="shrink-0 px-4 pt-3 text-xs text-secondary-text">
          {persistChanges
            ? 'Marque os cardápios em que este produto deve aparecer. Preço e nome no cardápio são definidos em cada menu.'
            : 'Marque os cardápios em que este produto deve aparecer ao salvar. Se nenhum for marcado, o produto entra no menu principal.'}
        </p>
        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <MdSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar menu"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-primary-text outline-none ring-primary focus:ring-2"
            />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filteredMenus.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-secondary-text">
              Nenhum menu encontrado.
            </li>
          ) : (
            filteredMenus.map((menu, index) => {
              const vinculado = selectedIds.includes(menu.id)
              const isPrincipal = menu.tipo === 'principal'
              return (
                <li
                  key={menu.id}
                  className={cn(
                    'flex items-center justify-between gap-2 px-4 py-1.5 hover:bg-secondary-text/10',
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white',
                    !menu.ativo && 'opacity-70'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-primary-text md:text-sm">
                      {menu.nome}
                    </p>
                    <p className="truncate text-[10px] text-secondary-text md:text-xs">
                      {isPrincipal ? 'Principal' : 'Personalizado'}
                      {!menu.ativo ? ' · Inativo' : ''}
                    </p>
                  </div>
                  <JiffyIconSwitch
                    checked={vinculado}
                    onChange={(e) => toggleMenu(menu, e.target.checked)}
                    label="Vínculo"
                    labelPosition="start"
                    size="xs"
                    disabled={isSaving}
                    inputProps={{
                      'aria-label': vinculado
                        ? `Desvincular do menu ${menu.nome}`
                        : `Vincular ao menu ${menu.nome}`,
                    }}
                  />
                </li>
              )
            })
          )}
        </ul>
      </div>
    )
  }
)
