import type {
  AtualizarPedidoDeliveryApiRequest,
  TipoEntregaDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import { buildUpdateEnderecoEntregaPedidoPayload } from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import {
  buildSalvarTaxaPedidoDeliveryPatch,
  extrairCobrancasPendentesNaEntregaPedidoDelivery,
  extrairTaxaEntregaAtivaPedidoDelivery,
  pedidoDeliveryEstaPago,
} from '@/src/application/mappers/TaxaPedidoDeliveryPayloadMapper'

export type EnderecoManualAlterarTipoEntregaInput = {
  tipoEtiqueta?: string | null
  endereco: {
    rua: string
    numero: string
    bairro: string
    cidade?: string
    estado?: string
    cep?: string
    complemento?: string
  }
}

export type BuildAlterarTipoEntregaPedidoDeliveryPatchInput = {
  tipoSelecionado: TipoEntregaDeliveryApi
  pedido: Record<string, unknown>
  enderecoDeliveryId?: string | null
  enderecoManual?: EnderecoManualAlterarTipoEntregaInput | null
}

/**
 * Monta PATCH atômico para trocar `tipoEntrega` após criação do pedido.
 * - retirada: remove taxa ativa (se pedido não pago) e ajusta cobrança `na_entrega`.
 * - entrega: exige `enderecoEntrega` (morada salva ou correção manual).
 */
export function buildAlterarTipoEntregaPedidoDeliveryPatch(
  args: BuildAlterarTipoEntregaPedidoDeliveryPatchInput
): AtualizarPedidoDeliveryApiRequest {
  const patch: AtualizarPedidoDeliveryApiRequest = {
    tipoEntrega: args.tipoSelecionado,
  }

  if (args.tipoSelecionado === 'retirada') {
    if (!pedidoDeliveryEstaPago(args.pedido)) {
      const { taxaId, valor } = extrairTaxaEntregaAtivaPedidoDelivery(args.pedido)
      if (taxaId) {
        const cobrancasPendentes = extrairCobrancasPendentesNaEntregaPedidoDelivery(args.pedido)
        const { patch: taxaPatch } = buildSalvarTaxaPedidoDeliveryPatch({
          taxaAtualId: taxaId,
          taxaAtualValor: valor,
          taxaSelecionadaId: null,
          taxaSelecionadaValor: 0,
          cobrancasPendentesNaEntrega: cobrancasPendentes,
        })
        patch.taxas = taxaPatch.taxas
        patch.cobrancas = taxaPatch.cobrancas
      }
    }
    return patch
  }

  const enderecoPayload = buildUpdateEnderecoEntregaPedidoPayload({
    enderecoDeliveryId: args.enderecoDeliveryId,
    enderecoManual: args.enderecoManual,
  })
  patch.enderecoEntrega = enderecoPayload.enderecoEntrega
  return patch
}
