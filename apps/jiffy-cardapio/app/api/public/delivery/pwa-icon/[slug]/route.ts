import { NextResponse } from 'next/server'
import { gerarPwaIconPng } from '@/src/infrastructure/pwa/gerarPwaIconPng'
import { parsePwaIconSize } from '@/src/infrastructure/pwa/pwaIconSizes'
import { isReservedCardapioSlug } from '@/src/infrastructure/seo/reservedCardapioSlugs'

export const revalidate = 3600

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { slug: raw } = await context.params
  const slug = raw?.trim() ?? ''
  if (!slug || isReservedCardapioSlug(slug)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const size = parsePwaIconSize(searchParams.get('size'))

  try {
    const png = await gerarPwaIconPng(slug, size)
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse('Icon error', { status: 500 })
  }
}
