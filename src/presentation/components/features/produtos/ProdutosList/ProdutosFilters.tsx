'use client'

import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'

export type StatusFilter = 'Todos' | 'Ativo' | 'Desativado'
export type TriState = 'Todos' | 'Sim' | 'Não'

interface ProdutosFiltersProps {
  filtrosVisiveis: boolean
  isMobile: boolean
  onToggleFiltros: () => void

  filterStatus: StatusFilter
  onFilterStatusChange: (v: StatusFilter) => void

  ativoLocalFilter: TriState
  onAtivoLocalChange: (v: TriState) => void

  ativoDeliveryFilter: TriState
  onAtivoDeliveryChange: (v: TriState) => void

  grupoProdutoFilter: string
  onGrupoProdutoChange: (v: string) => void
  gruposProdutos: GrupoProduto[]
  isLoadingGruposProdutos: boolean

  grupoComplementoFilter: string
  onGrupoComplementoChange: (v: string) => void
  gruposComplementos: GrupoComplemento[]
  isLoadingGruposComplementos: boolean

  onClearFilters: () => void
}

export function ProdutosFilters({
  filtrosVisiveis,
  isMobile,
  onToggleFiltros,
  filterStatus,
  onFilterStatusChange,
  ativoLocalFilter,
  onAtivoLocalChange,
  ativoDeliveryFilter,
  onAtivoDeliveryChange,
  grupoProdutoFilter,
  onGrupoProdutoChange,
  gruposProdutos,
  isLoadingGruposProdutos,
  grupoComplementoFilter,
  onGrupoComplementoChange,
  gruposComplementos,
  isLoadingGruposComplementos,
  onClearFilters,
}: ProdutosFiltersProps) {
  const selectClass =
    'w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito'

  return (
    <div className="bg-white px-1 md:py-2 border-b border-gray-100 flex-shrink-0">
      <div className="flex w-full sm:hidden justify-end items-center mt-2">
        <button
          type="button"
          onClick={onToggleFiltros}
          className="px-3 py-1 rounded-md bg-primary text-white text-xs font-nunito shadow-sm"
          aria-expanded={filtrosVisiveis}
        >
          {filtrosVisiveis ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      <div
        className={`hidden sm:flex flex-wrap items-end gap-2 ${
          isMobile && filtrosVisiveis ? '!flex' : ''
        }`}
      >
        <div className="w-full sm:w-[160px]">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value as StatusFilter)}
            className={selectClass}
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Desativado">Desativado</option>
          </select>
        </div>

        <div className="w-full sm:w-[160px]">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">Ativo no local</label>
          <select
            value={ativoLocalFilter}
            onChange={(e) => onAtivoLocalChange(e.target.value as TriState)}
            className={selectClass}
          >
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>

        <div className="w-full sm:w-[160px]">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">Ativo no delivery</label>
          <select
            value={ativoDeliveryFilter}
            onChange={(e) => onAtivoDeliveryChange(e.target.value as TriState)}
            className={selectClass}
          >
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>

        <div className="w-full sm:w-[220px]">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">
            Grupo de produtos
          </label>
          <select
            value={grupoProdutoFilter}
            onChange={(e) => onGrupoProdutoChange(e.target.value)}
            disabled={isLoadingGruposProdutos}
            className={`${selectClass} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <option value="">{isLoadingGruposProdutos ? 'Carregando...' : 'Todos'}</option>
            {!isLoadingGruposProdutos &&
              gruposProdutos.map((grupo) => (
                <option key={grupo.getId()} value={grupo.getId()}>
                  {grupo.getNome()}
                </option>
              ))}
          </select>
        </div>

        <div className="w-full sm:w-[220px]">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">
            Grupo de complementos
          </label>
          <select
            value={grupoComplementoFilter}
            onChange={(e) => onGrupoComplementoChange(e.target.value)}
            disabled={isLoadingGruposComplementos}
            className={`${selectClass} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <option value="">{isLoadingGruposComplementos ? 'Carregando...' : 'Todos'}</option>
            <option value="__none__">Nenhum</option>
            {!isLoadingGruposComplementos &&
              gruposComplementos.map((grupo) => (
                <option key={grupo.getId()} value={grupo.getId()}>
                  {grupo.getNome()}
                </option>
              ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={onClearFilters}
            className="h-8 px-5 rounded-lg border border-primary/50 text-sm font-semibold text-primary-text bg-white hover:bg-primary/10 transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  )
}
