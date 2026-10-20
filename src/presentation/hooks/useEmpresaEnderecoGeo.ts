'use client'

import {
  lerEmpresaEnderecoGeoDoPayload,
  montarPayloadPatchPinEmpresa,
  type EmpresaEnderecoGeo,
} from '@/src/application/delivery/montarPayloadPatchPinEmpresa'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import {
  dispararEmpresaDeliveryAtualizada,
  EMPRESA_DELIVERY_ME_QUERY_KEY,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

export const EMPRESA_ENDERECO_GEO_QUERY_KEY = ['empresa', 'endereco-geo'] as const

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}))
}

/**
 * Pin e endereço da loja para a cobertura. HTTP fica no hook; a tab só consome.
 */
export function useEmpresaEnderecoGeo() {
  const invalidateQueries = useInvalidateTenantQueries()

  const geoQuery = useSecureTenantQuery<EmpresaEnderecoGeo>(
    EMPRESA_ENDERECO_GEO_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await parseJson(res)
        throw new Error(textoErroCorpoApi(body) || `Erro ${res.status}`)
      }
      return lerEmpresaEnderecoGeoDoPayload(await res.json())
    },
    { staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false }
  )

  const atualizarOrigemMutation = useSecureTenantMutation<
    void,
    { point: GeoJsonPoint; providerEnderecoId?: string | null }
  >(
    async ({ token }, { point, providerEnderecoId }) => {
      const getRes = await fetchGestorApi('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!getRes.ok) throw new Error('Não foi possível ler o endereço da empresa.')
      const { empresaId, endereco } = montarPayloadPatchPinEmpresa(
        await getRes.json(),
        point,
        providerEnderecoId
      )
      const res = await fetchGestorApi(`/api/empresas/${encodeURIComponent(empresaId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endereco }),
      })
      if (!res.ok) {
        const body = await parseJson(res)
        throw new Error(textoErroCorpoApi(body) || 'Não foi possível atualizar o pin da loja.')
      }
    },
    {
      onSuccess: async () => {
        await invalidateQueries(EMPRESA_ENDERECO_GEO_QUERY_KEY)
        await invalidateQueries(['empresas', 'me'])
        await invalidateQueries(EMPRESA_DELIVERY_ME_QUERY_KEY)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('jiffy:empresa-me-updated'))
        }
        dispararEmpresaDeliveryAtualizada()
      },
    }
  )

  return { geoQuery, atualizarOrigemMutation }
}
