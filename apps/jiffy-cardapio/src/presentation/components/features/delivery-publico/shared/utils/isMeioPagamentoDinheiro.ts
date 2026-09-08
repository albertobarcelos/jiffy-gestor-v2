import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

/** Detecta pagamento em dinheiro pelo código fiscal ou pelo nome. */
export function isMeioPagamentoDinheiro(
  meio: Pick<MeioPagamentoPublicoDTO, 'nome' | 'formaPagamentoFiscal' | 'formaPagamentoFiscalLabel'> | null | undefined
): boolean {
  if (!meio) return false
  const fiscal = meio.formaPagamentoFiscal.trim().toLowerCase()
  if (fiscal === 'dinheiro' || fiscal === 'cash') return true

  const label = `${meio.nome} ${meio.formaPagamentoFiscalLabel}`.toLowerCase()
  return label.includes('dinheiro') || label.includes('cash')
}
