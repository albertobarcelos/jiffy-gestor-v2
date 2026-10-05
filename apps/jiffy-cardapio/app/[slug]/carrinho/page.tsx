import { Suspense } from 'react'
import type { Metadata } from 'next'
import { HydrationBoundary } from '@tanstack/react-query'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'
import { dehydrateCatalogoPrimeiraPagina } from '@/src/infrastructure/api/dehydrateCatalogoPrimeiraPagina'
import { carregarEmpresaPublicaSeo } from '@/src/infrastructure/seo/carregarEmpresaPublicaSeo'
import {
  metadataCardapioNaoIndexavel,
  metadataCardapioSlug,
} from '@/src/infrastructure/seo/cardapioSlugMetadata'

export { generateStaticParams } from '../catalogoSlugCache'

/** Precisa ser literal neste arquivo — o Next não lê re-export. */
export const revalidate = 30
export const dynamicParams = true

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim() ?? ''
  const empresa = await carregarEmpresaPublicaSeo(slug)
  if (!empresa) return metadataCardapioNaoIndexavel
  return {
    ...metadataCardapioSlug(empresa),
    robots: { index: false, follow: false },
  }
}

function HomeFallback() {
  return (
    <div className="flex min-h-full items-center justify-center">
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
