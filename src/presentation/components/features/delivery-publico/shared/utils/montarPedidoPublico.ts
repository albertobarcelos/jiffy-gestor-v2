import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryCarrinhoItem } from '../stores/deliveryCarrinhoStore'

export type CheckoutFormData = {
  tipoEntrega: 'entrega' | 'retirada'
  telefone: string
  nome: string
  /** Como o usuário quer resolver o endereço quando já existem cadastros. */
  modoEndereco: 'existente' | 'novo'
  enderecoIdSelecionado: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  meioPagamentoId: string
}

type MontarPedidoParams = {
  slug: string
  itens: DeliveryCarrinhoItem[]
  total: number
  form: CheckoutFormData
  /** Preenchido após garantir o endereço no cadastro (fluxo de entrega). */
  enderecoIdEntrega?: string | null
}

export type MontarPedidoResult =
  | { ok: true; payload: CreatePedidoPublicoInput }
  | { ok: false; error: string }

export function montarPedidoPublico({
  slug,
  itens,
  total,
  form,
  enderecoIdEntrega,
}: MontarPedidoParams): MontarPedidoResult {
  const tel = form.telefone.replace(/\D/g, '')
  if (tel.length < 10) {
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
