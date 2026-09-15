'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { StatusFilter, TriState } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutosFilters'
import type { MenuProdutoTipoFiltro } from '@/src/domain/repositories/IMenuRepository'

interface State {
  searchText: string
  debouncedSearch: string
  filterStatus: StatusFilter
  favoritoFilter: TriState
  grupoProdutoId: string
  grupoComplementosId: string
  tipo: MenuProdutoTipoFiltro
}

type Action =
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; value: string }
  | { type: 'SET_STATUS'; value: StatusFilter }
  | { type: 'SET_FAVORITO'; value: TriState }
  | { type: 'SET_GRUPO'; value: string }
  | { type: 'SET_GRUPO_COMPLEMENTO'; value: string }
  | { type: 'SET_TIPO'; value: MenuProdutoTipoFiltro }
  | { type: 'RESET' }

const initialState: State = {
  searchText: '',
  debouncedSearch: '',
  filterStatus: 'Todos',
  favoritoFilter: 'Todos',
  grupoProdutoId: '',
  grupoComplementosId: '',
  tipo: 'all',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchText: action.value }
    case 'SET_DEBOUNCED_SEARCH':
      return { ...state, debouncedSearch: action.value }
    case 'SET_STATUS':
      return { ...state, filterStatus: action.value }
    case 'SET_FAVORITO':
      return { ...state, favoritoFilter: action.value }
    case 'SET_GRUPO':
      return { ...state, grupoProdutoId: action.value }
    case 'SET_GRUPO_COMPLEMENTO':
      return { ...state, grupoComplementosId: action.value }
    case 'SET_TIPO':
      return { ...state, tipo: action.value }
    case 'RESET':
      return { ...initialState, debouncedSearch: '' }
    default:
      return state
  }
}

function triParaBoolean(v: TriState): boolean | null {
  if (v === 'Sim') return true
  if (v === 'Não') return false
  return null
}

/** Filtros do GET `/menus/:id/produtos` (q, ativo, favorito, grupo, complementos, tipo). */
export function useMenuProdutosFilters() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      dispatch({ type: 'SET_DEBOUNCED_SEARCH', value: state.searchText })
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [state.searchText])

  const ativo = useMemo<boolean | null>(() => {
    if (state.filterStatus === 'Ativo') return true
    if (state.filterStatus === 'Desativado') return false
    return null
  }, [state.filterStatus])

  const favorito = useMemo(() => triParaBoolean(state.favoritoFilter), [state.favoritoFilter])

  const query = useMemo(
    () => ({
      q: state.debouncedSearch.trim(),
      ativo,
      favorito,
      grupoProdutoId: state.grupoProdutoId || undefined,
      grupoComplementosId: state.grupoComplementosId || undefined,
      tipo: state.tipo,
    }),
    [state.debouncedSearch, ativo, favorito, state.grupoProdutoId, state.grupoComplementosId, state.tipo]
  )

  const temFiltroAtivo = Boolean(
    query.q ||
      query.ativo !== null ||
      query.favorito !== null ||
      query.grupoProdutoId ||
      query.grupoComplementosId ||
      query.tipo !== 'all'
  )

  const setSearch = useCallback((value: string) => dispatch({ type: 'SET_SEARCH', value }), [])
  const setStatus = useCallback((value: StatusFilter) => dispatch({ type: 'SET_STATUS', value }), [])
  const setFavorito = useCallback((value: TriState) => dispatch({ type: 'SET_FAVORITO', value }), [])
  const setGrupo = useCallback((value: string) => dispatch({ type: 'SET_GRUPO', value }), [])
  const setGrupoComplemento = useCallback(
    (value: string) => dispatch({ type: 'SET_GRUPO_COMPLEMENTO', value }),
    []
  )
  const setTipo = useCallback((value: MenuProdutoTipoFiltro) => dispatch({ type: 'SET_TIPO', value }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    state,
    query,
    temFiltroAtivo,
    actions: {
      setSearch,
      setStatus,
      setFavorito,
      setGrupo,
      setGrupoComplemento,
      setTipo,
      reset,
    },
  }
}
