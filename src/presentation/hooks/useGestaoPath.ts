'use client'

import { useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildGestaoPath,
  isGestaoScopedPath,
  parseEmpresaSlugFromPath,
  stripGestaoEmpresaSlugFromPath,
} from '@/src/shared/utils/gestaoRoutes'
import { getEmpresaSlugParam } from '@/src/shared/utils/tabSession'

/**
 * Resolve empresaSlug da URL ou sessão e monta paths `/gestao/{empresaSlug}/...`.
 */
export function useGestaoPath() {
  const pathname = usePathname() ?? ''

  const empresaSlug = useMemo(
    () => parseEmpresaSlugFromPath(pathname) ?? getEmpresaSlugParam(),
    [pathname]
  )

  const modulePath = useMemo(() => stripGestaoEmpresaSlugFromPath(pathname), [pathname])

  const toGestao = useCallback(
    (path: string) => {
      if (!isGestaoScopedPath(path)) return path
      const slug = empresaSlug ?? getEmpresaSlugParam()
      if (!slug) return path
      return buildGestaoPath(slug, path)
    },
    [empresaSlug]
  )

  return { empresaSlug, modulePath, toGestao }
}
