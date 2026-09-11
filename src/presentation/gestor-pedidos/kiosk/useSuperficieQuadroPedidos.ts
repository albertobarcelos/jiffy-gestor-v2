'use client'

import { usePathname } from 'next/navigation'
import { kioskNesteBrowser } from './isKioskGestorPedidos'
import type { SuperficieQuadroPedidos } from '../superficieQuadroPedidos'

export function useSuperficieQuadroPedidos(): SuperficieQuadroPedidos {
  return kioskNesteBrowser(usePathname()) ? 'fredy' : 'gestor'
}
