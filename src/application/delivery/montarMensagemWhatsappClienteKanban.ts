import type { PedidoKanbanQuickViewData } from '@/src/presentation/components/features/delivery/kanban-panels/carregarPedidoKanbanQuickView'
import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import {
  montarDetalhesPedidoClienteWhatsapp,
  prefixarCabecalhoPedidoClienteWhatsapp,
} from './montarMensagemWhatsappHelpers'
import type { WhatsappClienteKanbanMensagemTipo } from './whatsappClienteKanbanMensagemTipos'
import { E } from './whatsappMensagemEmojis'

export function montarMensagemWhatsappClienteKanban(args: {
  clienteNome: string
  tipoMensagem: WhatsappClienteKanbanMensagemTipo
  tipoVenda: 'entrega' | 'retirada'
  dados: PedidoKanbanQuickViewData
  enderecoEmpresa: EnderecoEmpresaMe | null | undefined
}): string {
  const { tipoMensagem, tipoVenda, dados, enderecoEmpresa } = args

  switch (tipoMensagem) {
    case 'novo_pedido':
      return montarDetalhesPedidoClienteWhatsapp({
        dados,
        tipoVenda,
        enderecoEmpresa,
      })

    case 'em_preparo':
      return prefixarCabecalhoPedidoClienteWhatsapp(
        dados,
        `Aguarde, seu pedido já está sendo preparado com muito carinho! ${E.heart}`
      )

    case 'em_rota_entrega':
      return prefixarCabecalhoPedidoClienteWhatsapp(
        dados,
        `Seu pedido saiu para entrega! ${E.scooter}${E.dash}`
      )

    case 'retirada':
      return prefixarCabecalhoPedidoClienteWhatsapp(
        dados,
        `Seu pedido está pronto. Pode vir retirar! ${E.blush}${E.pin}`
      )

    case 'finalizada':
      return prefixarCabecalhoPedidoClienteWhatsapp(dados, [
        `Olá! Seu pedido foi preparado e entregue com muito carinho. ${E.love}`,
        'Compartilhe sua experiência conosco, pois a sua opinião é o que nos ajuda a melhorar !!',
        `Parabéns por sua escolha, volte sempre. ${E.love}.`,
      ])
  }
}
