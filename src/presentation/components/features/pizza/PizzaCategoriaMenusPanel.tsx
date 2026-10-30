'use client'

import { useMemo, useState } from 'react'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import {
  useDesvincularPizzaCategoriaDoMenuMutation,
  usePizzaCategoriaMenusVinculos,
  useVincularPizzaCategoriaAoMenuMutation,
} from '@/src/presentation/hooks/pizza/useVincularPizzaCategoriaMenus'
import { showToast } from '@/src/shared/utils/toast'
import type { Menu } from '@/src/shared/types/menus'

const MENUS_VAZIOS: Menu[] = []

interface PizzaCategoriaMenusPanelProps {
  categoriaId: string
  categoriaNome?: string
  /** Cardápio atual (ex.: menu aberto no editor) — destacado e não desvinculável se locked. */
  lockedMenuId?: string
  onChanged?: () => void
}

export function PizzaCategoriaMenusPanel({
  categoriaId,
  categoriaNome,
  lockedMenuId,
  onChanged,
}: PizzaCategoriaMenusPanelProps) {
  const { data: menusData, isLoading: loadingMenus } = useMenus({ limit: 100, ativo: true })
  const menus = menusData?.items ?? MENUS_VAZIOS
  const menuIds = useMemo(() => menus.map(m => m.id), [menus])

  const vinculosQuery = usePizzaCategoriaMenusVinculos(
    categoriaId,
    menuIds,
    !loadingMenus && menuIds.length > 0
  )
  const vincularMutation = useVincularPizzaCategoriaAoMenuMutation()
  const desvincularMutation = useDesvincularPizzaCategoriaDoMenuMutation()

  const [optimisticLinked, setOptimisticLinked] = useState<string[] | null>(null)
  const linkedMenuIds = optimisticLinked ?? vinculosQuery.data?.linkedMenuIds ?? []
  const saboresCount = vinculosQuery.data?.saboresCount ?? 0
  const savingMenuId =
    vincularMutation.isPending || desvincularMutation.isPending
      ? (vincularMutation.variables?.menuId ?? desvincularMutation.variables?.menuId ?? null)
      : null

  const handleToggle = async (menuId: string, nextLinked: boolean) => {
    if (lockedMenuId && menuId === lockedMenuId && !nextLinked) {
      showToast.error('Esta categoria não pode ser removida do cardápio atual por aqui')
      return
    }

    const previous = linkedMenuIds
    setOptimisticLinked(
      nextLinked
        ? previous.includes(menuId)
          ? previous
          : [...previous, menuId]
        : previous.filter(id => id !== menuId)
    )

    try {
      if (nextLinked) {
        await vincularMutation.mutateAsync({ menuId, categoriaPizzaId: categoriaId })
        showToast.success('Categoria vinculada ao cardápio')
      } else {
        await desvincularMutation.mutateAsync({ menuId, categoriaPizzaId: categoriaId })
        showToast.success('Categoria removida do cardápio')
      }
      onChanged?.()
    } catch (error) {
      setOptimisticLinked(previous)
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar cardápio')
    } finally {
      setOptimisticLinked(null)
    }
  }

  if (loadingMenus || vinculosQuery.isLoading) {
    return <JiffyLoading text="Carregando cardápios..." className="py-8" />
  }

  if (menus.length === 0) {
    return (
      <p className="p-6 text-sm text-secondary-text">
        Nenhum cardápio ativo encontrado. Crie um menu em Cardápios antes de vincular.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <p className="text-sm text-secondary-text">
          Escolha em quais cardápios a categoria{' '}
          <span className="font-medium text-primary-text">{categoriaNome || 'pizza'}</span> aparece.
          Todos os sabores ativos serão vinculados ao marcar um cardápio.
        </p>
        {saboresCount === 0 ? (
          <p className="mt-2 text-xs text-amber-700">
            Cadastre ao menos um sabor ativo para vincular esta categoria a um cardápio.
          </p>
        ) : null}
      </div>

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {menus.map(menu => {
          const linked = linkedMenuIds.includes(menu.id)
          const isLocked = lockedMenuId === menu.id
          const disabled = savingMenuId === menu.id || (saboresCount === 0 && !linked)

          return (
            <li
              key={menu.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary-text">{menu.nome}</p>
                <p className="text-xs text-secondary-text">
                  {menu.tipo === 'principal' ? 'Cardápio principal' : 'Cardápio customizado'}
                  {isLocked ? ' · cardápio atual' : ''}
                </p>
              </div>
              <JiffyIconSwitch
                checked={linked}
                disabled={disabled}
                onChange={e => void handleToggle(menu.id, e.target.checked)}
                aria-label={
                  linked
                    ? `Remover ${categoriaNome ?? 'categoria'} do cardápio ${menu.nome}`
                    : `Vincular ${categoriaNome ?? 'categoria'} ao cardápio ${menu.nome}`
                }
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
