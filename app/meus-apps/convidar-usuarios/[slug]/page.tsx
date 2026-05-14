import { Suspense } from 'react'
import ConvitesGestaoPage from '@/src/presentation/components/features/convites-gestao/ConvitesGestaoPage'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { ConvidarUsuariosSlugSync } from '@/src/presentation/components/features/convites-gestao/components/ConvidarUsuariosSlugSync'

export default async function ConvidarUsuariosSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ConvidarUsuariosSlugSync routeSlug={slug}>
          <ConvitesGestaoPage />
        </ConvidarUsuariosSlugSync>
      </Suspense>
    </div>
  )
}
