'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'

/**
 * Mantém a URL canônica `/meus-apps/gerenciar-usuarios/<slug>` alinhada ao nome da empresa da sessão.
 */
export function GerenciarUsuariosSlugSync({
  routeSlug,
  children,
}: {
  routeSlug: string
  children: ReactNode
}) {
  const router = useRouter()
  const { empresa, isLoading } = useEmpresaMe()

  useEffect(() => {
    if (isLoading || !empresa?.nomeExibicao) {
      return
    }
    const esperado = empresaNomeParaSlugUrl(empresa.nomeExibicao)
    if (esperado !== routeSlug) {
      router.replace(`/meus-apps/gerenciar-usuarios/${esperado}`)
    }
  }, [empresa, isLoading, routeSlug, router])

  return <>{children}</>
}
