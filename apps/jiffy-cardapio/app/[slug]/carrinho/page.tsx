import { Suspense } from 'react'
import { HydrationBoundary } from '@tanstack/react-query'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'
import { dehydrateCatalogoPrimeiraPagina } from '@/src/infrastructure/api/dehydrateCatalogoPrimeiraPagina'

type PageProps = {
  params: Promise<{ slug: string }>
}

function HomeFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2"
        style={{ borderColor: 'var(--delivery-primary, #333)' }}
      />
    </div>
  )
}

export default async function CardapioCarrinhoPage({ params }: PageProps) {
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim() ?? ''
  const state = await dehydrateCatalogoPrimeiraPagina(slug)

  return (
    <Suspense fallback={<HomeFallback />}>
      <HydrationBoundary state={state}>
        <DeliveryPublicoHomeScreen slug={slug} carrinhoInicialAberto />
      </HydrationBoundary>
    </Suspense>
  )
}
