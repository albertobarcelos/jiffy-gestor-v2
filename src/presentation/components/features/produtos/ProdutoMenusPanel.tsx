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
import { MdExpandMore, MdSearch } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useProduto } from '@/src/presentation/hooks/useProdutos'
import { useAtualizarProdutoMenus } from '@/src/presentation/hooks/produtos/useAtualizarProdutoMenus'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type { Menu, ProdutoMenuResumo } from '@/src/shared/types/menus'
import { ProdutoMenuVinculoDetalhe } from './ProdutoMenuVinculoDetalhe'

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
  /**
   * Substitui o PATCH `/produtos/:id/menus` (cadastro base).
   * Usado no cardápio para copiar o snapshot atual aos outros menus.
   */
  onPersist?: (diff: { add: string[]; remove: string[] }) => Promise<void>
  initialMenusResumo?: ReadonlyArray<ProdutoMenuResumo>
  initialMenuIds?: string[]
  /** IDs que permanecem marcados e não podem ser desmarcados (ex.: menu de origem do wizard). */
  lockedMenuIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onEmbedStateChange?: (state: ProdutoMenusEmbedState) => void
  description?: string
}

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

function idsFromResumo(resumo?: ReadonlyArray<ProdutoMenuResumo>): string[] {
  return (resumo ?? []).map(m => m.id).filter(Boolean)
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
 * Menus já gravados podem expandir para ver o snapshot naquele cardápio.
 */
export const ProdutoMenusPanel = forwardRef<ProdutoMenusHandle, ProdutoMenusPanelProps>(
  function ProdutoMenusPanel(
    {
      produtoId,
      persistChanges = true,
      onPersist,
      initialMenusResumo,
      initialMenuIds,
      lockedMenuIds,
      onSelectionChange,
      onEmbedStateChange,
      description,
    },
    ref
  ) {
    const seedIds = initialIdsFromProps(initialMenuIds, initialMenusResumo)
    const lockedSet = useMemo(
      () => new Set((lockedMenuIds ?? []).filter(Boolean)),
      [lockedMenuIds]
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
      const locked = (lockedMenuIds ?? []).filter(Boolean)
      return [...new Set([...seedIds, ...locked])]
    })
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
    const [baselineIds, setBaselineIds] = useState<string[]>(() => [
      ...new Set([...seedIds, ...(lockedMenuIds ?? []).filter(Boolean)]),
    ])
    const baselineIdsRef = useRef<string[]>(baselineIds)
    const isDirtyRef = useRef(false)

    const { data: menusData, isLoading: loadingMenus, isError: menusError } = useMenus({
      ativo: null,
      limit: MENUS_API_MAX_LIMIT,
      enabled: true,
    })
    const { data: produtoDetalhe, isLoading: loadingProduto } = useProduto(
      persistChanges && produtoId ? produtoId : ''
    )
    const mutation = useAtualizarProdutoMenus(
      persistChanges && !onPersist ? produtoId : undefined
    )
    const [savingLocal, setSavingLocal] = useState(false)
    const initialIdsRef = useRef(seedIds)

    const menus = menusData?.items ?? []

    /** Snapshot só existe em menus já persistidos (baseline), não em vínculo só local. */
    const persistedVinculoIds = useMemo(() => {
      const ids = new Set(baselineIds)
      for (const id of lockedSet) ids.add(id)
      return ids
    }, [baselineIds, lockedSet])

    useEffect(() => {
      if (!persistChanges) return
      if (!produtoId || loadingProduto) return
      if (isDirtyRef.current) return
      const nextIds = produtoDetalhe
        ? idsFromResumo(produtoDetalhe.getMenus())
        : initialIdsRef.current
      const withLocked = [...new Set([...nextIds, ...lockedSet])]
      baselineIdsRef.current = withLocked
      setBaselineIds(withLocked)
      setSelectedIds(withLocked)
      onSelectionChange?.(withLocked)
      onEmbedStateChange?.({ isDirty: false, isSaving: false })
    }, [
      persistChanges,
      produtoId,
      produtoDetalhe,
      loadingProduto,
      onEmbedStateChange,
      onSelectionChange,
      lockedSet,
    ])

    useEffect(() => {
      setExpandedIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set<string>()
        for (const id of prev) {
          if (selectedIds.includes(id) || lockedSet.has(id)) next.add(id)
        }
        return next.size === prev.size ? prev : next
      })
    }, [selectedIds, lockedSet])

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
            m =>
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
        if (!checked && lockedSet.has(menu.id)) return
        const next = checked
          ? selectedIds.includes(menu.id)
            ? selectedIds
            : [...selectedIds, menu.id]
          : selectedIds.filter(id => id !== menu.id)
        const withLocked = [...new Set([...next, ...lockedSet])]
        setSelectedIds(withLocked)
        emitDirty(withLocked)
        if (!checked) {
          setExpandedIds(prev => {
            if (!prev.has(menu.id)) return prev
            const copy = new Set(prev)
            copy.delete(menu.id)
            return copy
          })
        }
      },
      [selectedIds, emitDirty, lockedSet]
    )

    const toggleExpand = useCallback((menuId: string) => {
      setExpandedIds(prev => {
        const next = new Set(prev)
        if (next.has(menuId)) next.delete(menuId)
        else next.add(menuId)
        return next
      })
    }, [])

    const save = useCallback(async (): Promise<boolean> => {
      const baseline = new Set(baselineIdsRef.current)
      const selected = new Set(selectedIds)
      const add = selectedIds.filter(id => !baseline.has(id))
      const remove = baselineIdsRef.current.filter(id => !selected.has(id) && !lockedSet.has(id))

      if (!onPersist && (!persistChanges || !produtoId)) {
        baselineIdsRef.current = selectedIds
        setBaselineIds(selectedIds)
        isDirtyRef.current = false
        onEmbedStateChange?.({ isDirty: false, isSaving: false })
        return true
      }

      if (add.length === 0 && remove.length === 0) return true

      emitDirty(selectedIds, true)
      setSavingLocal(true)
      try {
        if (onPersist) {
          await onPersist({ add, remove })
        } else {
          await mutation.mutateAsync({ add, remove })
        }
        baselineIdsRef.current = selectedIds
        setBaselineIds(selectedIds)
        isDirtyRef.current = false
        onEmbedStateChange?.({ isDirty: false, isSaving: false })
        showToast.success('Menus do produto atualizados')
        return true
      } catch (err) {
        emitDirty(selectedIds, false)
        showToast.error(err instanceof Error ? err.message : 'Erro ao salvar menus')
        return false
      } finally {
        setSavingLocal(false)
      }
    }, [
      persistChanges,
      produtoId,
      selectedIds,
      mutation,
      emitDirty,
      onEmbedStateChange,
      onPersist,
      lockedSet,
    ])

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => !sameIdSet(selectedIds, baselineIdsRef.current),
        save,
        getSelectedIds: () => [...new Set([...selectedIds, ...lockedSet])],
      }),
      [selectedIds, save, lockedSet]
    )

    const isLoading = loadingMenus || (persistChanges && loadingProduto)
    const isSaving = savingLocal || mutation.isPending
    const canShowSnapshot = Boolean(produtoId)

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
          {description
            ? description
            : persistChanges
              ? 'Marque os cardápios em que este produto deve aparecer. Expanda um vínculo já salvo para ver nome, preço e complementos naquele cardápio.'
              : lockedSet.size > 0
                ? 'Este cardápio já entra. Marque outros se quiser o produto em mais menus.'
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
              onChange={e => setSearchQuery(e.target.value)}
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
              const vinculado = selectedIds.includes(menu.id) || lockedSet.has(menu.id)
              const isPrincipal = menu.tipo === 'principal'
              const isLocked = lockedSet.has(menu.id)
              const snapshotDisponivel =
                canShowSnapshot && vinculado && persistedVinculoIds.has(menu.id)
              const isExpanded = snapshotDisponivel && expandedIds.has(menu.id)
              return (
                <li
                  key={menu.id}
                  className={cn(
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white',
                    !menu.ativo && 'opacity-70'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-1.5 hover:bg-secondary-text/10">
                    <div className="flex min-w-0 flex-1 items-start gap-1">
                      {snapshotDisponivel ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(menu.id)}
                          className="mt-0.5 shrink-0 rounded p-0.5 text-secondary-text hover:bg-black/5 hover:text-primary-text"
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Ocultar dados em ${menu.nome}`
                              : `Ver dados em ${menu.nome}`
                          }
                        >
                          <MdExpandMore
                            className={cn(
                              'h-5 w-5 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </button>
                      ) : (
                        <span className="mt-0.5 inline-block w-6 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-primary-text md:text-sm">
                          {menu.nome}
                        </p>
                        <p className="truncate text-[10px] text-secondary-text md:text-xs">
                          {isPrincipal ? 'Principal' : 'Personalizado'}
                          {isLocked ? ' · Neste cardápio' : ''}
                          {!menu.ativo ? ' · Inativo' : ''}
                          {vinculado &&
                          canShowSnapshot &&
                          !persistedVinculoIds.has(menu.id)
                            ? ' · Salve para ver os dados'
                            : ''}
                        </p>
                      </div>
                    </div>
                    <JiffyIconSwitch
                      checked={vinculado}
                      onChange={e => toggleMenu(menu, e.target.checked)}
                      label="Vínculo"
                      labelPosition="start"
                      size="xs"
                      disabled={isSaving || isLocked}
                      inputProps={{
                        'aria-label': vinculado
                          ? `Desvincular do menu ${menu.nome}`
                          : `Vincular ao menu ${menu.nome}`,
                      }}
                    />
                  </div>
                  {isExpanded && produtoId ? (
                    <div className="px-4 pb-2 pl-10">
                      <ProdutoMenuVinculoDetalhe
                        menuId={menu.id}
                        produtoId={produtoId}
                        enabled={isExpanded}
                      />
                    </div>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>
      </div>
    )
  }
)
