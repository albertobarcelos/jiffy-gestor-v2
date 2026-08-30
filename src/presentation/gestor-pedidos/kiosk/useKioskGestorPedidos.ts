'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import {
  deveEsconderTopNavNoGestorPedidos,
  detectarRuntimeTauri,
  lerSinalKioskFlowPersistido,
  persistirSinalKioskFlow,
} from './isKioskGestorPedidos'

function kioskNesteBrowser(pathname: string | null): boolean {
  if (typeof window === 'undefined') return false
  const hasTauri = detectarRuntimeTauri() || lerSinalKioskFlowPersistido()
  const search = window.location.search
  const kiosk = deveEsconderTopNavNoGestorPedidos(
    stripGestaoEmpresaSlugFromPath(pathname ?? ''),
    { hasTauri, search }
  )
  if (kiosk) persistirSinalKioskFlow()
  return kiosk
}

export function useKioskGestorPedidos(): boolean {
  const pathname = usePathname()
  const [kiosk, setKiosk] = useState(() => kioskNesteBrowser(pathname))

  useEffect(() => {
    setKiosk(kioskNesteBrowser(pathname))
  }, [pathname])

  return kiosk
}
