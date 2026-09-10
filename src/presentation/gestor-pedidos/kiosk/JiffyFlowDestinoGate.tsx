'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { estaNoAppJiffyFlow, isRotaPermitidaNoJiffyFlow } from './isKioskGestorPedidos'
import { pathEscolherEmpresaKiosk } from '../sessao/pathsGestorSessao'

/**
 * No .exe só existem login, lista de empresas, quadro e WhatsApp.
 * Hub, dashboard e o resto do Gestor web não entram nesta janela.
 */
export function JiffyFlowDestinoGate() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (!estaNoAppJiffyFlow()) return
    const path = pathname ?? window.location.pathname
    if (isRotaPermitidaNoJiffyFlow(path)) return
    window.location.replace(pathEscolherEmpresaKiosk())
  }, [pathname])

  return null
}
