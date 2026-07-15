import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '../constants/deliveryPaisesTelefone'
import type { DeliveryCarrinhoItem } from '../stores/deliveryCarrinhoStore'
import { comporTelefoneApi, telefoneNacionalValido } from './deliveryTelefonePais'

export type CheckoutFormData = {
  tipoEntrega: 'entrega' | 'retirada'
  telefone: string
  /** ISO 3166-1 alpha-2 do país do celular (ex.: BR). */
  telefonePaisIso2: string
  nome: string
  /** Como o usuário quer resolver o endereço quando já existem cadastros. */
  modoEndereco: 'existente' | 'novo'
  enderecoIdSelecionado: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  complemento: string
  pontoReferencia: string
  etiquetaEndereco: 'casa' | 'trabalho' | 'outro'
  apelidoEndereco: string
  meioPagamentoId: string
  /** Valor informado para troco (dinheiro). `null` = sem troco. */
  trocoPara: number | null
  observacaoPedido: string
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
  const paisIso2 = form.telefonePaisIso2 || DELIVERY_PAIS_TELEFONE_PADRAO
  if (!telefoneNacionalValido(form.telefone, paisIso2)) {
    return { ok: false, error: 'Informe um telefone válido' }
  }
  const tel = comporTelefoneApi(form.telefone, paisIso2)
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

  const observacoes: string[] = []
  if (form.trocoPara != null && form.trocoPara > 0) {
    observacoes.push(
      `Troco para ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(form.trocoPara)}`
    )
  }
  const obsPedido = form.observacaoPedido.trim()
  if (obsPedido) {
    observacoes.push(obsPedido)
  }
  if (observacoes.length > 0) {
    payload.observacoes = observacoes
  }

  return { ok: true, payload }
}
