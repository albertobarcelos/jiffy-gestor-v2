'use client'

import { ErpAppShell } from '@/src/presentation/components/layouts/ErpAppShell'

/**
 * Layout compartilhado de todas as rotas ERP sob `app/(erp)/`.
 * TopNav não remonta ao navegar entre filhos (ex.: dashboard ↔ relatórios).
 */
export default function ErpRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return <ErpAppShell>{children}</ErpAppShell>
}
