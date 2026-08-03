import ConvitesGestaoPage from '@/src/presentation/components/features/convites-gestao/ConvitesGestaoPage'
import { GerenciarUsuariosSlugSync } from '@/src/presentation/components/features/convites-gestao/components/GerenciarUsuariosSlugSync'

/**
 * Rota sem slug: renderiza a página normalmente e redireciona silenciosamente para a URL com slug.
 */
export default function GerenciarUsuariosIndexPage() {
  return (
    <GerenciarUsuariosSlugSync routeSlug="">
      <ConvitesGestaoPage />
    </GerenciarUsuariosSlugSync>
  )
}
