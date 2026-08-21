import type {
  CheckoutFormData,
  PedidoPublicoCarrinhoItemInput,
} from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '@/src/shared/constants/deliveryPaisesTelefone'
import {
  comporTelefoneApi,
  telefoneNacionalValido,
} from '@/src/shared/utils/deliveryTelefonePais'

export type MontarPedidoPublicoParams = {
  slug: string
  itens: PedidoPublicoCarrinhoItemInput[]
  total: number
  form: CheckoutFormData
  /** Preenchido após garantir o endereço no cadastro (fluxo de entrega). */
  enderecoIdEntrega?: string | null
  /**
   * Telefone já resolvido (dígitos API). Use quando o input Celular foi limpo
   * após encontrar o cliente.
   */
  telefoneApi?: string | null
}

export type MontarPedidoPublicoResult =
  | { ok: true; payload: CreatePedidoPublicoInput }
  | { ok: false; error: string }

function extrairCpfPedido(
  cpfMascarado: string
): { ok: true; cpf: string | null } | { ok: false; error: string } {
  const digits = cpfMascarado.replace(/\D/g, '').slice(0, 11)
  if (!digits) return { ok: true, cpf: null }
  if (digits.length !== 11) {
    return { ok: false, error: 'Informe um CPF completo com 11 dígitos' }
  }
  return { ok: true, cpf: digits }
}

/** Monta o payload de create do pedido público a partir do checkout. */
export function montarPedidoPublico({
  slug,
  itens,
  total: _total,
  form,
  enderecoIdEntrega,
  telefoneApi,
}: MontarPedidoPublicoParams): MontarPedidoPublicoResult {
  const paisIso2 = form.telefonePaisIso2 || DELIVERY_PAIS_TELEFONE_PADRAO
  const telResolvido = (telefoneApi ?? '').replace(/\D/g, '')
  const tel =
    telResolvido.length >= 8
      ? telResolvido
      : telefoneNacionalValido(form.telefone, paisIso2)
        ? comporTelefoneApi(form.telefone, paisIso2)
        : ''

  if (tel.length < 8) {
    return { ok: false, error: 'Informe um telefone válido' }
  }
  if (itens.length === 0) {
    return { ok: false, error: 'Carrinho vazio' }
  }

  if (form.tipoEntrega === 'entrega') {
    if (form.modoEndereco === 'existente') {
      if (!form.enderecoIdSelecionado.trim() && !enderecoIdEntrega?.trim()) {
        return { ok: false, error: 'Selecione um endereço de entrega' }
      }
    } else if (!form.rua.trim() || !form.numero.trim() || !form.bairro.trim()) {
      return { ok: false, error: 'Preencha o endereço de entrega' }
    }
  }

  const cpfResult = extrairCpfPedido(form.cpfNotaFiscal)
  if (!cpfResult.ok) return cpfResult

  const produtos = itens.map(item => ({
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    observacoes: item.observacoes,
    complementos: item.complementos.map(c => ({
      complementoId: c.complementoId,
      grupoComplementoId: c.grupoComplementoId,
      quantidade: c.quantidade,
    })),
  }))

  const cliente: CreatePedidoPublicoInput['cliente'] = {
    telefone: tel,
    nome: form.nome.trim() || null,
  }

  if (cpfResult.cpf) {
    cliente.cpf = cpfResult.cpf
  }

  if (form.tipoEntrega === 'entrega') {
    const idEntrega = (enderecoIdEntrega ?? form.enderecoIdSelecionado).trim()
    if (!idEntrega) {
      return { ok: false, error: 'Endereço de entrega não resolvido' }
    }
    cliente.enderecoIdEntrega = idEntrega
  }

  const payload: CreatePedidoPublicoInput = {
    slug,
    origem: 'JIFFY_DELIVERY',
    tipoEntrega: form.tipoEntrega,
    cliente,
    produtos,
  }

  if (cpfResult.cpf) {
    payload.documentoCpfCnpj = cpfResult.cpf
  }

  if (form.pagamentos.length > 0) {
    payload.cobrancas = form.pagamentos.map(p => ({
      meioPagamentoId: p.meioPagamentoId,
      valor: p.valor,
      momentoCobranca: 'na_entrega',
    }))
  }

  const obsPedido = form.observacaoPedido.trim()
  if (obsPedido) {
    payload.observacoes = [obsPedido]
  }

  return { ok: true, payload }
}
