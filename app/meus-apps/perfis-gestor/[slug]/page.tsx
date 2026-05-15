import { PerfisGestorHubPage } from '@/src/presentation/components/features/perfis-gestor/PerfisGestorHubPage'
import { PerfisGestorSlugSync } from '@/src/presentation/components/features/perfis-gestor/components/PerfisGestorSlugSync'

export default async function PerfisGestorSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <PerfisGestorSlugSync routeSlug={slug}>
      <PerfisGestorHubPage />
    </PerfisGestorSlugSync>
  )
}
