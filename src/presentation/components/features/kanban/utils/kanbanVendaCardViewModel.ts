import type { Venda } from '../types'

export type TipoVendaExibicaoCard =
  | 'balcao'
  | 'mesa'
  | 'gestor'
  | 'entrega'
  | 'retirada'
  | string

export interface KanbanVendaCardTipoVendaViewModel {
  tipoVendaStr: string
  isDeliveryOuRetirada: boolean
  isPedidoBalcaoGestor: boolean
  tipoVendaExibicao: TipoVendaExibicaoCard
  prefixoLinhaOrigemCard: string
  exibirColunaTipoVenda: boolean
}

export function derivarTipoVendaCardKanban(venda: Venda): KanbanVendaCardTipoVendaViewModel {
  const tipoVendaStr = String(venda.tipoVenda ?? '').trim().toLowerCase()
  const isDeliveryOuRetirada = tipoVendaStr === 'entrega' || tipoVendaStr === 'retirada'
  const isPedidoBalcaoGestor = venda.tabelaOrigem === 'venda_gestor' && !isDeliveryOuRetirada

  const tipoVendaExibicao: TipoVendaExibicaoCard =
    venda.tabelaOrigem === 'venda_gestor'
      ? isDeliveryOuRetirada
        ? tipoVendaStr
        : 'gestor'
      : (venda.tipoVenda ?? '')

  const prefixoLinhaOrigemCard =
    venda.tabelaOrigem === 'venda_gestor' && isDeliveryOuRetirada
      ? tipoVendaStr === 'retirada'
        ? 'Retirada'
        : 'Entrega'
      : isPedidoBalcaoGestor
        ? 'Balcão'
        : venda.origem

  const exibirColunaTipoVenda = Boolean(
    tipoVendaExibicao &&
      (tipoVendaExibicao === 'balcao' ||
        tipoVendaExibicao === 'mesa' ||
        tipoVendaExibicao === 'gestor' ||
        tipoVendaExibicao === 'entrega' ||
        tipoVendaExibicao === 'retirada')
  )

  return {
    tipoVendaStr,
    isDeliveryOuRetirada,
    isPedidoBalcaoGestor,
    tipoVendaExibicao,
    prefixoLinhaOrigemCard,
    exibirColunaTipoVenda,
  }
}

export function linhaIdentificacaoVendaKanban(venda: Venda): string {
  return `Venda ${venda.numeroVenda}${venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}`
}
