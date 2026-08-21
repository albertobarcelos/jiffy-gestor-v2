'use client'

import {
  getTabEmpresaId,
  getTabTenantToken,
  setTabEmpresaId,
  setTabTenantToken,
} from '@/src/shared/utils/tabSession'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import {
  AuthSessionUserIncompleteError,
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Atualiza JWT da empresa no `sessionStorage` (per-tab) e no Zustand após refresh.
 *
 * Recusa se o access renovado for de **outra** empresa que a canônica desta aba
 * (token atual ou `SESSION_STORAGE_EMPRESA_ID`).
 * Sem e-mail real na sessão anterior → não monta `usuario@sessao.local` (retorna false).
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
  if (!prev || isEmailSessaoPlaceholder(prev.getEmail())) {
    return false
  }

  try {
    const name = prev.getName()
    const built = buildAuthFromAccessToken(accessToken, {
      id: prev.getId(),
      email: prev.getEmail(),
      ...(name !== undefined ? { name } : {}),
    })
    setTabTenantToken(accessToken)
    if (novaEmpresaId) {
      setTabEmpresaId(novaEmpresaId)
    }
    useAuthStore.getState().setTenantAuth(built)
    return true
  } catch (e) {
    if (!(e instanceof AuthSessionUserIncompleteError)) {
      console.error('syncTenantAccessTokenClient:', e)
    }
    return false
  }
}
