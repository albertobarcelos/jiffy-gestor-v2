'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { deveEsconderTopNavNoGestorPedidos, detectarRuntimeTauri } from './isKioskGestorPedidos'

function kioskNesteBrowser(pathname: string | null): boolean {
  if (typeof window === 'undefined') return false
  return deveEsconderTopNavNoGestorPedidos(
    stripGestaoEmpresaSlugFromPath(pathname ?? ''),
    { hasTauri: detectarRuntimeTauri(), search: window.location.search }
  )
}

export function useKioskGestorPedidos(): boolean {
  const pathname = usePathname()
  const [kiosk, setKiosk] = useState(false)

  useEffect(() => {
    setKiosk(kioskNesteBrowser(pathname))
  }, [pathname])

  return kiosk
}
