import { NextResponse } from 'next/server'
import { montarWebAppManifest } from '@/src/infrastructure/pwa/montarWebAppManifest'
import { carregarEmpresaPublicaSeo } from '@/src/infrastructure/seo/carregarEmpresaPublicaSeo'
import { isReservedCardapioSlug } from '@/src/infrastructure/seo/reservedCardapioSlugs'

export const revalidate = 60

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug: raw } = await context.params
  const slug = raw?.trim() ?? ''
  if (!slug || isReservedCardapioSlug(slug)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const empresa = await carregarEmpresaPublicaSeo(slug)
  if (!empresa) {
    return new NextResponse('Not found', { status: 404 })
  }

  const manifest = montarWebAppManifest(empresa)
  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    },
  })
}
