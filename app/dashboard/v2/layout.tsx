'use client'

import { AuthGuard } from '@/src/presentation/components/auth/AuthGuard'

/**
 * Proteção do dashboard V2 no cliente: sessão expirada ou inválida → logout e login.
 */
export default function DashboardV2Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
