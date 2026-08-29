'use client'

import { MenuReorderSortableColumn } from '@/src/presentation/components/features/menus/reorder/MenuReorderSortableColumn'
import { MenuReorderSortableRow } from '@/src/presentation/components/features/menus/reorder/MenuReorderSortableRow'
import type { usePizzaReorderState } from './usePizzaReorderState'

export type PizzaReorderState = ReturnType<typeof usePizzaReorderState>

type PizzaReorderMillerColumnsProps = {
  state: PizzaReorderState
}

export function PizzaReorderMillerColumns({ state }: PizzaReorderMillerColumnsProps) {
  const categoriaIds = state.categorias.map(c => c.id)
  const saborIds = state.saboresAtivos.map(s => s.id)

  if (state.loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-600">
        {state.loadError}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex min-h-[320px] min-w-[560px] flex-1">
          <MenuReorderSortableColumn
            title="Categorias"
            itemIds={categoriaIds}
            isLoading={state.loadingCatalog}
            emptyLabel="Nenhuma categoria pizza cadastrada"
            onDragEnd={state.handleDragEndCategorias}
          >
            {state.categorias.map(categoria => (
              <MenuReorderSortableRow
                key={categoria.id}
                id={categoria.id}
                label={state.categoriaPizzaLabel(categoria)}
                isSelected={state.selectedCategoriaId === categoria.id}
                onSelect={state.handleSelectCategoria}
              />
            ))}
          </MenuReorderSortableColumn>

          <MenuReorderSortableColumn
            title="Sabores"
            itemIds={saborIds}
            isLoading={state.loadingCatalog || state.loadingSabores}
            emptyLabel={
              state.selectedCategoriaId
                ? 'Nenhum sabor nesta categoria'
                : 'Selecione uma categoria'
            }
            onDragEnd={state.handleDragEndSabores}
          >
            {state.saboresAtivos.map(sabor => (
              <MenuReorderSortableRow
                key={sabor.id}
                id={sabor.id}
                label={state.saborPizzaLabel(sabor)}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </MenuReorderSortableColumn>
        </div>
      </div>
    </div>
  )
}
