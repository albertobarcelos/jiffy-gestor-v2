import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryCarrinhoItem } from '../stores/deliveryCarrinhoStore'

export type CheckoutFormData = {
  tipoEntrega: 'entrega' | 'retirada'
  telefone: string
  nome: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  meioPagamentoId: string
}

type MontarPedidoParams = {
  slug: string
  itens: DeliveryCarrinhoItem[]
  total: number
  form: CheckoutFormData
}

export type MontarPedidoResult =
  | { ok: true; payload: CreatePedidoPublicoInput }
  | { ok: false; error: string }

export function montarPedidoPublico({
  slug,
  itens,
  total,
  form,
}: MontarPedidoParams): MontarPedidoResult {
  const tel = form.telefone.replace(/\D/g, '')
  if (tel.length < 10) {
    return { ok: false, error: 'Informe um telefone válido' }
  }
  if (itens.length === 0) {
    return { ok: false, error: 'Carrinho vazio' }
  }
  if (
    form.tipoEntrega === 'entrega' &&
    (!form.rua.trim() || !form.numero.trim() || !form.bairro.trim())
  ) {
    return { ok: false, error: 'Preencha o endereço de entrega' }
  }

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

  if (form.tipoEntrega === 'entrega') {
    cliente.enderecos = [
      {
        etiqueta: 'casa',
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim() || null,
      },
    ]
  }

  const payload: CreatePedidoPublicoInput = {
    slug,
    origem: 'JIFFY_DELIVERY',
    tipoEntrega: form.tipoEntrega,
    cliente,
    produtos,
  }

  if (form.meioPagamentoId) {
    payload.cobrancas = [
      {
        meioPagamentoId: form.meioPagamentoId,
        valor: total,
        momentoCobranca: 'na_entrega',
      },
    ]
  }

  return { ok: true, payload }
}
