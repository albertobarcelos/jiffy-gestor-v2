'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getEmpresaSlugParam } from '@/src/shared/utils/tabSession'

/**
 * Mantém `?<slug>` na barra de endereço para todas as rotas ERP.
 *
 * Usa `window.history.replaceState` para atualizar a URL silenciosamente,
 * sem disparar navegação React nem re-renders adicionais.
 * Montado no layout do dashboard; em cada mudança de pathname, garante
 * que o slug esteja presente como query string (sem chave nomeada).
 */
export function useEmpresaUrlSync() {
  const pathname = usePathname()

  useEffect(() => {
    const slug = getEmpresaSlugParam()
    if (!slug) return

    const current = window.location.search.slice(1).split('&')[0]
    if (current === slug) return

    const url = new URL(window.location.href)
    url.search = slug
    window.history.replaceState(null, '', url.toString())
  }, [pathname])
}
