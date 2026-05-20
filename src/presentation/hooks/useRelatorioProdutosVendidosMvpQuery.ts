'use client'



import {

  keepPreviousData,

  useInfiniteQuery,

  useQuery,

  type InfiniteData,

} from '@tanstack/react-query'

import { useAuthStore } from '@/src/presentation/stores/authStore'

import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

import type { RelatorioProdutosVendidosSort } from '@/src/shared/types/relatoriosProdutosVendidosApi'

import type {

  RelatorioProdutosVendidosMvpComparativoDTO,

  RelatorioProdutosVendidosMvpResponseDTO,

} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'



export const RELATORIO_MVP_LIST_PAGE_SIZE = 50



export type RelatorioProdutosVendidosMvpQueryParams = {

  periodo: string

  periodoInicial?: Date | null

  periodoFinal?: Date | null

  timezone?: string

  sort: RelatorioProdutosVendidosSort

  grupoIds: string[]

  valorMin: string

  valorMax: string

  qtdMin: string

  qtdMax: string

  buscaNome: string

  limit: number

  offset: number

  enabled?: boolean

  /** Quando false, BFF não busca o período anterior (carga inicial mais rápida). */

  incluirComparativo?: boolean

}



function appendFiltrosRelatorioMvp(

  search: URLSearchParams,

  params: Pick<

    RelatorioProdutosVendidosMvpQueryParams,

    | 'periodo'

    | 'periodoInicial'

    | 'periodoFinal'

    | 'sort'

    | 'grupoIds'

    | 'valorMin'

    | 'valorMax'

    | 'qtdMin'

    | 'qtdMax'

    | 'buscaNome'

    | 'limit'

    | 'offset'

    | 'incluirComparativo'

  >

) {

  search.append('periodo', params.periodo)

  search.append('sort', params.sort)

  search.append('limit', String(params.limit))

  search.append('offset', String(params.offset))



  if (params.incluirComparativo === false) {

    search.append('comparativo', '0')

  }

  if (params.offset > 0) {

    search.append('somentePagina', '1')

  }



  if (params.periodoInicial && params.periodoFinal) {

    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())

    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())

  }

  if (params.grupoIds.length > 0) {

    search.append('grupoIds', params.grupoIds.join(','))

  }

  const vmin = params.valorMin.trim()

  const vmax = params.valorMax.trim()

  const qmin = params.qtdMin.trim()

  const qmax = params.qtdMax.trim()

  if (vmin) search.append('valorMin', vmin)

  if (vmax) search.append('valorMax', vmax)

  if (qmin) search.append('qtdMin', qmin)

  if (qmax) search.append('qtdMax', qmax)

  const q = params.buscaNome.trim()

  if (q) search.append('q', q)

}



async function fetchRelatorioMvp(

  params: RelatorioProdutosVendidosMvpQueryParams & { token: string; timezone: string }

): Promise<RelatorioProdutosVendidosMvpResponseDTO> {

  const search = new URLSearchParams()

  search.append('timezone', params.timezone)

  appendFiltrosRelatorioMvp(search, params)



  const response = await fetch(`/api/relatorios/produtos-vendidos/mvp?${search.toString()}`, {

    headers: { Authorization: `Bearer ${params.token}` },

  })

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {

    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar relatório MVP.'

    throw new Error(msg)

  }

  return data as unknown as RelatorioProdutosVendidosMvpResponseDTO

}



async function fetchRelatorioMvpComparativo(

  params: Omit<RelatorioProdutosVendidosMvpQueryParams, 'limit' | 'offset'> & {

    token: string

    timezone: string

  }

): Promise<RelatorioProdutosVendidosMvpComparativoDTO> {

  const search = new URLSearchParams()

  search.append('timezone', params.timezone)

  search.append('somenteComparativo', '1')

  appendFiltrosRelatorioMvp(search, {

    ...params,

    limit: 1,

    offset: 0,

    incluirComparativo: true,

  })



  const response = await fetch(`/api/relatorios/produtos-vendidos/mvp?${search.toString()}`, {

    headers: { Authorization: `Bearer ${params.token}` },

  })

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {

    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar comparativo.'

    throw new Error(msg)

  }

  return data as unknown as RelatorioProdutosVendidosMvpComparativoDTO

}



export function buildRelatorioMvpQueryKeyPrefix(

  empresaId: string | null,

  params: {

    periodo: string

    inicioKey: string | null

    fimKey: string | null

    timezone: string

    sort: RelatorioProdutosVendidosSort

    grupoKey: string

    valorMin: string

    valorMax: string

    qtdMin: string

    qtdMax: string

    buscaNome: string

  }

) {

  return [

    'relatorios',

    'produtos-vendidos-mvp',

    params.periodo,

    params.inicioKey,

    params.fimKey,

    params.timezone,

    params.sort,

    params.grupoKey,

    params.valorMin,

    params.valorMax,

    params.qtdMin,

    params.qtdMax,

    params.buscaNome,

    empresaId,

  ] as const

}



export function useRelatorioProdutosVendidosMvpQuery(params: RelatorioProdutosVendidosMvpQueryParams) {

  const { auth } = useAuthStore()

  const token = auth?.getAccessToken()

  const empresaId = useTenantEmpresaId()

  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  const enabled = params.enabled !== false



  const inicioKey = params.periodoInicial ? params.periodoInicial.toISOString() : null

  const fimKey = params.periodoFinal ? params.periodoFinal.toISOString() : null

  const grupoKey = params.grupoIds.slice().sort().join('|')



  return useQuery<RelatorioProdutosVendidosMvpResponseDTO>({

    queryKey: [

      ...buildRelatorioMvpQueryKeyPrefix(empresaId, {

        periodo: params.periodo,

        inicioKey,

        fimKey,

        timezone: resolvedTimezone,

        sort: params.sort,

        grupoKey,

        valorMin: params.valorMin,

        valorMax: params.valorMax,

        qtdMin: params.qtdMin,

        qtdMax: params.qtdMax,

        buscaNome: params.buscaNome,

      }),

      params.limit,

      params.offset,

    ],

    queryFn: () =>

      fetchRelatorioMvp({

        ...params,

        token: token!,

        timezone: resolvedTimezone,

      }),

    enabled: enabled && !!token,

    staleTime: 30_000,

  })

}



export type RelatorioProdutosVendidosMvpInfiniteParams = Omit<

  RelatorioProdutosVendidosMvpQueryParams,

  'limit' | 'offset'

>



export function useRelatorioProdutosVendidosMvpInfiniteQuery(

  params: RelatorioProdutosVendidosMvpInfiniteParams

) {

  const { auth } = useAuthStore()

  const token = auth?.getAccessToken()

  const empresaId = useTenantEmpresaId()

  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  const enabled = params.enabled !== false



  const inicioKey = params.periodoInicial ? params.periodoInicial.toISOString() : null

  const fimKey = params.periodoFinal ? params.periodoFinal.toISOString() : null

  const grupoKey = params.grupoIds.slice().sort().join('|')



  return useInfiniteQuery<

    RelatorioProdutosVendidosMvpResponseDTO,

    Error,

    InfiniteData<RelatorioProdutosVendidosMvpResponseDTO>,

    readonly unknown[],

    number

  >({

    queryKey: [

      ...buildRelatorioMvpQueryKeyPrefix(empresaId, {

        periodo: params.periodo,

        inicioKey,

        fimKey,

        timezone: resolvedTimezone,

        sort: params.sort,

        grupoKey,

        valorMin: params.valorMin,

        valorMax: params.valorMax,

        qtdMin: params.qtdMin,

        qtdMax: params.qtdMax,

        buscaNome: params.buscaNome,

      }),

      'infinite',

    ],

    queryFn: ({ pageParam }) =>

      fetchRelatorioMvp({

        ...params,

        limit: RELATORIO_MVP_LIST_PAGE_SIZE,

        offset: pageParam,

        incluirComparativo: false,

        token: token!,

        timezone: resolvedTimezone,

      }),

    initialPageParam: 0,

    getNextPageParam: lastPage => {

      const next = lastPage.offset + lastPage.items.length

      if (next >= lastPage.totalFiltrado) return undefined

      return next

    },

    enabled: enabled && !!token,

    staleTime: 30_000,

    placeholderData: keepPreviousData,

  })

}



export type RelatorioProdutosVendidosMvpComparativoParams = Omit<

  RelatorioProdutosVendidosMvpInfiniteParams,

  'enabled'

> & { enabled?: boolean }



/** 2ª fase: período anterior + deltas (após a lista/KPIs base já terem carregado). */

export function useRelatorioProdutosVendidosMvpComparativoQuery(

  params: RelatorioProdutosVendidosMvpComparativoParams & {

    /** Só dispara quando a 1ª página do relatório já existe. */

    dadosBaseProntos: boolean

  }

) {

  const { auth } = useAuthStore()

  const token = auth?.getAccessToken()

  const empresaId = useTenantEmpresaId()

  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  const enabled = params.enabled !== false



  const inicioKey = params.periodoInicial ? params.periodoInicial.toISOString() : null

  const fimKey = params.periodoFinal ? params.periodoFinal.toISOString() : null

  const grupoKey = params.grupoIds.slice().sort().join('|')



  return useQuery<RelatorioProdutosVendidosMvpComparativoDTO>({

    queryKey: [

      ...buildRelatorioMvpQueryKeyPrefix(empresaId, {

        periodo: params.periodo,

        inicioKey,

        fimKey,

        timezone: resolvedTimezone,

        sort: params.sort,

        grupoKey,

        valorMin: params.valorMin,

        valorMax: params.valorMax,

        qtdMin: params.qtdMin,

        qtdMax: params.qtdMax,

        buscaNome: params.buscaNome,

      }),

      'comparativo',

    ],

    queryFn: () =>

      fetchRelatorioMvpComparativo({

        ...params,

        token: token!,

        timezone: resolvedTimezone,

      }),

    enabled: enabled && !!token && params.dadosBaseProntos,

    staleTime: 30_000,

  })

}


