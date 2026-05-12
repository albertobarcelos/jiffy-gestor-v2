import ConvitesGestaoPage from '@/src/presentation/components/features/convites-gestao/ConvitesGestaoPage'
import { ConvidarUsuariosSlugSync } from '@/src/presentation/components/features/convites-gestao/components/ConvidarUsuariosSlugSync'

/**
 * Rota sem slug: renderiza a página normalmente e redireciona silenciosamente para a URL com slug.
 */
export default function ConvidarUsuariosIndexPage() {
  return (
    <ConvidarUsuariosSlugSync routeSlug="">
      <ConvitesGestaoPage />
    </ConvidarUsuariosSlugSync>
  )
}
