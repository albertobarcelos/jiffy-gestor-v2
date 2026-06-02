import type {
  CriarVendaGestorInputDTO,
  CriarVendaGestorPayload,
  CriarVendaGestorResultDTO,
} from '@/src/application/dto/CriarVendaGestorDTO'
import { buildCriarVendaGestorPayload } from '@/src/application/mappers/CriarVendaPayloadMapper'
import {
  validarInformacoesPedidoEntrega,
  validarPedidoGestor,
} from '@/src/domain/services/pedido/ValidadorPedidoGestor'
import type { PagamentoSelecionado, StatusVenda } from '@/src/domain/types/pedido'

export type CriarVendaGestorMutateFn = (payload: CriarVendaGestorPayload) => Promise<unknown>

export type ValidacaoCriarVendaResult =
  | { ok: true }
  | {
      ok: false
      message: string
      goToStep?: 1 | 2 | 3
      code?: 'pagamentos_total'
    }

export interface ValidarCriarVendaParams {
  produtosCount: number
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
  status?: StatusVenda
  pagamentos?: PagamentoSelecionado[]
}

export function validarInformacoesPedido(params: {
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  exibirToast?: boolean
  onError?: (message: string) => void
}): boolean {
  const erro = validarInformacoesPedidoEntrega({
    pedidoDeliveryGestor: params.pedidoDeliveryGestor,
    clienteEntregaVinculadoId: params.clienteEntregaVinculadoId,
    pedidoComEntrega: params.pedidoComEntrega,
    temEnderecoEntrega: params.temEnderecoEntrega,
  })
  if (!erro) return true
  if (params.exibirToast) {
    params.onError?.(erro.message)
  }
  return false
}

export function validarCriarVendaGestor(params: ValidarCriarVendaParams): ValidacaoCriarVendaResult {
  const resultado = validarPedidoGestor({
    ...params,
    status: params.status ?? 'ABERTA',
    pagamentos: params.pagamentos ?? [],
  })

  if (resultado.podeSubmeter) return { ok: true }

  const primeiro = resultado.erros[0]
  return {
    ok: false,
    message: primeiro?.message ?? 'Validação do pedido falhou.',
    goToStep: primeiro?.goToStep ?? resultado.goToStep,
    code: primeiro?.code === 'pagamentos_total' ? 'pagamentos_total' : undefined,
  }
}

export class CriarVendaGestorUseCase {
  buildPayload(input: CriarVendaGestorInputDTO): CriarVendaGestorResultDTO {
    const payload = buildCriarVendaGestorPayload(input)
    return { payload }
  }

  async execute(
    input: CriarVendaGestorInputDTO,
    mutate: CriarVendaGestorMutateFn
  ): Promise<unknown> {
    const { payload } = this.buildPayload(input)
    console.log('📤 Payload sendo enviado:', JSON.stringify(payload, null, 2))
    return mutate(payload)
  }
}

export { parseCriarVendaGestorApiResponse as extrairIdVendaCriada } from '@/src/application/mappers/VendaApiNormalizer'
