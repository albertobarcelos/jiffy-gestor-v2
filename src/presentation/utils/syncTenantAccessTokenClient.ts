'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import { setTabTenantToken } from '@/src/shared/utils/tabSession'

/**
 * Atualiza JWT da empresa no `sessionStorage` (per-tab) e no Zustand após
 * `POST /api/auth/refresh-token` ou resposta equivalente.
 */
export function syncTenantAccessTokenClient(accessToken: string): void {
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
  useAuthStore.getState().setTenantAuth(built)
}
