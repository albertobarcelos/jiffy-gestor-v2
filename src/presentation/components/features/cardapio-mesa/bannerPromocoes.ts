export type BannerPromocao = {
  id: string
  imagemUrl: string
  titulo?: string
  link?: string
}

/** Mock V1 — mesmas 3 imagens da tip antiga do cardápio mesa. */
export const PROMOCOES_MOCK_CARDAPIO_MESA: BannerPromocao[] = [
  { id: '1', imagemUrl: '/images/promo-1.png', titulo: 'Promoção 1' },
  { id: '2', imagemUrl: '/images/promo-2.png', titulo: 'Promoção 2' },
  { id: '3', imagemUrl: '/images/promo-3.png', titulo: 'Promoção 3' },
]
