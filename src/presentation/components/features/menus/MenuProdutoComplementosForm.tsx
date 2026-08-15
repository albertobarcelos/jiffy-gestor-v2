'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { MdSearch } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type { MenuProduto } from '@/src/shared/types/menus'

export type MenuProdutoComplementosHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface MenuProdutoComplementosFormProps {
  menuId: string
  produto: MenuProduto
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
}

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export const MenuProdutoComplementosForm = forwardRef<
  MenuProdutoComplementosHandle,
  MenuProdutoComplementosFormProps
>(function MenuProdutoComplementosForm(
  { menuId, produto, onDirtyChange, onSavingChange },
  ref
) {
  const { updateProduto } = useMenuMutations(menuId)
  const { data: grupos = [], isLoading } = useGruposComplementos({
    limit: 100,
    ativo: true,
  })
  const baseline = useMemo(
    () => (produto.gruposComplementos ?? []).map(g => g.id).filter(Boolean),
    [produto.gruposComplementos]
  )
  const [selectedIds, setSelectedIds] = useState<string[]>(baseline)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setSelectedIds(baseline)
  }, [baseline, produto.produtoId])

  const isDirty = useCallback(
    () => !sameIdSet(selectedIds, baseline),
    [selectedIds, baseline]
  )

  useEffect(() => {
    onDirtyChange?.(isDirty())
  }, [isDirty, onDirtyChange])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? grupos.filter(g => g.getNome().toLowerCase().includes(q))
      : grupos
    const selected = new Set(selectedIds)
    return [...list].sort((a, b) => {
      const va = selected.has(a.getId()) ? 1 : 0
      const vb = selected.has(b.getId()) ? 1 : 0
      if (va !== vb) return vb - va
      return a.getNome().localeCompare(b.getNome(), 'pt-BR', { sensitivity: 'base' })
    })
  }, [grupos, search, selectedIds])

  const save = useCallback(async () => {
    onSavingChange?.(true)
    try {
      await updateProduto.mutateAsync({
        produtoId: produto.produtoId,
        input: { gruposComplementosIds: selectedIds },
      })
      showToast.success('Complementos atualizados neste cardápio')
      return true
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar complementos')
      return false
    } finally {
      onSavingChange?.(false)
    }
  }, [produto.produtoId, selectedIds, updateProduto, onSavingChange])

  useImperativeHandle(ref, () => ({ isDirty, save }), [isDirty, save])

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="shrink-0 px-4 pt-3 text-xs text-secondary-text">
        Os grupos marcados valem só neste cardápio. Alterar aqui não muda o cadastro do produto.
      </p>
      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <MdSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={18}
          />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar grupo de complementos"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-primary-text outline-none ring-primary focus:ring-2"
          />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-secondary-text">
            Nenhum grupo de complementos encontrado.
          </li>
        ) : (
          filtered.map((grupo, index) => {
            const vinculado = selectedIds.includes(grupo.getId())
            return (
              <li
                key={grupo.getId()}
                className={cn(
                  'flex items-center justify-between gap-2 px-4 py-1.5 hover:bg-secondary-text/10',
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                )}
              >
                <p className="min-w-0 truncate text-xs font-medium text-primary-text md:text-sm">
                  {grupo.getNome()}
                </p>
                <JiffyIconSwitch
                  checked={vinculado}
                  onChange={e => {
                    const checked = e.target.checked
                    setSelectedIds(prev =>
                      checked
                        ? prev.includes(grupo.getId())
                          ? prev
                          : [...prev, grupo.getId()]
                        : prev.filter(id => id !== grupo.getId())
                    )
                  }}
                  label="Vínculo"
                  labelPosition="start"
                  size="xs"
                  inputProps={{
                    'aria-label': vinculado
                      ? `Desvincular ${grupo.getNome()}`
                      : `Vincular ${grupo.getNome()}`,
                  }}
                />
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
})
