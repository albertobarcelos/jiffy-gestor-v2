import type { PedidoPublicoCarrinhoItemInput } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { DeliveryCheckoutCotacaoState } from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryCheckoutCotacaoUtils'

/** Fingerprint estável dos itens para cache de cotação (ordem independente). */
export function fingerprintItensCotacao(itens: PedidoPublicoCarrinhoItemInput[]): string {
  return [...itens]
    .map(item => {
      const comps = [...item.complementos]
        .map(c => `${c.grupoComplementoId}:${c.complementoId}:${c.quantidade}`)
        .sort()
        .join(',')
      const obs = [...item.observacoes].map(o => o.trim()).filter(Boolean).sort().join(',')
      return `${item.produtoId}:${item.quantidade}:{${comps}}{${obs}}`
    })
    .sort()
    .join('|')
}

export function publicDeliveryCotacaoQueryKey(params: {
  slug: string
  tipoEntrega: string
  enderecoIdEntrega: string
  telefone: string
  fingerprintItens: string
}) {
  return [
    'public-delivery',
    params.slug,
    'cotacao',
    params.tipoEntrega,
    params.enderecoIdEntrega || 'retirada',
    params.telefone,
    params.fingerprintItens,
  ] as const
}

export type CotacaoQueryCacheEntry = {
  state: DeliveryCheckoutCotacaoState
}
