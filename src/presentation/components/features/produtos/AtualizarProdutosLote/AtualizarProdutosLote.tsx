'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FILTRO_COLUNA_TODOS, FILTRO_NCM_TODOS } from './constants'
import type { FiltroColunaVazia, TabPainelLote } from './types'
import { filtrosDisponiveisPorAba } from './rules/produtosLoteFiltros'
import { useProdutosLoteInfinite } from './hooks/useProdutosLoteInfinite'
import { useImpressorasDisponiveis } from './hooks/useImpressorasDisponiveis'
import { useSelecaoProdutosLote } from './hooks/useSelecaoProdutosLote'
import { usePrecoLote } from './hooks/usePrecoLote'
import { useImpressorasLote } from './hooks/useImpressorasLote'
import { useGruposComplementosLote } from './hooks/useGruposComplementosLote'
import { usePermissoesLote } from './hooks/usePermissoesLote'
import { useFiscalLote } from './hooks/useFiscalLote'
import { useFiscalInlineEdit } from './hooks/useFiscalInlineEdit'
import { useLoteTabNavigation } from './hooks/useLoteTabNavigation'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useNcmsProdutosCadastrados } from './hooks/useNcmsProdutosCadastrados'
import {
  LoteFiltros,
  LoteHeaderTabs,
  LotePainelAcoes,
  LoteProdutosGrid,
  SalvandoOverlay,
} from './components'

/**
 * Atualização de produtos em lote (preços, impressoras, grupos de complementos,
 * permissões PDV e dados fiscais), com seleção múltipla e paginação infinita.
 */
export function AtualizarProdutosLote() {
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [ativoLocalFilter, setAtivoLocalFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [ativoDeliveryFilter, setAtivoDeliveryFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [grupoProdutoFilter, setGrupoProdutoFilter] = useState('')
  const [filtroColunaVazia, setFiltroColunaVazia] = useState<FiltroColunaVazia>(FILTRO_COLUNA_TODOS)
  const [filtroNcm, setFiltroNcm] = useState(FILTRO_NCM_TODOS)
  const [activeTab, setActiveTab] = useState<TabPainelLote>('precos')

  const produtosLoteFilters = useMemo(
    () => ({
      searchText,
      filterStatus,
      ativoLocalFilter,
      ativoDeliveryFilter,
      grupoProdutoFilter,
      filtroColunaVazia,
      filtroNcm,
    }),
    [searchText, filterStatus, ativoLocalFilter, ativoDeliveryFilter, grupoProdutoFilter, filtroColunaVazia, filtroNcm]
  )

  const {
    produtos,
    total,
    isLoading,
    isLoadingMore,
    hasMoreProdutos,
    buscarProdutos,
    atualizarProdutoFiscalLocal,
    listaAreaRef,
    loadMoreSentinelRef,
  } = useProdutosLoteInfinite(produtosLoteFilters)

  const { impressorasDisponiveis, isLoadingImpressoras } = useImpressorasDisponiveis(
    activeTab === 'impressoras'
  )

  const { data: gruposProdutos = [], isLoading: isLoadingGruposProdutos } = useGruposProdutos({
    limit: 100,
    ativo: null,
  })
  const { data: gruposComplementos = [], isLoading: isLoadingGruposComplementos } =
    useGruposComplementos({ limit: 100, ativo: null })
  const { data: ncmsCadastrados = [], isLoading: isLoadingNcmsCadastrados } =
    useNcmsProdutosCadastrados(activeTab === 'fiscal')

  const {
    produtosSelecionados,
    produtosExpandidos,
    produtosAlteradosPorAba,
    produtosExibicao,
    todosSelecionados,
    algunsSelecionadosLista,
    toggleSelecao,
    toggleExpansao,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    handleToggleSelecionarTodos,
  } = useSelecaoProdutosLote({ produtos, activeTab })

  const precoLote = usePrecoLote({
    produtos,
    produtosSelecionados,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    buscarProdutos,
  })

  const impressorasLote = useImpressorasLote({
    produtos,
    produtosSelecionados,
    impressorasDisponiveis,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    buscarProdutos,
  })

  const gruposLote = useGruposComplementosLote({
    produtos,
    produtosSelecionados,
    gruposComplementos,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    buscarProdutos,
  })

  const permissoesLote = usePermissoesLote({
    produtosSelecionados,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    buscarProdutos,
  })

  const fiscalLote = useFiscalLote({
    activeTab,
    produtos,
    produtosSelecionados,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    buscarProdutos,
  })

  const fiscalInline = useFiscalInlineEdit({
    activeTab,
    produtos,
    marcarProdutosAlteradosNaSessao,
    atualizarProdutoFiscalLocal,
  })

  useEffect(() => {
    setFiltroColunaVazia((prev) =>
      filtrosDisponiveisPorAba(activeTab).includes(prev) ? prev : FILTRO_COLUNA_TODOS
    )
    if (activeTab !== 'fiscal') {
      setFiltroNcm(FILTRO_NCM_TODOS)
    }
  }, [activeTab])

  const isUpdating =
    precoLote.isUpdating || impressorasLote.isUpdating || gruposLote.isUpdating

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setFilterStatus('Ativo')
    setAtivoLocalFilter('Todos')
    setAtivoDeliveryFilter('Todos')
    setGrupoProdutoFilter('')
    setFiltroColunaVazia(FILTRO_COLUNA_TODOS)
    setFiltroNcm(FILTRO_NCM_TODOS)
  }, [])

  const handleTabChange = useLoteTabNavigation(activeTab, setActiveTab, {
    limparFormularioPreco: precoLote.limparFormulario,
    limparSelecaoImpressoras: impressorasLote.limparSelecaoImpressoras,
    limparSelecaoGrupos: gruposLote.limparSelecaoGrupos,
    resetImpressorasAoEntrarNaAba: impressorasLote.resetAoEntrarNaAba,
    resetGruposAoEntrarNaAba: gruposLote.resetAoEntrarNaAba,
    resetPermissoesAoEntrarNaAba: permissoesLote.resetAoEntrarNaAba,
    resetFiscalDraft: fiscalLote.resetDraft,
  })

  const produtosSelecionadosCount = produtosSelecionados.size

  return (
    <div className="flex flex-col bg-info">
      <LoteHeaderTabs
        activeTab={activeTab}
        total={total}
        produtosSelecionadosCount={produtosSelecionadosCount}
        filtroColunaVazia={filtroColunaVazia}
        filtroNcm={filtroNcm}
        onTabChange={handleTabChange}
      />

      <div className="bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-2">
        <LotePainelAcoes
          activeTab={activeTab}
          isUpdating={isUpdating}
          produtosSelecionadosCount={produtosSelecionadosCount}
          precoLote={precoLote}
          impressorasLote={impressorasLote}
          impressorasDisponiveis={impressorasDisponiveis}
          isLoadingImpressoras={isLoadingImpressoras}
          gruposLote={gruposLote}
          gruposComplementos={gruposComplementos}
          isLoadingGruposComplementos={isLoadingGruposComplementos}
          permissoesLote={permissoesLote}
          fiscalLote={fiscalLote}
        />
      </div>

      <LoteFiltros
        activeTab={activeTab}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        ativoLocalFilter={ativoLocalFilter}
        onAtivoLocalFilterChange={setAtivoLocalFilter}
        ativoDeliveryFilter={ativoDeliveryFilter}
        onAtivoDeliveryFilterChange={setAtivoDeliveryFilter}
        grupoProdutoFilter={grupoProdutoFilter}
        onGrupoProdutoFilterChange={setGrupoProdutoFilter}
        filtroColunaVazia={filtroColunaVazia}
        onFiltroColunaVaziaChange={setFiltroColunaVazia}
        filtroNcm={filtroNcm}
        onFiltroNcmChange={setFiltroNcm}
        ncmsCadastrados={ncmsCadastrados}
        isLoadingNcmsCadastrados={isLoadingNcmsCadastrados}
        gruposProdutos={gruposProdutos}
        isLoadingGruposProdutos={isLoadingGruposProdutos}
        onClearFilters={handleClearFilters}
      />

      <LoteProdutosGrid
        listaAreaRef={listaAreaRef}
        loadMoreSentinelRef={loadMoreSentinelRef}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMoreProdutos={hasMoreProdutos}
        produtos={produtos}
        produtosExibicao={produtosExibicao}
        activeTab={activeTab}
        filtroColunaVazia={filtroColunaVazia}
        filtroNcm={filtroNcm}
        produtosSelecionados={produtosSelecionados}
        produtosExpandidos={produtosExpandidos}
        produtosAlteradosPorAba={produtosAlteradosPorAba}
        todosSelecionados={todosSelecionados}
        algunsSelecionadosLista={algunsSelecionadosLista}
        onToggleSelecionarTodos={handleToggleSelecionarTodos}
        onToggleSelecao={toggleSelecao}
        onToggleExpansao={toggleExpansao}
        fiscalInline={fiscalInline}
      />

      <SalvandoOverlay
        isSalvandoPermissoes={permissoesLote.isSalvandoPermissoes}
        isSalvandoFiscal={fiscalLote.isSalvandoFiscal}
        salvandoPermissoesProgresso={permissoesLote.salvandoPermissoesProgresso}
        salvandoFiscalProgresso={fiscalLote.salvandoFiscalProgresso}
      />
    </div>
  )
}
