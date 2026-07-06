'use client'

import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'
import type { GapsQueryDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'

function requireTenantToken(): string {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  if (!token || useAuthStore.getState().tenantAuth?.isExpired()) {
    throw new Error('Sessão de empresa não encontrada. Faça login novamente.')
  }
  return token
}

export function useInutilizacaoNumeracao() {
  const invalidate = useInvalidateTenantQueries()

  const getUseCases = () => createPainelContadorUseCases(requireTenantToken())

  const consultarGaps = async (params: GapsQueryDTO) => {
    const { consultarGaps: uc } = getUseCases()
    return uc.execute(params)
  }

  const listarInutilizacoes = async (modelo: number, serie: number) => {
    const { consultarGaps: uc } = getUseCases()
    return uc.listarInutilizacoes(modelo, serie)
  }

  const inutilizarMutation = useSecureTenantMutation(
    async ({ token }, input: unknown) => {
      const { inutilizar } = createPainelContadorUseCases(token)
      return inutilizar.execute(input)
    },
    {
      onSuccess: async () => {
        showToast.success('Inutilização realizada')
        await invalidate(['portal-contador'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return {
    consultarGaps,
    listarInutilizacoes,
    inutilizarMutation,
  }
}
