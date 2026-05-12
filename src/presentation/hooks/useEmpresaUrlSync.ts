'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getEmpresaSlugParam } from '@/src/shared/utils/tabSession'

/**
 * Mantém `?emp=<slug>` na barra de endereço para todas as rotas ERP.
 *
 * Usa `window.history.replaceState` para atualizar a URL silenciosamente,
 * sem disparar navegação React nem re-renders adicionais.
 * Montado no layout do dashboard; em cada mudança de pathname, garante
 * que o param `emp` esteja presente.
 */
export function useEmpresaUrlSync() {
  const pathname = usePathname()

  useEffect(() => {
    const slug = getEmpresaSlugParam()
    if (!slug) return

    const url = new URL(window.location.href)
    if (url.searchParams.get('emp') === slug) return

    url.searchParams.set('emp', slug)
    window.history.replaceState(null, '', url.toString())
  }, [pathname])
}
