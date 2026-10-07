import type { PedidoDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/PedidoDeliveryPublicoDTO'
import type {
  EnderecoClienteDeliveryPublicoDTO,
  MeioPagamentoPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { ItemCarrinhoDelivery } from '@/src/domain/types/carrinho'
import type {
  StatusAcompanhamentoPedido,
  TransicaoAcompanhamentoPedido,
} from '@/src/domain/services/pedido/etapasAcompanhamentoPedido'
import type { DeliveryTipoEntrega } from '@/src/domain/types/entrega'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { formatarEnderecoEmpresa } from '@/src/shared/utils/formatarResumoEndereco'

export type PedidoPublicoConfirmadoView = {
  id: string
  codigoVenda: string | null
  slug: string
  tipoEntrega: DeliveryTipoEntrega
  statusDelivery: StatusAcompanhamentoPedido
  transicoesStatus: TransicaoAcompanhamentoPedido[]
  nome: string
  telefone: string
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  localizacaoEmpresa: GeoJsonPoint | null
  telefoneLoja: string | null
  nomeEmpresa: string | null
  itens: ItemCarrinhoDelivery[]
  total: number
  subtotal: number
  taxaEntrega: number
  troco: number
  pagamentos: Array<{
    meioPagamentoId: string
    valor: number
    meio: MeioPagamentoPublicoDTO | null
  }>
  observacaoPedido: string
  cpfNotaFiscal: string
}

function subtotalPedido(valorFinal: number, taxaEntrega: number): number {
  return Math.round((valorFinal - taxaEntrega) * 100) / 100
}

function meioPagamentoExibicao(nome: string, index: number): MeioPagamentoPublicoDTO {
  const id = `cobranca-${index}`
  return {
    id,
    nome,
    formaPagamentoFiscal: '',
    formaPagamentoFiscalLabel: '',
    isParcelavel: false,
    tipoParcelamento: '',
  }
}

/**
 * Traduz o DTO público do pedido para a visão da tela de confirmação.
 * Não completa campos com carrinho nem catálogo local.
 */
export function mapPedidoDeliveryPublicoParaConfirmado(
  pedido: PedidoDeliveryPublicoDTO
): PedidoPublicoConfirmadoView {
  const tipoEntrega = pedido.tipoEntrega
  const contexto = pedido.contextoEntrega
  const enderecoApi = contexto?.enderecoEntrega

  const enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null =
    tipoEntrega === 'entrega' && enderecoApi
      ? {
          id: 'pedido',
          etiqueta: enderecoApi.etiqueta,
          rua: enderecoApi.rua,
          numero: enderecoApi.numero ?? '',
          bairro: enderecoApi.bairro ?? '',
          cidade: enderecoApi.cidade ?? null,
          estado: enderecoApi.estado ?? null,
          cep: enderecoApi.cep,
          complemento: enderecoApi.complemento ?? null,
          enderecoLocalizacao: contexto?.enderecoLocalizacao ?? null,
          preferenciaEntrega: contexto?.localExatoEntrega ?? null,
        }
      : null

  const nome =
    pedido.clienteDelivery?.nome.trim() ||
    contexto?.destinatarioNome?.trim() ||
    ''

  const telefone =
    pedido.clienteDelivery?.telefone.trim() ||
    contexto?.destinatarioTelefone.trim() ||
    ''

  const itens: ItemCarrinhoDelivery[] = pedido.produtosLancados.map((produto, index) => ({
    id: `item-${index}`,
    produtoId: `item-${index}`,
    produtoNome: produto.nomeProduto,
    produtoImagemUrl: produto.imagemUrl,
    quantidade: produto.quantidade,
    valorUnitario: produto.valorUnitario,
    valorTotal: produto.valorFinal,
    observacoes: produto.observacoes.map(obs => obs.observacao).filter(obs => obs.trim()),
    complementos: produto.complementos.map((complemento, complementoIndex) => ({
      complementoId: `comp-${index}-${complementoIndex}`,
      grupoComplementoId: '',
      quantidade: complemento.quantidade,
      nome: complemento.nomeComplemento,
      valor: complemento.valorUnitario,
      tipoImpactoPreco: complemento.tipoImpactoPreco,
    })),
    adicionadoEm: '',
  }))

  const pagamentos = pedido.cobrancas.map((cobranca, index) => {
    const nomeMeio = cobranca.meioPagamentoNome.trim() || 'Pagamento'
    return {
      meioPagamentoId: `cobranca-${index}`,
      valor: cobranca.valor,
      meio: meioPagamentoExibicao(nomeMeio, index),
    }
  })

  const telefoneWhatsapp = pedido.telefoneWhatsapp?.trim() || null

  return {
    id: pedido.id,
    codigoVenda: pedido.codigoVenda.trim() || null,
    slug: pedido.empresa.slug.trim(),
    tipoEntrega,
    statusDelivery: pedido.statusDelivery,
    transicoesStatus: pedido.sequenciaTransicoes.map(transicao => ({
      status: transicao.status,
      realizadaEm: transicao.realizadaEm,
    })),
    nome,
    telefone,
    enderecoCliente,
    enderecoEmpresaTexto: formatarEnderecoEmpresa(pedido.empresa.endereco),
    localizacaoEmpresa: pedido.empresa.localizacao,
    telefoneLoja: telefoneWhatsapp || pedido.empresa.telefone,
    nomeEmpresa: pedido.empresa.nomeFantasia.trim() || null,
    itens,
    total: pedido.valorFinal,
    subtotal: subtotalPedido(pedido.valorFinal, pedido.taxaEntrega),
    taxaEntrega: pedido.taxaEntrega,
    troco: pedido.troco,
    pagamentos,
    observacaoPedido: pedido.observacoes
      .map(obs => obs.observacao.trim())
      .filter(Boolean)
      .join(' · '),
    cpfNotaFiscal: pedido.documentoCpfCnpj?.replace(/\D/g, '') ?? '',
  }
}
