'use client'

import { ReactNode } from 'react'

/**
 * Layout mínimo para redirects legados `/cardapio/*` → `/delivery/*`.
 */
export default function CardapioLegacyLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
