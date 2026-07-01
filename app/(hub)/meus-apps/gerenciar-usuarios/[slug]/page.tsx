import ConvitesGestaoPage from '@/src/presentation/components/features/convites-gestao/ConvitesGestaoPage'
import { GerenciarUsuariosSlugSync } from '@/src/presentation/components/features/convites-gestao/components/GerenciarUsuariosSlugSync'

export default async function GerenciarUsuariosSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <GerenciarUsuariosSlugSync routeSlug={slug}>
      <ConvitesGestaoPage />
    </GerenciarUsuariosSlugSync>
  )
}
