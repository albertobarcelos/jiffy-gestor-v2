import { validarQuantidadesComplementosLinha } from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import { pagamentosCobremTotalPedido } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import type { PagamentoSelecionado, ProdutoSelecionado, StatusVenda } from '@/src/domain/types/pedido'

export type ValidacaoErroPedido = {
  message: string
  goToStep?: 1 | 2 | 3
  code?: 'pagamentos_total' | 'produtos' | 'complementos' | 'entrega' | 'pagamento_entrega'
}

export type ValidarPedidoGestorInput = {
  produtosCount: number
  produtos?: ProdutoSelecionado[]
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  pedidoGestorComPagamentoNoPasso3: boolean
  pedidoEntregaAceitaPagamentoPendente: boolean
  pagamentosCount: number
  entregaComCobrancaPeloEntregador: boolean
  pedidoComRetirada: boolean
  totalProdutos: number
  totalPagamentos: number
  troco: number
  status: StatusVenda
  pagamentos: PagamentoSelecionado[]
}

export type ValidarPedidoGestorResult = {
  podeSubmeter: boolean
  erros: ValidacaoErroPedido[]
  goToStep?: 1 | 2 | 3
}

export function validarInformacoesPedidoEntrega(params: {
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
}): ValidacaoErroPedido | null {
  if (!params.pedidoDeliveryGestor) return null

  if (!params.clienteEntregaVinculadoId?.trim()) {
    return { message: 'Informe o cliente do pedido antes de continuar.', goToStep: 2 }
  }

  if (params.pedidoComEntrega && !params.temEnderecoEntrega) {
    return { message: 'Selecione ou cadastre o endereço de entrega.', goToStep: 2 }
  }

  return null
}

function validarPagamentosObrigatorios(
  input: ValidarPedidoGestorInput
): ValidacaoErroPedido | null {
  if (
    input.pedidoGestorComPagamentoNoPasso3 &&
    !input.pedidoEntregaAceitaPagamentoPendente &&
    input.pagamentosCount === 0
  ) {
    return { message: 'Adicione pelo menos uma forma de pagamento', goToStep: 3 }
  }

  if (input.entregaComCobrancaPeloEntregador && input.pagamentosCount === 0) {
    return {
      message: input.pedidoComRetirada
        ? 'Informe como o cliente irá pagar na retirada.'
        : 'Informe como o cliente irá pagar na entrega.',
      goToStep: 3,
      code: 'pagamento_entrega',
    }
  }

  return null
}

function validarTotaisPagamento(input: ValidarPedidoGestorInput): ValidacaoErroPedido | null {
  if (input.pedidoEntregaAceitaPagamentoPendente) {
    if (input.entregaComCobrancaPeloEntregador) {
      if (input.produtosCount === 0 || input.pagamentosCount === 0) {
        return {
          message: 'Informe produtos e forma de pagamento para cobrança na entrega.',
          goToStep: 3,
        }
      }
      return null
    }
    if (input.pagamentosCount === 0) {
      return { message: 'Adicione pelo menos uma forma de pagamento', goToStep: 3 }
    }
    if (
      !pagamentosCobremTotalPedido(
        input.totalProdutos,
        input.totalPagamentos,
        input.troco
      )
    ) {
      return {
        message: 'Valor dos pagamentos não corresponde ao total do pedido.',
        code: 'pagamentos_total',
        goToStep: 3,
      }
    }
    return null
  }

  if (!input.pedidoGestorComPagamentoNoPasso3) return null

  if (input.pagamentosCount === 0) {
    return { message: 'Adicione pelo menos uma forma de pagamento', goToStep: 3 }
  }

  const statusExigePagamentoCompleto =
    input.status === 'FINALIZADA' || input.status === 'PENDENTE_EMISSAO'

  if (statusExigePagamentoCompleto && input.pagamentos.some(p => p.naoEfetivo)) {
    return {
      message: 'Remova pagamentos não efetivos antes de finalizar.',
      goToStep: 3,
    }
  }

  if (
    !pagamentosCobremTotalPedido(
      input.totalProdutos,
      input.totalPagamentos,
      input.troco
    )
  ) {
    return {
      message: 'Valor dos pagamentos não corresponde ao total do pedido.',
      code: 'pagamentos_total',
      goToStep: 3,
    }
  }

  return null
}

function validarComplementosProdutos(
  produtos?: ProdutoSelecionado[]
): ValidacaoErroPedido | null {
  if (!produtos?.length) return null

  for (const produto of produtos) {
    const resultado = validarQuantidadesComplementosLinha(produto)
    if (!resultado.valido) {
      return {
        message: resultado.mensagem ?? 'Quantidade de complemento inválida para o produto.',
        goToStep: 1,
        code: 'complementos',
      }
    }
  }

  return null
}

export function validarPedidoGestor(
  input: ValidarPedidoGestorInput
): ValidarPedidoGestorResult {
  const erros: ValidacaoErroPedido[] = []

  if (input.produtosCount === 0) {
    erros.push({ message: 'Adicione pelo menos um produto', goToStep: 1 })
  }

  const erroComplementos = validarComplementosProdutos(input.produtos)
  if (erroComplementos) erros.push(erroComplementos)

  const erroEntrega = validarInformacoesPedidoEntrega({
    pedidoDeliveryGestor: input.pedidoDeliveryGestor,
    clienteEntregaVinculadoId: input.clienteEntregaVinculadoId,
    pedidoComEntrega: input.pedidoComEntrega,
    temEnderecoEntrega: input.temEnderecoEntrega,
  })
  if (erroEntrega) erros.push(erroEntrega)

  const erroPagObrigatorio = validarPagamentosObrigatorios(input)
  if (erroPagObrigatorio) erros.push(erroPagObrigatorio)

  const erroTotais = validarTotaisPagamento(input)
  if (erroTotais) erros.push(erroTotais)

  const primeiro = erros[0]
  return {
    podeSubmeter: erros.length === 0,
    erros,
    goToStep: primeiro?.goToStep,
  }
}
