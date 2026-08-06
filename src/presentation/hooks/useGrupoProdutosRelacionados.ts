'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import type { ProdutoRelacionadoDTO } from '@/src/domain/repositories/IGrupoProdutoRepository'

async function fetchRelacionados(
  grupoId: string,
  token: string
): Promise<ProdutoRelacionadoDTO[]> {
  const res = await fetchGestorApi(
    `/api/grupos-produtos/${encodeURIComponent(grupoId)}/relacionados`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { message?: string }).message ||
        `Erro ${res.status} ao carregar relacionados`
    )
  }
  const data = (await res.json()) as { relacionados?: ProdutoRelacionadoDTO[] }
  return data.relacionados ?? []
}

export function useGrupoProdutosRelacionados(grupoId: string | null) {
  return useSecureTenantQuery(
    ['grupos-produtos-relacionados', grupoId ?? ''],
    async ({ token }) => {
      if (!grupoId) return [] as ProdutoRelacionadoDTO[]
      return fetchRelacionados(grupoId, token)
    },
    {
      enabled: Boolean(grupoId),
      staleTime: 30_000,
    }
  )
}

export function useSalvarGrupoProdutosRelacionados(grupoId: string | null) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  const mutation = useSecureTenantMutation<void, { produtoIds: string[] }>(
    async ({ token }, { produtoIds }) => {
      if (!grupoId) throw new Error('Grupo não selecionado')
      const res = await fetchGestorApi(
        `/api/grupos-produtos/${encodeURIComponent(grupoId)}/relacionados`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ produtoIds }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { message?: string }).message ||
            `Erro ${res.status} ao salvar relacionados`
        )
      }
    },
    {
      onSuccess: () => {
        showToast.success('Produtos relacionados salvos.')
        void queryClient.invalidateQueries({
          queryKey: [
            'tenant',
            empresaId,
            'grupos-produtos-relacionados',
            grupoId ?? '',
          ],
        })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao salvar relacionados')
      },
    }
  )

  const salvar = useCallback(
    (produtoIds: string[]) => mutation.mutateAsync({ produtoIds }),
    [mutation]
  )

  return { ...mutation, salvar }
}
