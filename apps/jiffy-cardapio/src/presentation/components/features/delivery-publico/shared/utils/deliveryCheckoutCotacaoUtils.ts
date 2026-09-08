import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export type DeliveryCheckoutCotacaoState = {
  tokenCotacao: string
  expiresAt: string
  subtotalProdutos: number
  taxaEntrega: number
  valorFinal: number
}

export function mapCotacaoDtoToCheckoutState(
  dto: CotacaoPedidoPublicoDTO
): DeliveryCheckoutCotacaoState {
  return {
    tokenCotacao: dto.tokenCotacao,
    expiresAt: dto.expiresAt,
    subtotalProdutos: dto.subtotalProdutos,
    taxaEntrega: dto.entrega?.taxaEntrega ?? 0,
    valorFinal: dto.valorFinal,
  }
}

export function isTokenCotacaoExpirado(expiresAt: string): boolean {
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts)) return true
  return ts <= Date.now()
}
