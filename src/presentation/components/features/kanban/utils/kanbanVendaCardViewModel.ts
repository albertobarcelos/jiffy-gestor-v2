import { temSeloCanalMarketplace } from '@/src/domain/policies/pedido/origemCanalMarketplace'
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
  const tipoEntrega = venda.tipoAtendimento()
  const isDeliveryOuRetirada = tipoVendaStr === 'delivery'
  const isPedidoBalcaoGestor = venda.tabelaOrigem === 'venda_gestor' && !isDeliveryOuRetirada

  const tipoVendaExibicao: TipoVendaExibicaoCard =
    venda.tabelaOrigem === 'venda_gestor'
      ? isDeliveryOuRetirada
        ? tipoEntrega ?? 'delivery'
        : 'gestor'
      : (venda.tipoVenda ?? '')

  const prefixoLinhaOrigemCard =
    venda.tabelaOrigem === 'venda_gestor' && isDeliveryOuRetirada
      ? tipoEntrega === 'retirada'
        ? 'Retirada'
        : tipoEntrega === 'entrega'
          ? 'Entrega'
          : 'Delivery'
      : isPedidoBalcaoGestor
        ? 'Balcão'
        : (venda.origem ?? '')

  const exibirColunaTipoVenda = Boolean(
    tipoVendaExibicao &&
      (tipoVendaExibicao === 'balcao' ||
        tipoVendaExibicao === 'mesa' ||
        tipoVendaExibicao === 'gestor' ||
        tipoVendaExibicao === 'entrega' ||
        tipoVendaExibicao === 'retirada' ||
        tipoVendaExibicao === 'delivery')
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

export function codigoVendaKanban(venda: Venda): string | null {
  const codigo = String(venda.codigoVenda ?? '').trim()
  return codigo ? `#${codigo}` : null
}

export function rotuloNumeroVendaKanban(venda: Venda): string {
  return `Pedido ${venda.numeroVenda}`
}

export function exibirSeloCanalMarketplace(origem: string | null | undefined): boolean {
  return temSeloCanalMarketplace(origem)
}

export function linhaIdentificacaoVendaKanban(venda: Venda): string {
  const codigo = codigoVendaKanban(venda)
  return codigo ? `${rotuloNumeroVendaKanban(venda)} - ${codigo}` : rotuloNumeroVendaKanban(venda)
}
