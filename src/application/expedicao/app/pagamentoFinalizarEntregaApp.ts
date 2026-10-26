import type { CobrancaAppEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

export type MeioPagamentoAppEntregador = {
  id: string
  nome: string
}

export type OpcaoMeioPagamentoFinalizarApp = {
  id: string
  nome: string
  noPedido: boolean
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

/** Meio que o pedido já trouxe — pendência na porta tem prioridade. */
export function idMeioPagamentoPadraoFinalizarApp(
  cobrancas: CobrancaAppEntregador[]
): string | null {
  const pendente = cobrancas.find(cobranca => cobranca.pendente && cobranca.meioPagamentoId)
  if (pendente) return pendente.meioPagamentoId
  return cobrancas.find(cobranca => cobranca.meioPagamentoId)?.meioPagamentoId ?? null
}

export function montarOpcoesMeioPagamentoFinalizarApp(input: {
  meios: MeioPagamentoAppEntregador[]
  cobrancas: CobrancaAppEntregador[]
}): OpcaoMeioPagamentoFinalizarApp[] {
  const idsNoPedido = new Set(
    input.cobrancas.map(cobranca => cobranca.meioPagamentoId).filter(Boolean)
  )
  const porId = new Map<string, OpcaoMeioPagamentoFinalizarApp>()

  for (const cobranca of input.cobrancas) {
    if (!cobranca.meioPagamentoId) continue
    porId.set(cobranca.meioPagamentoId, {
      id: cobranca.meioPagamentoId,
      nome: cobranca.nome || cobranca.meioPagamentoId,
      noPedido: true,
    })
  }

  for (const meio of input.meios) {
    const id = meio.id.trim()
    const nome = meio.nome.trim()
    if (!id || !nome) continue
    const anterior = porId.get(id)
    porId.set(id, {
      id,
      nome: nome || anterior?.nome || id,
      noPedido: idsNoPedido.has(id),
    })
  }

  return [...porId.values()].sort((a, b) => {
    if (a.noPedido !== b.noPedido) return a.noPedido ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

/**
 * `null` = não mexe nas cobranças (fica o que já está no pedido).
 * Troca só a parte a receber; o que já foi pago permanece.
 */
export function montarPagamentosAoTrocarMeioFinalizarApp(input: {
  cobrancas: CobrancaAppEntregador[]
  meioPagamentoId: string | null
  valorFinal: number
  faltaPagar: number
}): PagamentoSelecionado[] | null {
  const escolhido = String(input.meioPagamentoId ?? '').trim()
  if (!escolhido) return null

  const atual = idMeioPagamentoPadraoFinalizarApp(input.cobrancas)
  if (atual === escolhido) return null

  const pagas = input.cobrancas.filter(cobranca => !cobranca.pendente && cobranca.id)
  const pendentes = input.cobrancas.filter(cobranca => cobranca.pendente)
  const valorPendente = arredondar(
    pendentes.reduce((soma, cobranca) => soma + cobranca.valor, 0) ||
      input.faltaPagar ||
      input.valorFinal
  )

  if (pendentes.length > 0 || input.faltaPagar > 0) {
    const valor = valorPendente > 0 ? valorPendente : arredondar(input.valorFinal)
    if (valor <= 0) return null
    return [
      ...pagas.map(cobranca => ({
        id: cobranca.id,
        meioPagamentoId: cobranca.meioPagamentoId,
        valor: cobranca.valor,
      })),
      { meioPagamentoId: escolhido, valor },
    ]
  }

  const valorPago = arredondar(input.valorFinal)
  if (valorPago <= 0) return null
  return [{ meioPagamentoId: escolhido, valor: valorPago }]
}
