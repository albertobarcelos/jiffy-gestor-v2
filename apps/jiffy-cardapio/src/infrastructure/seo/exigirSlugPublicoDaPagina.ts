import { notFound, redirect } from 'next/navigation'
import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import { isReservedCardapioSlug } from './reservedCardapioSlugs'

/** Adapter da página: aplica o slug oficial e redireciona se a URL veio suja. */
export function exigirSlugPublicoDaPagina(
  raw: string | undefined,
  restoDoCaminho = ''
): string {
  const slug = normalizarSlugPublico(raw ?? '')
  if (!slug || isReservedCardapioSlug(slug)) notFound()

  const bruto = (raw ?? '').trim()
  if (bruto !== slug) {
    const sufixo =
      restoDoCaminho === '' || restoDoCaminho.startsWith('/')
        ? restoDoCaminho
        : `/${restoDoCaminho}`
    redirect(`/${slug}${sufixo}`)
  }

  return slug
}
