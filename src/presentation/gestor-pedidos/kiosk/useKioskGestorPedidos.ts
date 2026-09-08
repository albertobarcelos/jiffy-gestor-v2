'use client'

import { usePathname } from 'next/navigation'
import { kioskNesteBrowser } from './isKioskGestorPedidos'

export function useKioskGestorPedidos(): boolean {
  return kioskNesteBrowser(usePathname())
}
