import { PerfisGestorHubPage } from '@/src/presentation/components/features/perfis-gestor/PerfisGestorHubPage'
import { PerfisGestorSlugSync } from '@/src/presentation/components/features/perfis-gestor/components/PerfisGestorSlugSync'

/**
 * Rota sem slug: renderiza a página normalmente e redireciona silenciosamente para a URL com slug.
 */
export default function PerfisGestorIndexPage() {
  return (
    <PerfisGestorSlugSync routeSlug="">
      <PerfisGestorHubPage />
    </PerfisGestorSlugSync>
  )
}
