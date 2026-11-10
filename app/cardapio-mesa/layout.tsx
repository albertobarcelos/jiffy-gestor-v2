'use client'

import type { ReactNode } from 'react'
import { useCardapioMesaTheme } from '@/src/presentation/hooks/cardapio-mesa/useCardapioMesaTheme'
import { CardapioMesaTenantBootstrap } from '@/src/presentation/components/features/cardapio-mesa/CardapioMesaTenantBootstrap'
import '@/src/presentation/styles/cardapio-mesa-themes.css'

export default function CardapioMesaLayout({ children }: { children: ReactNode }) {
  useCardapioMesaTheme()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}>
      <CardapioMesaTenantBootstrap>{children}</CardapioMesaTenantBootstrap>
    </div>
  )
}
