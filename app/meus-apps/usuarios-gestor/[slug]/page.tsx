import { Suspense } from 'react'
import UsuariosGestorHubPage from '@/src/presentation/components/features/usuarios-gestor/UsuariosGestorHubPage'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { UsuariosGestorSlugSync } from '@/src/presentation/components/features/usuarios-gestor/components/UsuariosGestorSlugSync'

export default async function UsuariosGestorSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <UsuariosGestorSlugSync routeSlug={slug}>
          <UsuariosGestorHubPage />
        </UsuariosGestorSlugSync>
      </Suspense>
    </div>
  )
}
