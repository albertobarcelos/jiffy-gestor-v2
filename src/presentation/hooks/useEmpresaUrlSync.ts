'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { syncEmpresaUrlQueryFromSession } from '@/src/shared/utils/tabSession'

/**
 * Mantém `?<slug>` na barra de endereço para todas as rotas ERP.
 *
 * Usa `window.history.replaceState` para atualizar a URL silenciosamente,
 * sem disparar navegação React nem re-renders adicionais.
 * Montado no TopNav (shell ERP); em cada mudança de pathname, garante
 * que o slug esteja presente como query string (sem chave nomeada).
 */
export function useEmpresaUrlSync() {
  const pathname = usePathname()

  useEffect(() => {
    syncEmpresaUrlQueryFromSession()
  }, [pathname])
}
