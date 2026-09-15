'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { attachTenantQueryCrossTabSync } from '@/src/presentation/cache/attachTenantQueryCrossTabSync'

/** Liga o BroadcastChannel de invalidação de cache nesta aba. */
export function TenantQueryCrossTabSync() {
  const queryClient = useQueryClient()

  useEffect(() => attachTenantQueryCrossTabSync(queryClient), [queryClient])

  return null
}
