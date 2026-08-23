'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { deveEsconderTopNavNoGestorPedidos } from './isKioskGestorPedidos'

function temTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export function useKioskGestorPedidos(): boolean {
  const pathname = usePathname()
  const [kiosk, setKiosk] = useState(false)

  useEffect(() => {
    const pathModulo = stripGestaoEmpresaSlugFromPath(pathname ?? '')
    setKiosk(
      deveEsconderTopNavNoGestorPedidos(pathModulo, {
        hasTauri: temTauri(),
        search: window.location.search,
      })
    )
  }, [pathname])

  return kiosk
}
