import type { CreatePedidoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'
import type {
  EnderecoClienteDeliveryPublicoDTO,
  MeioPagamentoPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryCarrinhoItem } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'
import type { DeliveryTipoEntrega } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryPreferenciaEntregaStore'

export type PedidoPublicoConfirmadoSnapshot = {
  codigoVenda: string | null
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  nome: string
  telefone: string
  telefonePaisIso2: string
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  itens: DeliveryCarrinhoItem[]
  total: number
  pagamentos: Array<{
    meioPagamentoId: string
    valor: number
    meio: MeioPagamentoPublicoDTO | null
  }>
  observacaoPedido: string
  cpfNotaFiscal: string
}

export type MapPedidoPublicoConfirmadoFallback = {
  /** Contexto local do checkout — preenchido quando a API omite algo. */
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  nome: string
  telefone: string
  telefonePaisIso2: string
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  itensCarrinho: DeliveryCarrinhoItem[]
  total: number
  pagamentos: Array<{
    meioPagamentoId: string
    valor: number
    meio: MeioPagamentoPublicoDTO | null
  }>
  observacaoPedido: string
  cpfNotaFiscal: string
  meiosPagamento: MeioPagamentoPublicoDTO[]
}

/**
 * Monta o snapshot da tela de sucesso/detalhes a partir do response do POST,
 * com fallback do checkout local para campos que a API não traz (ex.: imagem).
 */
export function mapPedidoPublicoCriadoParaConfirmado(
  pedido: CreatePedidoPublicoResponseDTO,
  fallback: MapPedidoPublicoConfirmadoFallback
): PedidoPublicoConfirmadoSnapshot {
  const tipoEntrega = pedido.tipoEntrega ?? fallback.tipoEntrega
  const modoTempo = pedido.pedidoAgendado ? 'agendado' : fallback.modoTempo

  const nome =
    pedido.cliente?.nome?.trim() ||
    pedido.contextoEntrega?.destinatarioNome?.trim() ||
    fallback.nome

  const telefone =
    pedido.contextoEntrega?.destinatarioTelefone?.trim() || fallback.telefone

  const enderecoApi = pedido.contextoEntrega?.enderecoEntrega
  const enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null =
    tipoEntrega === 'entrega' && enderecoApi
      ? {
          id: 'pedido-confirmado',
          etiqueta: enderecoApi.etiqueta || 'outro',
          rua: enderecoApi.rua,
          numero: enderecoApi.numero ?? '',
          bairro: enderecoApi.bairro ?? '',
          cidade: enderecoApi.cidade,
          estado: enderecoApi.estado,
          cep: enderecoApi.cep,
          complemento: enderecoApi.complemento,
        }
      : tipoEntrega === 'entrega'
        ? fallback.enderecoCliente
        : null

  const imagemPorProdutoId = new Map(
    fallback.itensCarrinho.map(item => [item.produtoId, item.produtoImagemUrl] as const)
  )

  const itensFromApi: DeliveryCarrinhoItem[] = pedido.produtosLancados.map(p => ({
    id: p.id,
    produtoId: p.produtoId,
    produtoNome: p.nomeProduto,
    produtoImagemUrl: imagemPorProdutoId.get(p.produtoId) ?? null,
    quantidade: p.quantidade,
    valorUnitario: p.valorUnitario,
    valorTotal: p.valorFinal,
    observacoes: p.observacoes,
    complementos: p.complementos.map(c => ({
      complementoId: c.complementoId,
      grupoComplementoId: c.grupoComplementoId,
      quantidade: c.quantidade,
      nome: c.nomeComplemento,
      valor: c.valorUnitario,
      tipoImpactoPreco: c.tipoImpactoPreco,
    })),
    adicionadoEm: new Date().toISOString(),
  }))

  const meiosById = new Map(fallback.meiosPagamento.map(m => [m.id, m] as const))
  const pagamentosFromApi = pedido.cobrancas.map(c => ({
    meioPagamentoId: c.meioPagamentoId,
    valor: c.valor,
    meio: meiosById.get(c.meioPagamentoId) ?? null,
  }))

  const observacaoPedido =
    pedido.observacoes.length > 0
      ? pedido.observacoes.join(' · ')
      : fallback.observacaoPedido

  const cpfNotaFiscal =
    pedido.documentoCpfCnpj?.replace(/\D/g, '') ||
    pedido.contextoEntrega?.destinatarioCpf?.replace(/\D/g, '') ||
    fallback.cpfNotaFiscal.replace(/\D/g, '')

  return {
    codigoVenda: pedido.codigoVenda,
    tipoEntrega,
    modoTempo,
    nome,
    telefone,
    telefonePaisIso2: fallback.telefonePaisIso2,
    enderecoCliente,
    enderecoEmpresaTexto: fallback.enderecoEmpresaTexto,
    itens: itensFromApi.length > 0 ? itensFromApi : fallback.itensCarrinho,
    total: pedido.valorFinal ?? fallback.total,
    pagamentos: pagamentosFromApi.length > 0 ? pagamentosFromApi : fallback.pagamentos,
    observacaoPedido,
    cpfNotaFiscal,
  }
}
