export function cardapioPublicBaseUrl(): string {
  const raw =
    process.env.CARDAPIO_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL?.trim() ||
    'https://cardapio.jiffy.run'
  return raw.replace(/\/$/, '')
}

export function cardapioSlugUrl(slug: string): string {
  return `${cardapioPublicBaseUrl()}/${encodeURIComponent(slug.trim())}`
}
