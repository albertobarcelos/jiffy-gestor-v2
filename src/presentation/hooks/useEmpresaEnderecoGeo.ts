'use client'

import {
  lerEmpresaEnderecoGeoDoPayload,
  montarPayloadPatchPinEmpresa,
  type EmpresaEnderecoGeo,
} from '@/src/application/delivery/montarPayloadPatchPinEmpresa'
import { getEmpresaMe, patchEmpresa } from '@/src/infrastructure/api/empresaConfigApi'
import {
  dispararEmpresaDeliveryAtualizada,
  EMPRESA_DELIVERY_ME_QUERY_KEY,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

export const EMPRESA_ENDERECO_GEO_QUERY_KEY = ['empresa', 'endereco-geo'] as const

/**
 * Pin e endereço da loja para a cobertura. HTTP fica no hook; a tab só consome.
 */
export function useEmpresaEnderecoGeo() {
  const invalidateQueries = useInvalidateTenantQueries()

  const geoQuery = useSecureTenantQuery<EmpresaEnderecoGeo>(
    EMPRESA_ENDERECO_GEO_QUERY_KEY,
    async ({ token }) => {
      const res = await getEmpresaMe(token)
      if (!res.ok) {
        throw new Error(res.error)
      }
      return lerEmpresaEnderecoGeoDoPayload(res.data)
    },
    { staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false }
  )

  const atualizarOrigemMutation = useSecureTenantMutation<
    void,
    { point: GeoJsonPoint; providerEnderecoId?: string | null }
  >(
    async ({ token }, { point, providerEnderecoId }) => {
      const getRes = await getEmpresaMe(token)
      if (!getRes.ok) throw new Error('Não foi possível ler o endereço da empresa.')
      const { empresaId, endereco } = montarPayloadPatchPinEmpresa(
        getRes.data,
        point,
        providerEnderecoId
      )
      const res = await patchEmpresa(token, empresaId, { endereco })
      if (!res.ok) {
        throw new Error(res.error || 'Não foi possível atualizar o pin da loja.')
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
