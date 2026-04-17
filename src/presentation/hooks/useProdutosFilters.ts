'use client'

import { useReducer, useMemo, useEffect, useRef, useCallback } from 'react'
import type { StatusFilter, TriState } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutosFilters'

interface FiltersState {
  searchText: string
  debouncedSearch: string
  filterStatus: StatusFilter
  ativoLocalFilter: TriState
  ativoDeliveryFilter: TriState
  grupoProdutoFilter: string
  grupoComplementoFilter: string
  limit: number
}

type FiltersAction =
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; value: string }
  | { type: 'SET_STATUS'; value: StatusFilter }
  | { type: 'SET_ATIVO_LOCAL'; value: TriState }
  | { type: 'SET_ATIVO_DELIVERY'; value: TriState }
  | { type: 'SET_GRUPO_PRODUTO'; value: string }
  | { type: 'SET_GRUPO_COMPLEMENTO'; value: string }
  | { type: 'RESET' }

const initialState: FiltersState = {
  searchText: '',
  debouncedSearch: '',
  filterStatus: 'Ativo',
  ativoLocalFilter: 'Todos',
  ativoDeliveryFilter: 'Todos',
  grupoProdutoFilter: '',
  grupoComplementoFilter: '',
  limit: 100,
}

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchText: action.value }
    case 'SET_DEBOUNCED_SEARCH':
      return { ...state, debouncedSearch: action.value }
    case 'SET_STATUS':
      return { ...state, filterStatus: action.value }
    case 'SET_ATIVO_LOCAL':
      return { ...state, ativoLocalFilter: action.value }
    case 'SET_ATIVO_DELIVERY':
      return { ...state, ativoDeliveryFilter: action.value }
    case 'SET_GRUPO_PRODUTO':
      return { ...state, grupoProdutoFilter: action.value }
    case 'SET_GRUPO_COMPLEMENTO':
      return { ...state, grupoComplementoFilter: action.value }
    case 'RESET':
      return { ...initialState, debouncedSearch: '' }
    default:
      return state
  }
}

/**
 * Centraliza todos os filtros da lista de produtos em um único reducer com debounce de busca.
 */
export function useProdutosFilters() {
  const [state, dispatch] = useReducer(filtersReducer, initialState)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      dispatch({ type: 'SET_DEBOUNCED_SEARCH', value: state.searchText })
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [state.searchText])

  const ativoFilter = useMemo<boolean | null>(() => {
    if (state.filterStatus === 'Ativo') return true
    if (state.filterStatus === 'Desativado') return false
    return null
  }, [state.filterStatus])

  const ativoLocalBoolean = useMemo<boolean | null>(() => {
    if (state.ativoLocalFilter === 'Sim') return true
    if (state.ativoLocalFilter === 'Não') return false
    return null
  }, [state.ativoLocalFilter])

  const ativoDeliveryBoolean = useMemo<boolean | null>(() => {
    if (state.ativoDeliveryFilter === 'Sim') return true
    if (state.ativoDeliveryFilter === 'Não') return false
    return null
  }, [state.ativoDeliveryFilter])

  const queryParams = useMemo(
    () => ({
      name: state.debouncedSearch || undefined,
      ativo: ativoFilter,
      ativoLocal: ativoLocalBoolean,
      ativoDelivery: ativoDeliveryBoolean,
      grupoProdutoId: state.grupoProdutoFilter || undefined,
      grupoComplementosId:
        state.grupoComplementoFilter === '__none__' ? undefined : state.grupoComplementoFilter || undefined,
      limit: state.limit,
    }),
    [state.debouncedSearch, ativoFilter, ativoLocalBoolean, ativoDeliveryBoolean, state.grupoProdutoFilter, state.grupoComplementoFilter, state.limit]
  )

  // `dispatch` é estável (garantia do useReducer), portanto essas funções também são estáveis.
  const setSearch = useCallback((value: string) => dispatch({ type: 'SET_SEARCH', value }), [])
  const setStatus = useCallback((value: StatusFilter) => dispatch({ type: 'SET_STATUS', value }), [])
  const setAtivoLocal = useCallback((value: TriState) => dispatch({ type: 'SET_ATIVO_LOCAL', value }), [])
  const setAtivoDelivery = useCallback((value: TriState) => dispatch({ type: 'SET_ATIVO_DELIVERY', value }), [])
  const setGrupoProduto = useCallback((value: string) => dispatch({ type: 'SET_GRUPO_PRODUTO', value }), [])
  const setGrupoComplemento = useCallback((value: string) => dispatch({ type: 'SET_GRUPO_COMPLEMENTO', value }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const actions = useMemo(
    () => ({ setSearch, setStatus, setAtivoLocal, setAtivoDelivery, setGrupoProduto, setGrupoComplemento, reset }),
    [setSearch, setStatus, setAtivoLocal, setAtivoDelivery, setGrupoProduto, setGrupoComplemento, reset]
  )

  return {
    state,
    dispatch,
    queryParams,
    filterStatus: state.filterStatus,
    actions,
  }
}
