import type { MoradaTelefone } from '@/src/domain/types/moradaEntrega'
import type {
  FluxoPagamentoEntrega,
  PagamentoSelecionado,
  ProdutoSelecionado,
  TipoAtendimentoDelivery,
} from '@/src/domain/types/pedido'

export type RascunhoPedidoWhatsApp = {
  currentStep: 1 | 2 | 3 | 4
  produtos: ProdutoSelecionado[]
  observacaoPedido: string
  pagamentos: PagamentoSelecionado[]
  clienteId: string
  clienteNome: string
  clienteEntregaVinculado: { id: string; nome: string } | null
  moradaEntregaSelecionada: MoradaTelefone | null
  telefoneBuscaEntrega: string
  telefoneBuscadoEntrega: string | null
  tipoAtendimentoDelivery: TipoAtendimentoDelivery
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
  taxaEntregaId: string
  tempoPrevistoMinutos: number
  enderecoEntregaCoberturaStatus: 'ok' | 'fora' | 'pendente' | 'indisponivel' | null
  enderecoEntregaCoberturaValorTaxa: number | null
}

export function criarRascunhoPedidoWhatsAppVazio(): RascunhoPedidoWhatsApp {
  return {
    currentStep: 1,
    produtos: [],
    observacaoPedido: '',
    pagamentos: [],
    clienteId: '',
    clienteNome: '',
    clienteEntregaVinculado: null,
    moradaEntregaSelecionada: null,
    telefoneBuscaEntrega: '',
    telefoneBuscadoEntrega: null,
    tipoAtendimentoDelivery: 'entrega',
    fluxoPagamentoEntrega: 'cobrar_entregador',
    taxaEntregaId: '',
    tempoPrevistoMinutos: 45,
    enderecoEntregaCoberturaStatus: null,
    enderecoEntregaCoberturaValorTaxa: null,
  }
}

const CACHE = new Map<string, RascunhoPedidoWhatsApp>()

function clonar<T>(valor: T): T {
  if (typeof structuredClone === 'function') return structuredClone(valor)
  return JSON.parse(JSON.stringify(valor)) as T
}

export function rascunhoPedidoWhatsAppTemItens(rascunho: RascunhoPedidoWhatsApp): boolean {
  return (
    rascunho.produtos.length > 0 ||
    rascunho.pagamentos.length > 0 ||
    Boolean(rascunho.clienteId) ||
    Boolean(rascunho.observacaoPedido.trim()) ||
    rascunho.currentStep > 1
  )
}

export function obterRascunhoPedidoWhatsApp(chave: string): RascunhoPedidoWhatsApp | null {
  const id = chave.trim()
  if (!id) return null
  const atual = CACHE.get(id)
  return atual ? clonar(atual) : null
}

export function salvarRascunhoPedidoWhatsApp(
  chave: string,
  rascunho: RascunhoPedidoWhatsApp
): void {
  const id = chave.trim()
  if (!id) return
  if (!rascunhoPedidoWhatsAppTemItens(rascunho)) {
    CACHE.delete(id)
    return
  }
  CACHE.set(id, clonar(rascunho))
}

export function limparRascunhoPedidoWhatsApp(chave: string): void {
  const id = chave.trim()
  if (!id) return
  CACHE.delete(id)
}

export function limparTodosRascunhosPedidoWhatsApp(): void {
  CACHE.clear()
}
