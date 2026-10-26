import type {
  CobrancaAppEntregador,
  PedidoResumoAppEntregador,
} from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import { montarEnderecoNavegacaoApp } from '@/src/application/expedicao/app/navegacaoEntregadorApp'
import { extrairNomeMeioPagamentoDeCobranca } from '@/src/application/mappers/CobrancaDeliveryPagamentoMapper'

export type { PedidoResumoAppEntregador }

function cobrancasAtivas(row: Record<string, unknown>): Record<string, unknown>[] {
  const cobrancas = Array.isArray(row.cobrancas) ? row.cobrancas : []
  return cobrancas.flatMap(raw => {
    if (!raw || typeof raw !== 'object') return []
    const cobranca = raw as Record<string, unknown>
    const status = String(cobranca.status ?? '').toLowerCase()
    if (status === 'cancelada' || cobranca.dataCancelamento) return []
    return [cobranca]
  })
}

function cobrancaPaga(cobranca: Record<string, unknown>): boolean {
  const status = String(cobranca.status ?? '').toLowerCase()
  if (status === 'paga') return true
  if (status === 'pendente' || status === 'cancelada') return false
  return cobranca.pagamentoEfetivado != null && typeof cobranca.pagamentoEfetivado === 'object'
}

function idMeioDaCobranca(cobranca: Record<string, unknown>): string {
  const nested =
    cobranca.meioPagamento && typeof cobranca.meioPagamento === 'object'
      ? (cobranca.meioPagamento as Record<string, unknown>)
      : null
  return texto(cobranca.meioPagamentoId ?? nested?.id)
}

export function cobrancasPedidoApp(row: Record<string, unknown>): CobrancaAppEntregador[] {
  return cobrancasAtivas(row).flatMap(cobranca => {
    const meioPagamentoId = idMeioDaCobranca(cobranca)
    if (!meioPagamentoId) return []
    return [
      {
        id: texto(cobranca.id),
        meioPagamentoId,
        valor: numero(cobranca.valor),
        pendente: !cobrancaPaga(cobranca),
        nome: extrairNomeMeioPagamentoDeCobranca(cobranca) || null,
      },
    ]
  })
}

export function idsMeioPagamentoPedidoApp(row: Record<string, unknown>): string[] {
  return [...new Set(cobrancasPedidoApp(row).map(cobranca => cobranca.meioPagamentoId))]
}

export function rotuloPagamentoPedidoApp(row: Record<string, unknown>): string | null {
  const nomes = cobrancasAtivas(row)
    .map(cobranca => extrairNomeMeioPagamentoDeCobranca(cobranca))
    .filter(Boolean)
  if (nomes.length > 0) return [...new Set(nomes)].join(' + ')
  const fallback = texto(row.formaPagamento ?? row.meioPagamentoNome)
  return fallback || null
}

export function aplicarNomesMeiosNoPedido(
  pedido: PedidoResumoAppEntregador,
  nomesPorId: Record<string, string>
): PedidoResumoAppEntregador {
  const cobrancas = pedido.cobrancas.map(cobranca =>
    cobranca.nome ? cobranca : { ...cobranca, nome: nomesPorId[cobranca.meioPagamentoId] || null }
  )
  if (pedido.formaPagamento) return { ...pedido, cobrancas }
  const nomes = cobrancas.map(cobranca => cobranca.nome).filter((nome): nome is string => Boolean(nome))
  const fallback = pedido.meioPagamentoIds.map(id => nomesPorId[id]).filter(Boolean)
  const formaPagamento = [...new Set(nomes.length > 0 ? nomes : fallback)].join(' + ') || null
  if (!formaPagamento) return { ...pedido, cobrancas }
  return { ...pedido, cobrancas, formaPagamento }
}

function texto(valor: unknown): string {
  return String(valor ?? '').trim()
}

function numero(valor: unknown): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function formatarEndereco(endereco: Record<string, unknown>): string | null {
  const rua = texto(endereco.rua ?? endereco.logradouro)
  const n = texto(endereco.numero)
  const partes = [rua && n ? `${rua}, ${n}` : rua || n, texto(endereco.bairro)].filter(Boolean)
  return partes.length ? partes.join(' — ') : null
}

function coordenada(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function pontoDoEndereco(endereco: Record<string, unknown>): {
  latitude: number | null
  longitude: number | null
} {
  const loc =
    endereco.enderecoLocalizacao && typeof endereco.enderecoLocalizacao === 'object'
      ? (endereco.enderecoLocalizacao as Record<string, unknown>)
      : null
  const coords = loc && Array.isArray(loc.coordinates) ? loc.coordinates : null
  if (coords && coords.length >= 2) {
    return { latitude: coordenada(coords[1]), longitude: coordenada(coords[0]) }
  }
  return {
    latitude: coordenada(endereco.latitude ?? endereco.lat),
    longitude: coordenada(endereco.longitude ?? endereco.lng),
  }
}

export function mapPedidoAppEntregador(raw: unknown): PedidoResumoAppEntregador | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = texto(row.id)
  if (!id) return null
  const cliente = row.cliente && typeof row.cliente === 'object' ? (row.cliente as Record<string, unknown>) : {}
  const entregador =
    row.entregador && typeof row.entregador === 'object' ? (row.entregador as Record<string, unknown>) : {}
  const contexto =
    row.contextoEntrega && typeof row.contextoEntrega === 'object'
      ? (row.contextoEntrega as Record<string, unknown>)
      : {}
  const enderecoRaw =
    contexto.enderecoEntrega && typeof contexto.enderecoEntrega === 'object'
      ? (contexto.enderecoEntrega as Record<string, unknown>)
      : {}
  const numeroVenda = Number(row.numeroVenda)
  const observacoesRaw = Array.isArray(row.observacoes) ? row.observacoes : []
  const observacao = observacoesRaw
    .map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') return texto((item as Record<string, unknown>).observacao)
      return ''
    })
    .filter(Boolean)
    .join('\n')
  return {
    id,
    codigoVenda: texto(row.codigoVenda).toUpperCase(),
    numeroVenda: Number.isFinite(numeroVenda) && numeroVenda > 0 ? Math.floor(numeroVenda) : null,
    clienteNome: texto(cliente.nome) || texto(contexto.destinatarioNome) || 'Cliente',
    telefone: texto(cliente.telefone ?? contexto.destinatarioTelefone) || null,
    endereco: formatarEndereco(enderecoRaw),
    enderecoNavegacao: montarEnderecoNavegacaoApp({
      rua: texto(enderecoRaw.rua ?? enderecoRaw.logradouro) || null,
      numero: texto(enderecoRaw.numero) || null,
      bairro: texto(enderecoRaw.bairro) || null,
      cidade: texto(enderecoRaw.cidade) || null,
      estado: texto(enderecoRaw.estado) || null,
      cep: texto(enderecoRaw.cep) || null,
    }),
    ...pontoDoEndereco(enderecoRaw),
    bairro: texto(enderecoRaw.bairro) || null,
    etapa: texto(row.statusDelivery ?? row.statusEtapaOperacional) || null,
    valorFinal: numero(row.valorFinal),
    taxaEntrega: row.taxaEntrega == null ? null : numero(row.taxaEntrega),
    entregadorId: texto(entregador.id ?? row.entregadorId) || null,
    faltaPagar: numero(row.totalFaltaPagar),
    observacao: observacao || null,
    formaPagamento: rotuloPagamentoPedidoApp(row),
    meioPagamentoIds: idsMeioPagamentoPedidoApp(row),
    cobrancas: cobrancasPedidoApp(row),
  }
}
