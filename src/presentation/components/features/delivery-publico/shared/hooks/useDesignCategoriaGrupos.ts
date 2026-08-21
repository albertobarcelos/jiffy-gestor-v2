'use client'

import { useMemo } from 'react'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'
import { mapGruposProdutoToDesignCategorias } from '../utils/mapDesignCategoriaGrupos'

export function useDesignCategoriaGrupos(enabled = true) {
  const query = useGruposProdutos({
    ativo: true,
    limit: 1000,
    enabled,
    refetchOnWindowFocus: false,
  })

  const grupos = useMemo<DesignCategoriaGrupo[]>(
    () => mapGruposProdutoToDesignCategorias(query.data ?? []),
    [query.data]
  )

  return {
    grupos,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
