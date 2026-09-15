'use client'

import { useReducer, useMemo, useEffect, useRef, useCallback } from 'react'
import type { StatusFilter } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutosFilters'
import { produtosInfiniteQueryParams } from '@/src/presentation/hooks/useProdutos'

interface FiltersState {
  searchText: string
  debouncedSearch: string
  filterStatus: StatusFilter
  statusGrupoFilter: StatusFilter
  grupoProdutoFilter: string[]
  grupoComplementoFilter: string
  limit: number
}

type FiltersAction =
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; value: string }
  | { type: 'SET_STATUS'; value: StatusFilter }
  | { type: 'SET_STATUS_GRUPO'; value: StatusFilter }
  | { type: 'SET_GRUPO_PRODUTO'; value: string[] }
  | { type: 'SET_GRUPO_COMPLEMENTO'; value: string }
  | { type: 'RESET' }

const initialState: FiltersState = {
  searchText: '',
  debouncedSearch: '',
  filterStatus: 'Ativo',
  statusGrupoFilter: 'Todos',
  grupoProdutoFilter: [],
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
    case 'SET_STATUS_GRUPO':
      return { ...state, statusGrupoFilter: action.value, grupoProdutoFilter: [] }
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

  const queryParams = useMemo(
    () =>
      produtosInfiniteQueryParams({
        name: state.debouncedSearch || undefined,
        ativo: ativoFilter,
        grupoProdutoId:
          state.grupoProdutoFilter.length === 1 ? state.grupoProdutoFilter[0] : undefined,
        grupoComplementosId:
          state.grupoComplementoFilter === '__none__'
            ? undefined
            : state.grupoComplementoFilter || undefined,
        limit: state.limit,
      }),
    [
      state.debouncedSearch,
      ativoFilter,
      state.grupoProdutoFilter,
      state.grupoComplementoFilter,
      state.limit,
    ]
  )

  const setSearch = useCallback((value: string) => dispatch({ type: 'SET_SEARCH', value }), [])
  const setStatus = useCallback((value: StatusFilter) => dispatch({ type: 'SET_STATUS', value }), [])
  const setStatusGrupo = useCallback(
    (value: StatusFilter) => dispatch({ type: 'SET_STATUS_GRUPO', value }),
    []
  )
  const setGrupoProduto = useCallback(
    (value: string[]) => dispatch({ type: 'SET_GRUPO_PRODUTO', value }),
    []
  )
  const setGrupoComplemento = useCallback(
    (value: string) => dispatch({ type: 'SET_GRUPO_COMPLEMENTO', value }),
    []
  )
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const actions = useMemo(
    () => ({
      setSearch,
      setStatus,
      setStatusGrupo,
      setGrupoProduto,
      setGrupoComplemento,
      reset,
    }),
    [setSearch, setStatus, setStatusGrupo, setGrupoProduto, setGrupoComplemento, reset]
  )

  return {
    state,
    dispatch,
    queryParams,
    filterStatus: state.filterStatus,
    actions,
  }
}
