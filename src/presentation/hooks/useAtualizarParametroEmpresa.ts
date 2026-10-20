'use client'

import { patchEmpresa } from '@/src/infrastructure/api/empresaConfigApi'
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
      const res = await patchEmpresa(token, empresaId, { parametroEmpresa })
      if (!res.ok) {
        throw new Error(res.error)
      }
      return res.data
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
