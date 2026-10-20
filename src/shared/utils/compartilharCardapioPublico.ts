import { buildCardapioLojaUrl } from '@/src/shared/utils/cardapioPublicUrl'

export function urlCardapioPublicoParaCompartilhar(
  slug: string,
  originFallback?: string
): string {
  return buildCardapioLojaUrl(slug, originFallback)
}

export function textoWhatsappCardapioPublico(
  nomeLoja: string | null | undefined,
  url: string
): string {
  const nome = nomeLoja?.trim()
  if (nome) {
    return `Olá! Peça pelo cardápio da ${nome}:\n${url}`
  }
  return `Olá! Peça pelo nosso cardápio:\n${url}`
}
