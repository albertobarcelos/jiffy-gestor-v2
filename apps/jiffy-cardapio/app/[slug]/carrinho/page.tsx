import { Suspense } from 'react'
import type { Metadata } from 'next'
import { HydrationBoundary } from '@tanstack/react-query'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'
import { dehydrateCatalogoPrimeiraPagina } from '@/src/infrastructure/api/dehydrateCatalogoPrimeiraPagina'
import { metadataCardapioNaoIndexavel } from '@/src/infrastructure/seo/cardapioSlugMetadata'

export { generateStaticParams } from '../catalogoSlugCache'

export const metadata: Metadata = metadataCardapioNaoIndexavel

/** Precisa ser literal neste arquivo — o Next não lê re-export. */
export const revalidate = 30
export const dynamicParams = true

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
