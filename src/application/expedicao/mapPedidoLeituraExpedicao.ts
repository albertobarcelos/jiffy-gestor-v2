import { mapPedidoAppEntregador } from '@/src/application/expedicao/app/mapPedidoAppEntregador'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'

function texto(valor: unknown): string {
  return String(valor ?? '').trim()
}

function itemDoProduto(raw: unknown, index: number): PedidoLeituraExpedicao['itens'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const nome = texto(row.nomeProduto ?? row.nome ?? row.descricao)
  if (!nome) return null
  const quantidade = Number(row.quantidade ?? 1)
  return {
    id: texto(row.id ?? row.produtoLancadoId ?? row.produtoId) || `item-${index}`,
    nome,
    quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
  }
}

export function mapPedidoLeituraExpedicao(raw: unknown): PedidoLeituraExpedicao | null {
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
  const endereco =
    contexto.enderecoEntrega && typeof contexto.enderecoEntrega === 'object'
      ? (contexto.enderecoEntrega as Record<string, unknown>)
      : row.enderecoEntrega && typeof row.enderecoEntrega === 'object'
        ? (row.enderecoEntrega as Record<string, unknown>)
        : {}

  const produtos = Array.isArray(row.produtosLancados)
    ? row.produtosLancados
    : Array.isArray(row.produtos)
      ? row.produtos
      : []

  const numero = Number(row.numeroVenda)
  const resumo = mapPedidoAppEntregador(raw)
  return {
    id,
    codigoVenda: texto(row.codigoVenda).toUpperCase(),
    numeroVenda: Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : null,
    clienteNome:
      texto(cliente.nome) ||
      texto(contexto.destinatarioNome) ||
      'Cliente',
    bairro: texto(endereco.bairro) || resumo?.bairro || null,
    endereco: resumo?.endereco ?? null,
    etapa: texto(row.statusDelivery ?? row.statusEtapaOperacional ?? row.statusOperacional) || null,
    entregadorId: texto(entregador.id ?? row.entregadorId) || null,
    entregadorNome: texto(entregador.nome) || null,
    formaPagamento: resumo?.formaPagamento ?? null,
    valorFinal: resumo?.valorFinal ?? 0,
    faltaPagar: resumo?.faltaPagar ?? 0,
    trocoLevar: resumo?.trocoLevar ?? 0,
    itens: produtos
      .map(itemDoProduto)
      .filter((item): item is PedidoLeituraExpedicao['itens'][number] => item !== null),
  }
}

export function escolherPedidoPeloCodigo(items: unknown[], codigoOuNumero: string): unknown | null {
  const alvo = codigoOuNumero.trim().toUpperCase()
  if (!alvo) return null
  const lista = Array.isArray(items) ? items : []
  const porCodigo = lista.find(item => {
    if (!item || typeof item !== 'object') return false
    return texto((item as Record<string, unknown>).codigoVenda).toUpperCase() === alvo
  })
  if (porCodigo) return porCodigo

  const numero = Number(alvo)
  if (!Number.isFinite(numero) || numero <= 0) return null
  return (
    lista.find(item => {
      if (!item || typeof item !== 'object') return false
      return Number((item as Record<string, unknown>).numeroVenda) === numero
    }) ?? null
  )
}
