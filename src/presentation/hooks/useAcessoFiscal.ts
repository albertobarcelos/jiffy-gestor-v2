'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { decodeToken } from '@/src/shared/utils/validateToken'

/**
 * Indica se o usuário pode acessar o Painel do Contador.
 * Sem claim no JWT: permite (compatibilidade com sessões antigas).
 */
export function useAcessoFiscal(): boolean {
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  return useMemo(() => {
    const token = tenantAuth?.getAccessToken()
    if (!token) return true
    const payload = decodeToken(token)
    if (payload?.acessoFiscal === false) return false
    return true
  }, [tenantAuth])
}
