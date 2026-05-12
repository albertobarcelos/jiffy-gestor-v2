import ConvitesGestaoPage from '@/src/presentation/components/features/convites-gestao/ConvitesGestaoPage'
import { ConvidarUsuariosSlugSync } from '@/src/presentation/components/features/convites-gestao/components/ConvidarUsuariosSlugSync'

export default async function ConvidarUsuariosSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <ConvidarUsuariosSlugSync routeSlug={slug}>
      <ConvitesGestaoPage />
    </ConvidarUsuariosSlugSync>
  )
}
