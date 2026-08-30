'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { deveEsconderTopNavNoGestorPedidos } from './isKioskGestorPedidos'

function temTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

function kioskNesteBrowser(pathname: string | null): boolean {
  if (typeof window === 'undefined') return false
  return deveEsconderTopNavNoGestorPedidos(stripGestaoEmpresaSlugFromPath(pathname ?? ''), {
    hasTauri: temTauri(),
    search: window.location.search,
  })
}

export function useKioskGestorPedidos(): boolean {
  const pathname = usePathname()
  const [kiosk, setKiosk] = useState(() => kioskNesteBrowser(pathname))

  useEffect(() => {
    setKiosk(kioskNesteBrowser(pathname))
  }, [pathname])

  return kiosk
}
