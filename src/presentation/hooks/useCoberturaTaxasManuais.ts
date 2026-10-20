'use client'

import { useCallback, useMemo } from 'react'
import { Taxa } from '@/src/domain/entities/Taxa'
import { montarPayloadPatchTaxaEntrega } from '@/src/application/taxas/montarPayloadPatchTaxaEntrega'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

function exigirToken(): string {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  if (!token) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }
  return token
}

function mensagemErroTaxa(body: unknown, fallback: string): string {
  return textoErroCorpoApi(body) || fallback
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}))
}

export type AtualizarTaxaManualEntregaInput = {
  nome: string
  valor: number
  ativo: boolean
}

/**
 * Lista e mutações das taxas manuais (`tipo: "entrega"`) da cobertura.
 */
export function useCoberturaTaxasManuais() {
  const invalidate = useInvalidateTenantQueries()
  const taxasQuery = useTaxasInfinite({ limit: 50, staleTime: 15_000 })

  const taxasEntrega = useMemo(() => {
    const pages = taxasQuery.data?.pages ?? []
    return pages
      .flatMap(page => page.taxas)
      .filter(taxa => taxa.getTipo().toLowerCase() === 'entrega')
  }, [taxasQuery.data])

  const invalidarTaxas = useCallback(async () => {
    await invalidate(['taxas'], { refetchType: 'all' })
  }, [invalidate])

  const criar = useCallback(
    async (input: { nome: string; valor: number }) => {
      const token = exigirToken()
      const response = await fetchGestorApi('/api/taxas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: input.nome,
          valor: input.valor,
          tipo: 'entrega',
          ativo: true,
          tributado: false,
          ncm: null,
        }),
      })
      if (!response.ok) {
        const err = await parseJson(response)
        throw new Error(mensagemErroTaxa(err, 'Erro ao criar taxa'))
      }
      await invalidarTaxas()
    },
    [invalidarTaxas]
  )

  const atualizar = useCallback(
    async (
      taxa: Taxa,
      campos: AtualizarTaxaManualEntregaInput,
      opcoes?: { invalidar?: boolean }
    ) => {
      const token = exigirToken()
      const getRes = await fetchGestorApi(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!getRes.ok) {
        const err = await parseJson(getRes)
        throw new Error(mensagemErroTaxa(err, 'Não foi possível carregar a taxa.'))
      }

      const detalhe = (await getRes.json()) as Record<string, unknown>
      const payload = montarPayloadPatchTaxaEntrega(detalhe, campos)

      const patchRes = await fetchGestorApi(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!patchRes.ok) {
        const err = await parseJson(patchRes)
        throw new Error(mensagemErroTaxa(err, 'Erro ao atualizar taxa.'))
      }
      if (opcoes?.invalidar !== false) {
        await invalidarTaxas()
      }
    },
    [invalidarTaxas]
  )

  const excluir = useCallback(
    async (taxa: Taxa) => {
      const token = exigirToken()
      const res = await fetchGestorApi(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 204 || res.ok) {
        await invalidarTaxas()
        return
      }
      const err = await parseJson(res)
      throw new Error(mensagemErroTaxa(err, 'Erro ao excluir taxa.'))
    },
    [invalidarTaxas]
  )

  return { taxasQuery, taxasEntrega, criar, atualizar, excluir, invalidarTaxas }
}
