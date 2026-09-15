'use client'

import { MenuReorderSortableColumn } from './MenuReorderSortableColumn'
import { MenuReorderSortableRow } from './MenuReorderSortableRow'
import type { useMenuReorderCardapioState } from './useMenuReorderCardapioState'

export type MenuReorderCardapioState = ReturnType<typeof useMenuReorderCardapioState>

type MenuReorderMillerColumnsProps = {
  state: MenuReorderCardapioState
}

export function MenuReorderMillerColumns({ state }: MenuReorderMillerColumnsProps) {
  const categoriaIds = state.categorias.map(g => state.grupoBaseId(g))
  const produtoIds = state.produtosAtivos.map(p => p.produtoId)
  const grupoComplementoIds = state.gruposComplemento.map(g => g.id)

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
        <div className="flex min-h-[320px] min-w-[880px] flex-1">
          <MenuReorderSortableColumn
            title="Categorias"
            itemIds={categoriaIds}
            isLoading={state.loadingCatalog}
            emptyLabel="Nenhuma categoria neste cardápio"
            onDragEnd={state.handleDragEndCategorias}
          >
            {state.categorias.map(grupo => {
              const id = state.grupoBaseId(grupo)
              return (
                <MenuReorderSortableRow
                  key={id}
                  id={id}
                  label={state.categoriaLabel(grupo)}
                  isSelected={state.selectedGrupoId === id}
                  onSelect={state.handleSelectGrupo}
                />
              )
            })}
          </MenuReorderSortableColumn>

          <MenuReorderSortableColumn
            title="Items"
            itemIds={produtoIds}
            isLoading={state.loadingCatalog || state.loadingProdutos}
            emptyLabel={
              state.selectedGrupoId ? 'Nenhum produto nesta categoria' : 'Selecione uma categoria'
            }
            onDragEnd={state.handleDragEndProdutos}
          >
            {state.produtosAtivos.map(produto => (
              <MenuReorderSortableRow
                key={produto.produtoId}
                id={produto.produtoId}
                label={state.produtoLabel(produto)}
                isSelected={state.selectedProdutoId === produto.produtoId}
                onSelect={state.handleSelectProduto}
              />
            ))}
          </MenuReorderSortableColumn>

          <MenuReorderSortableColumn
            title="Grupos de complementos"
            itemIds={grupoComplementoIds}
            emptyLabel={
              state.selectedProdutoId
                ? 'Nenhum grupo de complemento neste produto'
                : 'Selecione um produto'
            }
            readOnly
          >
            {state.gruposComplemento.map(grupo => (
              <MenuReorderSortableRow
                key={grupo.id}
                id={grupo.id}
                label={grupo.nome}
                isSelected={state.selectedGrupoComplementoId === grupo.id}
                disabled
                onSelect={state.handleSelectGrupoComplemento}
              />
            ))}
          </MenuReorderSortableColumn>

          <MenuReorderSortableColumn
            title="Complementos"
            itemIds={state.complementosDoGrupo.map(c => c.id)}
            isLoading={state.loadingComplementos}
            emptyLabel={
              state.selectedGrupoComplementoId
                ? 'Nenhum complemento neste grupo'
                : 'Selecione um grupo de complementos'
            }
            readOnly
          >
            {state.complementosDoGrupo.map(complemento => (
              <MenuReorderSortableRow
                key={complemento.id}
                id={complemento.id}
                label={complemento.nome}
                isSelected={false}
                disabled
                onSelect={() => {}}
              />
            ))}
          </MenuReorderSortableColumn>
        </div>
      </div>
    </div>
  )
}
