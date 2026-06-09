'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useEmissorFiscal() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const emissaoQuery = useQuery({
    queryKey: ['portal-contador', 'emissao', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { salvarEmissao } = createPainelContadorUseCases(token!)
      return salvarEmissao.listar()
    },
  })

  const salvarMutation = useMutation({
    mutationFn: async ({ modelo, input }: { modelo: 55 | 65; input: unknown }) => {
      const { salvarEmissao } = createPainelContadorUseCases(token!)
      return salvarEmissao.salvar(modelo, input)
    },
    onSuccess: () => {
      showToast.success('Configuração salva com sucesso')
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'emissao', empresaId] })
      queryClient.invalidateQueries({ queryKey: ['portal-contador', 'progresso', empresaId] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  return { emissaoQuery, salvarMutation }
}
