'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'
import type { GapsQueryDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export function useInutilizacaoNumeracao() {
  const { auth } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const getUseCases = () => createPainelContadorUseCases(token!)

  const consultarGaps = async (params: GapsQueryDTO) => {
    const { consultarGaps: uc } = getUseCases()
    return uc.execute(params)
  }

  const listarEmissoes = async () => {
    const { consultarGaps: uc } = getUseCases()
    return uc.listarEmissoes()
  }

  const getContextoFiscal = async () => {
    const { consultarGaps: uc } = getUseCases()
    return uc.getContextoFiscal()
  }

  const listarInutilizacoes = async (modelo: number, serie: number) => {
    const { consultarGaps: uc } = getUseCases()
    return uc.listarInutilizacoes(modelo, serie)
  }

  const inutilizarMutation = useMutation({
    mutationFn: async (input: unknown) => {
      const { inutilizar } = getUseCases()
      return inutilizar.execute(input)
    },
    onSuccess: () => {
      showToast.success('Inutilização realizada')
      queryClient.invalidateQueries({ queryKey: ['portal-contador', empresaId] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  return {
    consultarGaps,
    listarEmissoes,
    getContextoFiscal,
    listarInutilizacoes,
    inutilizarMutation,
  }
}
