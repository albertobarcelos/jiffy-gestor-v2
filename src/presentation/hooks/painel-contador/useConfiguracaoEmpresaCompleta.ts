'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'
import type {
  AtualizarEmpresaDTO,
  SalvarFiscalDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

function requireTenantToken(): string {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  if (!token || useAuthStore.getState().tenantAuth?.isExpired()) {
    throw new Error('Sessão de empresa não encontrada. Faça login novamente.')
  }
  return token
}

export function useConfiguracaoEmpresaCompleta() {
  const invalidate = useInvalidateTenantQueries()

  const dadosQuery = useSecureTenantQuery(
    ['portal-contador', 'empresa-completa'],
    async ({ token }) => {
      const { salvarEmpresa } = createPainelContadorUseCases(token)
      return salvarEmpresa.carregar()
    }
  )

  const salvarMutation = useSecureTenantMutation(
    async (
      { token },
      {
        empresaId: id,
        empresa,
        fiscal,
      }: {
        empresaId: string
        empresa: AtualizarEmpresaDTO
        fiscal: SalvarFiscalDTO
      }
    ) => {
      const { salvarEmpresa } = createPainelContadorUseCases(token)
      return salvarEmpresa.salvar(id, empresa, fiscal)
    },
    {
      onSuccess: async () => {
        showToast.success('Dados salvos com sucesso')
        await invalidate(['portal-contador'])
      },
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  const validarCidade = async (cidade: string, uf: string) => {
    const { salvarEmpresa } = createPainelContadorUseCases(requireTenantToken())
    return salvarEmpresa.validarCidade(cidade, uf)
  }

  return { dadosQuery, salvarMutation, validarCidade }
}
