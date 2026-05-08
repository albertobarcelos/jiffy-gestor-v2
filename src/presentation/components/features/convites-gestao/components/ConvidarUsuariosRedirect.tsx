'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/**
 * `/meus-apps/convidar-usuarios` → redireciona para a mesma rota com slug curto do nome da empresa.
 */
export function ConvidarUsuariosRedirect() {
  const router = useRouter()
  const { empresa, isLoading } = useEmpresaMe()

  useEffect(() => {
    if (isLoading) {
      return
    }
    const slug = empresa?.nomeExibicao
      ? empresaNomeParaSlugUrl(empresa.nomeExibicao)
      : 'empresa'
    router.replace(`/meus-apps/convidar-usuarios/${slug}`)
  }, [empresa, isLoading, router])

  return (
    <div className="h-full">
      <PageLoading />
    </div>
  )
}
