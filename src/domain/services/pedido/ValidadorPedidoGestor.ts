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
  telefoneClienteDelivery?: string | null
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  enderecoEntregaTemGeo?: boolean
  enderecoEntregaCoberturaStatus?: 'ok' | 'fora' | 'pendente' | 'indisponivel' | null
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
  telefoneClienteDelivery?: string | null
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  /** Morada com coordenadas persistidas (obrigatório no create delivery com entrega). */
  enderecoEntregaTemGeo?: boolean
  /**
   * Cobertura da morada selecionada (delivery).
   * `ok` = dentro da área; `fora` = fora; `pendente` = calculando; `indisponivel` = falha ao verificar.
   */
  enderecoEntregaCoberturaStatus?: 'ok' | 'fora' | 'pendente' | 'indisponivel' | null
}): ValidacaoErroPedido | null {
  if (!params.pedidoDeliveryGestor) return null

  const telefoneDelivery = (params.telefoneClienteDelivery ?? '').replace(/\D/g, '')
  const temCliente =
    Boolean(params.clienteEntregaVinculadoId?.trim()) || telefoneDelivery.length >= 11

  if (!temCliente) {
    return { message: 'Informe o cliente do pedido antes de continuar.', goToStep: 2 }
  }

  if (params.pedidoComEntrega && !params.temEnderecoEntrega) {
    return { message: 'Selecione ou cadastre o endereço de entrega.', goToStep: 2 }
  }

  if (
    params.pedidoComEntrega &&
    params.temEnderecoEntrega &&
    params.enderecoEntregaTemGeo === false
  ) {
    return {
      message:
        'O endereço de entrega precisa ter geolocalização. Use “Localizar endereço” antes de continuar.',
      goToStep: 2,
      code: 'entrega',
    }
  }

  if (
    params.pedidoComEntrega &&
    params.temEnderecoEntrega &&
    params.enderecoEntregaTemGeo !== false
  ) {
    const cobertura = params.enderecoEntregaCoberturaStatus
    if (cobertura === 'fora') {
      return {
        message:
          'O endereço selecionado está fora da área de entrega. Escolha outro endereço para continuar.',
        goToStep: 2,
        code: 'entrega',
      }
    }
    if (cobertura === 'indisponivel') {
      return {
        message:
          'Não foi possível verificar a cobertura de entrega. Tente novamente em instantes.',
        goToStep: 2,
        code: 'entrega',
      }
    }
    if (cobertura === 'pendente' || cobertura == null) {
      return {
        message: 'Aguarde o cálculo da taxa de entrega deste endereço.',
        goToStep: 2,
        code: 'entrega',
      }
    }
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
    telefoneClienteDelivery: input.telefoneClienteDelivery,
    pedidoComEntrega: input.pedidoComEntrega,
    temEnderecoEntrega: input.temEnderecoEntrega,
    enderecoEntregaTemGeo: input.enderecoEntregaTemGeo,
    enderecoEntregaCoberturaStatus: input.enderecoEntregaCoberturaStatus,
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
