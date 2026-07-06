'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { syncEmpresaUrlPathFromSession } from '@/src/shared/utils/tabSession'

/**
 * Mantém `/gestao/{empresaSlug}/{modulo}` na barra de endereço (Fase 1).
 * Atualiza via `replaceState` sem recarregar a página.
 */
export function useEmpresaUrlSync() {
  const pathname = usePathname()

  useEffect(() => {
    syncEmpresaUrlPathFromSession()
  }, [pathname])
}
