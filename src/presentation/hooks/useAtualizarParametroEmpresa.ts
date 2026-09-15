'use client'

import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'

/**
 * PATCH `/api/empresas/:id` só com `parametroEmpresa` (ex.: `menuVendaGestorId`).
 * Preservar o objeto atual no caller para não apagar timezone e demais campos.
 */
export function useAtualizarParametroEmpresa() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<unknown, Record<string, unknown>>(
    async ({ token, empresaId }, parametroEmpresa) => {
      const res = await fetchGestorApi(`/api/empresas/${encodeURIComponent(empresaId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parametroEmpresa }),
      })
      const raw: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(textoErroCorpoApi(raw) || `Erro HTTP ${res.status}`)
      }
      return raw
    },
    {
      onSuccess: async () => {
        await invalidate(['empresas', 'me'])
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('jiffy:empresa-me-updated'))
        }
      },
    }
  )
}
