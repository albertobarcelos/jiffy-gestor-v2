'use client'

import type { RefObject } from 'react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import type { Produto } from '@/src/domain/entities/Produto'
import { FILTRO_COLUNA_TODOS, FILTRO_NCM_TODOS, LABEL_FILTRO_COLUNA, labelFiltroNcm } from '../constants'
import type { FiltroColunaVazia, TabPainelLote } from '../types'
import type { FiscalInlineEditApi } from '../hooks/useFiscalInlineEdit'
import { LoteProdutoRow } from './LoteProdutoRow'
import { COLUNAS_FISCAL_GRID, LAYOUT_GRID_FISCAL } from '../utils/fiscalLoteDisplay'

export interface LoteProdutosGridProps {
  listaAreaRef: RefObject<HTMLDivElement | null>
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>
  isLoading: boolean
  isLoadingMore: boolean
  hasMoreProdutos: boolean
  produtos: Produto[]
  produtosExibicao: Produto[]
  activeTab: TabPainelLote
  filtroColunaVazia: FiltroColunaVazia
  filtroNcm: string
  produtosSelecionados: Set<string>
  produtosExpandidos: Set<string>
  produtosAlteradosPorAba: Record<TabPainelLote, Set<string>>
  todosSelecionados: boolean
  algunsSelecionadosLista: boolean
  onToggleSelecionarTodos: (checked: boolean) => void
  onToggleSelecao: (produtoId: string) => void
  onToggleExpansao: (produtoId: string) => void
  fiscalInline: FiscalInlineEditApi
}

export function LoteProdutosGrid({
  listaAreaRef,
  loadMoreSentinelRef,
  isLoading,
  isLoadingMore,
  hasMoreProdutos,
  produtos,
  produtosExibicao,
  activeTab,
  filtroColunaVazia,
  filtroNcm,
  produtosSelecionados,
  produtosExpandidos,
  produtosAlteradosPorAba,
  todosSelecionados,
  algunsSelecionadosLista,
  onToggleSelecionarTodos,
  onToggleSelecao,
  onToggleExpansao,
  fiscalInline,
}: LoteProdutosGridProps) {
  return (
    <div ref={listaAreaRef} className="py-2">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <JiffyLoading />
        </div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary-text">Nenhum produto encontrado</p>
        </div>
      ) : produtosExibicao.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-secondary-text">
            {filtroNcm !== FILTRO_NCM_TODOS
              ? `Nenhum produto encontrado com o filtro “${labelFiltroNcm(filtroNcm)}”.`
              : filtroColunaVazia !== FILTRO_COLUNA_TODOS
                ? `Nenhum produto encontrado com o filtro “${LABEL_FILTRO_COLUNA[filtroColunaVazia]}”.`
                : 'Nenhum produto para exibir com o filtro atual.'}
          </p>
        </div>
      ) : (
        <div className={`bg-info rounded-lg overflow-hidden ${activeTab === 'fiscal' ? 'overflow-x-auto' : ''}`}>
          <div className={activeTab === 'fiscal' ? LAYOUT_GRID_FISCAL.minWidth : undefined}>
            <div
              className={`flex items-center h-11 md:px-4 px-2 text-xs font-semibold text-primary-text uppercase tracking-wide bg-custom-2 ${
                activeTab === 'fiscal' ? 'gap-1.5' : 'gap-2'
              }`}
            >
            <div className="flex-none md:w-10 w-6 flex justify-center">
              <Checkbox
                checked={todosSelecionados}
                indeterminate={algunsSelecionadosLista}
                onChange={(e) => onToggleSelecionarTodos(e.target.checked)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>
            <div
              className={`text-xs ${
                activeTab === 'fiscal'
                  ? `${LAYOUT_GRID_FISCAL.codigo} text-center`
                  : 'flex-1 md:w-14'
              }`}
            >
              Código
            </div>
            <div
              className={`text-xs ${
                activeTab === 'fiscal' ? `${LAYOUT_GRID_FISCAL.nome} min-w-0` : 'flex-[1.5]'
              }`}
            >
              Nome
            </div>
            {activeTab === 'impressoras' ? (
              <div className="flex-[1.2] text-center hidden md:flex">Impressoras</div>
            ) : null}
            {activeTab === 'gruposComplementos' ? (
              <div className="flex-[1.2] text-center hidden md:flex">Grupos Complementos</div>
            ) : null}
            {activeTab === 'fiscal'
              ? COLUNAS_FISCAL_GRID.map((col) => (
                  <div
                    key={col.id}
                    className={`hidden md:flex shrink-0 ${col.className} ${
                      col.align === 'left' ? 'text-left' : 'text-center'
                    } text-xs leading-tight px-0.5`}
                  >
                    {col.label}
                  </div>
                ))
              : null}
            {activeTab !== 'fiscal' ? (
              <div className="md:flex-1 text-right text-xs">Valor atual</div>
            ) : (
              <div
                className={`hidden md:block text-right text-xs ${LAYOUT_GRID_FISCAL.valor}`}
              >
                Valor atual
              </div>
            )}
            </div>

            <div className="flex flex-col gap-2 mt-2">
            {produtosExibicao
              .slice()
              .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
              .map((produto, index) => (
                <LoteProdutoRow
                  key={produto.getId()}
                  produto={produto}
                  index={index}
                  activeTab={activeTab}
                  isSelected={produtosSelecionados.has(produto.getId())}
                  foiAlteradoNaSessao={produtosAlteradosPorAba[activeTab].has(produto.getId())}
                  isExpanded={produtosExpandidos.has(produto.getId())}
                  onToggleSelecao={onToggleSelecao}
                  onToggleExpansao={onToggleExpansao}
                  fiscalInline={fiscalInline}
                />
              ))}
            {hasMoreProdutos ? (
              <div ref={loadMoreSentinelRef} className="h-2 w-full shrink-0" aria-hidden />
            ) : null}
            {isLoadingMore ? (
              <div className="flex justify-center py-3">
                <JiffyLoading />
              </div>
            ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
