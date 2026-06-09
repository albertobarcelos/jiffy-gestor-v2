'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'
import type {
  AtualizarEmpresaDTO,
  SalvarFiscalDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

export function useConfiguracaoEmpresaCompleta() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const dadosQuery = useQuery({
    queryKey: ['portal-contador', 'empresa-completa', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { salvarEmpresa } = createPainelContadorUseCases(token!)
      return salvarEmpresa.carregar()
    },
  })

  const salvarMutation = useMutation({
    mutationFn: async ({
      empresaId: id,
      empresa,
      fiscal,
    }: {
      empresaId: string
      empresa: AtualizarEmpresaDTO
      fiscal: SalvarFiscalDTO
    }) => {
      const { salvarEmpresa } = createPainelContadorUseCases(token!)
      return salvarEmpresa.salvar(id, empresa, fiscal)
    },
    onSuccess: () => {
      showToast.success('Dados salvos com sucesso')
      queryClient.invalidateQueries({ queryKey: ['portal-contador'] })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  const validarCidade = async (cidade: string, uf: string) => {
    const { salvarEmpresa } = createPainelContadorUseCases(token!)
    return salvarEmpresa.validarCidade(cidade, uf)
  }

  return { dadosQuery, salvarMutation, validarCidade }
}
