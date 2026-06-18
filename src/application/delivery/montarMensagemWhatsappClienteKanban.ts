import type { PedidoKanbanQuickViewData } from '@/src/presentation/components/features/kanban/carregarPedidoKanbanQuickView'
import type { ColunaKanbanId } from '@/src/presentation/components/features/kanban/types'
import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import {
  montarDetalhesPedidoClienteWhatsapp,
  resolverNomeClienteWhatsapp,
} from './montarMensagemWhatsappHelpers'
import { E } from './whatsappMensagemEmojis'

export function montarMensagemWhatsappClienteKanban(args: {
  clienteNome: string
  colunaAtual: ColunaKanbanId
  tipoVenda: 'entrega' | 'retirada'
  dados: PedidoKanbanQuickViewData
  enderecoEmpresa: EnderecoEmpresaMe | null | undefined
  numeroVenda?: number | null
  nomeEmpresa?: string
}): string {
  const { clienteNome, colunaAtual, tipoVenda, dados, enderecoEmpresa } = args
  const nome = resolverNomeClienteWhatsapp(clienteNome)

  switch (colunaAtual) {
    case 'NOVOS_PEDIDOS':
      return montarDetalhesPedidoClienteWhatsapp({
        dados,
        tipoVenda,
        enderecoEmpresa,
      })

    case 'EM_PREPARO':
    case 'PRONTO_ENTREGA':
      return [
        `Ótimo pedido, ${nome}! ${E.smile}`,
        '',
        `Aguarde, seu pedido já está sendo preparado com muito carinho! ${E.heart}`,
      ].join('\n')

    case 'EM_ROTA':
      if (tipoVenda === 'retirada') {
        return `Seu pedido está pronto. Pode vir retirar! ${E.blush}${E.pin}`
      }
      return `Seu pedido saiu para entrega! ${E.scooter}${E.dash}`

    case 'FINALIZADAS':
      return [
        `Olá! Seu pedido foi preparado e entregue com muito carinho. ${E.love}`,
        'Compartilhe sua experiência conosco, pois a sua opinião é o que nos ajuda a melhorar !!',
        `Parabéns por sua escolha, volte sempre. ${E.love}.`,
      ].join('\n')

    default:
      return [
        `Ótimo pedido, ${nome}! ${E.smile}`,
        '',
        `Aguarde, seu pedido já está sendo preparado com muito carinho! ${E.heart}`,
      ].join('\n')
  }
}
