'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'

export function useReformaTributaria() {
  const { auth, isRehydrated, isAuthenticated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  const listQuery = useQuery({
    queryKey: ['portal-contador', 'reforma-tributaria', empresaId],
    enabled: isRehydrated && isAuthenticated && !!token,
    queryFn: async () => {
      const { listarReforma } = createPainelContadorUseCases(token!)
      return listarReforma.execute()
    },
  })

  const salvarMutation = useMutation({
    mutationFn: async ({
      ncm,
      input,
    }: {
      ncm: string
      input: { cst: string; codigoClassificacaoFiscal: string }
    }) => {
      const { salvarReforma } = createPainelContadorUseCases(token!)
      return salvarReforma.execute(ncm, input)
    },
    onSuccess: () => {
      showToast.success('Reforma tributária salva')
      queryClient.invalidateQueries({
        queryKey: ['portal-contador', 'reforma-tributaria', empresaId],
      })
    },
    onError: (e: Error) => showToast.error(e.message),
  })

  return { listQuery, salvarMutation }
}
