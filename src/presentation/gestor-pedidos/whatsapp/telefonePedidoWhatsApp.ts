import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { termoBuscaClientePorTelefone } from '@/src/shared/utils/telefoneClienteMatch'

/** WhatsApp manda DDI (55…). O campo do pedido usa DDD + número mascarado. */
export function telefoneWhatsAppParaCampoPedido(valor: string | null | undefined): string {
  const nacional = termoBuscaClientePorTelefone(String(valor ?? ''))
  if (nacional.length < 8) return ''
  return formatarTelefoneBr(nacional)
}

export function digitosTelefonePedidoWhatsApp(valor: string | null | undefined): string {
  const nacional = termoBuscaClientePorTelefone(String(valor ?? ''))
  return nacional.length >= 8 ? nacional : ''
}
