import type {
  GetMeiosPagamentoPublicosResponseDTO,
  MeioPagamentoPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { resolverFlagsCanalDelivery } from '@/src/domain/policies/FiltrarMeiosPagamentoPorTipoEntrega'

export function normalizarMeioPagamentoPublico(
  meio: MeioPagamentoPublicoDTO
): MeioPagamentoPublicoDTO {
  return {
    ...meio,
    ...resolverFlagsCanalDelivery(meio),
  }
}

export function normalizarMeiosPagamentoPublicos(
  resposta: GetMeiosPagamentoPublicosResponseDTO
): GetMeiosPagamentoPublicosResponseDTO {
  return {
    meiosPagamento: (resposta.meiosPagamento ?? []).map(normalizarMeioPagamentoPublico),
  }
}
