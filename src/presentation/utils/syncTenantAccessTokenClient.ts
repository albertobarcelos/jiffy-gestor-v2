'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import {
  getTabEmpresaId,
  getTabTenantToken,
  setTabEmpresaId,
  setTabTenantToken,
} from '@/src/shared/utils/tabSession'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'

/**
 * Atualiza JWT da empresa no `sessionStorage` (per-tab) e no Zustand após refresh.
 *
 * Recusa se o access renovado for de **outra** empresa que a canônica desta aba
 * (token atual ou `SESSION_STORAGE_EMPRESA_ID`).
 */
export function syncTenantAccessTokenClient(accessToken: string): boolean {
  const novaEmpresaId = extractTokenInfo(accessToken).empresaId ?? null

  if (novaEmpresaId) {
    const tokenAtual =
      getTabTenantToken() || useAuthStore.getState().tenantAuth?.getAccessToken() || null
    const empresaAtual = tokenAtual
      ? extractTokenInfo(tokenAtual).empresaId ?? null
      : getTabEmpresaId()

    if (empresaAtual && empresaAtual !== novaEmpresaId) {
      return false
    }
  }

  const prev = useAuthStore.getState().getUser()
  const name = prev?.getName()
  const built = buildAuthFromAccessToken(
    accessToken,
    prev
      ? {
          id: prev.getId(),
          email: prev.getEmail(),
          ...(name !== undefined ? { name } : {}),
        }
      : undefined
  )
  setTabTenantToken(accessToken)
  if (novaEmpresaId) {
    setTabEmpresaId(novaEmpresaId)
  }
  useAuthStore.getState().setTenantAuth(built)
  return true
}
