'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'
import { configureGestorApiSession } from '@/src/infrastructure/api/gestorApiSession'

configureGestorApiSession({
  getAccessToken: () => useAuthStore.getState().tenantAuth?.getAccessToken() ?? null,
  syncAccessToken: syncTenantAccessTokenClient,
})

export { fetchGestorApi, type FetchGestorApiOptions } from '@/src/infrastructure/api/fetchGestorApi'
