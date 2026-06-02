'use client'

import { useQuery } from '@tanstack/react-query'
import { listarEntregadoresPdvUseCase } from '@/src/application/use-cases/vendas/ListarEntregadoresPdvUseCase'
import type { UsuarioPdvEntregadorOption } from '../../types'

export type UseEntregadoresQueryParams = {
  enabled: boolean
  token: string | undefined
}

export function useEntregadoresQuery({ enabled, token }: UseEntregadoresQueryParams) {
  const query = useQuery({
    queryKey: ['usuarios-pdv-entregadores', { tipoUsuarioPdv: 'entregador' }],
    queryFn: async (): Promise<UsuarioPdvEntregadorOption[]> => {
      if (!token) return []
      return listarEntregadoresPdvUseCase.execute(token)
    },
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  return {
    entregadores: query.data ?? [],
    isLoadingEntregadores: query.isLoading,
    entregadoresQuery: query,
  }
}
