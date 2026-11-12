import type {
  CobrancaAppEntregador,
  PedidoResumoAppEntregador,
} from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'

export const CHAVE_CACHE_PEDIDOS_ENTREGADOR_APP = 'jiffy.expedicao.app.pedidos.v1'
export const CACHE_PEDIDOS_ENTREGADOR_MAX_MS = 24 * 60 * 60 * 1000

export function montarCachePedidosEntregadorApp(input: {
  entregadorId: string
  pedidos: PedidoResumoAppEntregador[]
  gravadoEm: number
}): string {
  return JSON.stringify({
    v: 1,
    entregadorId: input.entregadorId,
    pedidos: input.pedidos,
    gravadoEm: input.gravadoEm,
  })
}

function texto(valor: unknown, fallback = ''): string {
  return typeof valor === 'string' ? valor : fallback
}

function textoOpcional(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

function numero(valor: unknown, fallback = 0): number {
  const n = Number(valor)
  return Number.isFinite(n) ? n : fallback
}

function numeroOpcional(valor: unknown): number | null {
  if (valor == null || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function parseCobrancaCacheApp(raw: unknown): CobrancaAppEntregador | null {
  if (!raw || typeof raw !== 'object') return null
  const cobranca = raw as Record<string, unknown>
  const id = texto(cobranca.id).trim()
  const meioPagamentoId = texto(cobranca.meioPagamentoId).trim()
  if (!id || !meioPagamentoId) return null
  return {
    id,
    meioPagamentoId,
    valor: numero(cobranca.valor),
    pendente: Boolean(cobranca.pendente),
    nome: textoOpcional(cobranca.nome),
  }
}

export function parsePedidoResumoCacheApp(raw: unknown): PedidoResumoAppEntregador | null {
  if (!raw || typeof raw !== 'object') return null
  const pedido = raw as Record<string, unknown>
  const id = texto(pedido.id).trim()
  if (!id) return null
  return {
    id,
    codigoVenda: texto(pedido.codigoVenda),
    numeroVenda: numeroOpcional(pedido.numeroVenda),
    clienteNome: texto(pedido.clienteNome),
    telefone: textoOpcional(pedido.telefone),
    endereco: textoOpcional(pedido.endereco),
    enderecoNavegacao: textoOpcional(pedido.enderecoNavegacao),
    latitude: numeroOpcional(pedido.latitude),
    longitude: numeroOpcional(pedido.longitude),
    bairro: textoOpcional(pedido.bairro),
    etapa: textoOpcional(pedido.etapa),
    valorFinal: numero(pedido.valorFinal),
    taxaEntrega: numeroOpcional(pedido.taxaEntrega),
    entregadorId: textoOpcional(pedido.entregadorId),
    faltaPagar: numero(pedido.faltaPagar),
    trocoLevar: numero(pedido.trocoLevar),
    observacao: textoOpcional(pedido.observacao),
    formaPagamento: textoOpcional(pedido.formaPagamento),
    meioPagamentoIds: Array.isArray(pedido.meioPagamentoIds)
      ? pedido.meioPagamentoIds.filter((item): item is string => typeof item === 'string')
      : [],
    cobrancas: Array.isArray(pedido.cobrancas)
      ? pedido.cobrancas.flatMap(item => {
          const cobranca = parseCobrancaCacheApp(item)
          return cobranca ? [cobranca] : []
        })
      : [],
  }
}

export function parseCachePedidosEntregadorApp(input: {
  bruto: string | null
  entregadorId: string
  agora: number
  maxIdadeMs?: number
}): PedidoResumoAppEntregador[] | null {
  if (!input.bruto || !input.entregadorId.trim()) return null
  try {
    const lido = JSON.parse(input.bruto) as {
      v?: number
      entregadorId?: string
      pedidos?: unknown
      gravadoEm?: number
    }
    if (lido.v !== 1 || lido.entregadorId !== input.entregadorId) return null
    if (!Array.isArray(lido.pedidos)) return null
    const gravadoEm = Number(lido.gravadoEm)
    if (!Number.isFinite(gravadoEm)) return null
    const maxIdade = input.maxIdadeMs ?? CACHE_PEDIDOS_ENTREGADOR_MAX_MS
    if (input.agora - gravadoEm > maxIdade) return null
    const pedidos = lido.pedidos.flatMap(item => {
      const pedido = parsePedidoResumoCacheApp(item)
      return pedido ? [pedido] : []
    })
    if (lido.pedidos.length > 0 && pedidos.length === 0) return null
    return pedidos
  } catch {
    return null
  }
}
