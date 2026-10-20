'use client'

import { useCallback, useMemo } from 'react'
import { Taxa } from '@/src/domain/entities/Taxa'
import { montarPayloadPatchTaxaEntrega } from '@/src/application/taxas/montarPayloadPatchTaxaEntrega'
import { criarTaxa, excluirTaxa, getTaxa, patchTaxa } from '@/src/infrastructure/api/taxasConfigApi'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import { useAuthStore } from '@/src/presentation/stores/authStore'

function exigirToken(): string {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  if (!token) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }
  return token
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
      const response = await criarTaxa(token, {
        nome: input.nome,
        valor: input.valor,
        tipo: 'entrega',
        ativo: true,
        tributado: false,
        ncm: null,
      })
      if (!response.ok) {
        throw new Error(response.error)
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
      const getRes = await getTaxa(token, taxa.getId())
      if (!getRes.ok) {
        throw new Error(getRes.error)
      }

      const payload = montarPayloadPatchTaxaEntrega(getRes.data, campos)
      const patchRes = await patchTaxa(token, taxa.getId(), payload)
      if (!patchRes.ok) {
        throw new Error(patchRes.error)
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
      const res = await excluirTaxa(token, taxa.getId())
      if (res.ok) {
        await invalidarTaxas()
        return
      }
      throw new Error(res.error)
    },
    [invalidarTaxas]
  )

  return { taxasQuery, taxasEntrega, criar, atualizar, excluir, invalidarTaxas }
}
