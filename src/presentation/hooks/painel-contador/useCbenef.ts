'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'
import type { ImportarCbenefResultadoDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export function useCbenef(uf: string, cst?: string, enabled = true) {
  const ufNorm = uf.trim().toUpperCase()
  const cstNorm = cst?.trim() ?? ''

  const listQuery = useSecureTenantQuery(
    ['portal-contador', 'cbenef', ufNorm, cstNorm],
    async ({ token }) => {
      const { cbenef } = createPainelContadorUseCases(token)
      return cbenef.listar(ufNorm, cstNorm || undefined)
    },
    { enabled: enabled && ufNorm.length === 2, staleTime: 5 * 60_000 }
  )

  const validarMutation = useSecureTenantMutation(
    async ({ token }, codigo: string) => {
      const { cbenef } = createPainelContadorUseCases(token)
      return cbenef.validar(codigo)
    }
  )

  const importarMutation = useSecureTenantMutation(
    async ({ token }, arquivo: File) => {
      const { cbenef } = createPainelContadorUseCases(token)
      return cbenef.importar(arquivo)
    },
    {
      onError: (e: Error) => showToast.error(e.message),
    }
  )

  return { listQuery, validarMutation, importarMutation }
}

export function useVerificarCbenefEmissao() {
  return useSecureTenantMutation(
    async ({ token }, input: { vendaId: string; tabelaOrigem: 'venda' | 'venda_gestor'; tipoVenda?: string | null }) => {
      const { verificarCbenefEmissao } = createPainelContadorUseCases(token)
      return verificarCbenefEmissao.execute({ ...input, token })
    }
  )
}

export type { ImportarCbenefResultadoDTO }
