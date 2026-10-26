import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

export type CanalDeliveryMeioPagamento = 'ativoEntregaDelivery' | 'ativoRetiradaDelivery'

export function montarCorpoPatchCanalDelivery(
  channel: CanalDeliveryMeioPagamento,
  ativo: boolean
): Record<CanalDeliveryMeioPagamento, boolean> {
  return { [channel]: ativo } as Record<CanalDeliveryMeioPagamento, boolean>
}

/** Liga ou desliga um canal sem mexer no outro. */
export function aplicarToggleCanalDelivery(
  item: MeioPagamento,
  channel: CanalDeliveryMeioPagamento,
  ativo: boolean
): MeioPagamento {
  return MeioPagamento.create(
    item.getId(),
    item.getNome(),
    item.isTefAtivo(),
    item.getFormaPagamentoFiscal(),
    item.isAtivo(),
    item.isParcelavel(),
    item.getTipoParcelamento(),
    channel === 'ativoEntregaDelivery' ? ativo : item.isEntregaDelivery(),
    channel === 'ativoRetiradaDelivery' ? ativo : item.isRetiradaDelivery()
  )
}
