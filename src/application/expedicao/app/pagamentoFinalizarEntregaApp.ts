import type { CobrancaAppEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import { pareceIdentificadorMeioPagamento } from '@/src/application/expedicao/app/mapPedidoAppEntregador'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

export type MeioPagamentoAppEntregador = {
  id: string
  nome: string
}

export type OpcaoMeioPagamentoFinalizarApp = {
  id: string
  nome: string
  noPedido: boolean
  jaPago: boolean
}

export type LinhaPagamentoFinalizarApp = {
  meioPagamentoId: string
  valor: number
}

/** Na porta o motoboy registra o meio, mesmo que a loja use TEF no PDV. */
export function filtrarMeiosPagamentoNaPortaApp(
  items: Array<{ id?: string; nome?: string; ativo?: boolean }>
): MeioPagamentoAppEntregador[] {
  const meios: MeioPagamentoAppEntregador[] = []
  for (const item of items) {
    const id = String(item.id ?? '').trim()
    const nome = String(item.nome ?? '').trim()
    if (!id || !nome || item.ativo === false) continue
    meios.push({ id, nome })
  }
  return meios
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

/** Campo vazio fica vazio — não prende um 0 no final enquanto o motoboy redigita. */
export function textoValorLinhaFinalizarApp(valor: number): string {
  if (!Number.isFinite(valor) || valor === 0) return ''
  return arredondar(valor).toString().replace('.', ',')
}

export function sanitizarTextoValorFinalizarApp(texto: string): string {
  let t = texto.replace(/[^\d.,]/g, '').replace('.', ',')
  const virgula = t.indexOf(',')
  if (virgula >= 0) {
    t = `${t.slice(0, virgula + 1)}${t.slice(virgula + 1).replace(/,/g, '').slice(0, 2)}`
  }
  const [inteiro, decimal] = t.split(',')
  const inteiroLimpo = inteiro.replace(/^0+(?=\d)/, '')
  return decimal !== undefined ? `${inteiroLimpo},${decimal}` : inteiroLimpo
}

export function parseValorDigitadoFinalizarApp(texto: string): number | null {
  const t = sanitizarTextoValorFinalizarApp(texto).replace(',', '.')
  if (!t || t === '.') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
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
  const idsPagos = new Set(
    input.cobrancas
      .filter(cobranca => !cobranca.pendente && cobranca.meioPagamentoId)
      .map(cobranca => cobranca.meioPagamentoId)
  )
  const idsPendentes = new Set(
    input.cobrancas
      .filter(cobranca => cobranca.pendente && cobranca.meioPagamentoId)
      .map(cobranca => cobranca.meioPagamentoId)
  )
  const porId = new Map<string, OpcaoMeioPagamentoFinalizarApp>()

  for (const cobranca of input.cobrancas) {
    if (!cobranca.meioPagamentoId) continue
    porId.set(cobranca.meioPagamentoId, {
      id: cobranca.meioPagamentoId,
      nome:
        cobranca.nome && !pareceIdentificadorMeioPagamento(cobranca.nome)
          ? cobranca.nome
          : cobranca.meioPagamentoId,
      noPedido: true,
      jaPago: idsPagos.has(cobranca.meioPagamentoId) && !idsPendentes.has(cobranca.meioPagamentoId),
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
      jaPago: idsPagos.has(id) && !idsPendentes.has(id),
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

export function valorJaPagoFinalizarApp(cobrancas: CobrancaAppEntregador[]): number {
  return arredondar(
    cobrancas.filter(cobranca => !cobranca.pendente).reduce((soma, cobranca) => soma + cobranca.valor, 0)
  )
}

/**
 * Total a fechar na porta: o que o pedido ainda deve (`faltaPagar`).
 * Pagamento já efetivado não entra no alvo — só o restante em aberto.
 */
export function valorACobrirFinalizarApp(input: {
  cobrancas: CobrancaAppEntregador[]
  valorFinal: number
  faltaPagar: number
}): number {
  const falta = arredondar(Math.max(0, input.faltaPagar))
  if (falta > 0) return falta
  const somaPendentes = arredondar(
    input.cobrancas.filter(cobranca => cobranca.pendente).reduce((soma, cobranca) => soma + cobranca.valor, 0)
  )
  if (somaPendentes > 0) return somaPendentes
  return 0
}

export function montarLinhasIniciaisFinalizarApp(input: {
  cobrancas: CobrancaAppEntregador[]
  valorFinal: number
  faltaPagar: number
}): LinhaPagamentoFinalizarApp[] {
  const alvo = valorACobrirFinalizarApp(input)
  if (alvo <= 0) return []
  const fonte =
    input.faltaPagar > 0 || input.cobrancas.some(cobranca => cobranca.pendente)
      ? input.cobrancas.filter(cobranca => cobranca.pendente && cobranca.meioPagamentoId)
      : input.cobrancas.filter(cobranca => cobranca.meioPagamentoId)
  if (fonte.length === 0) return []
  return encaixarLinhasNoAlvo(
    fonte.map(cobranca => ({
      meioPagamentoId: cobranca.meioPagamentoId,
      valor: arredondar(cobranca.valor),
    })),
    alvo
  )
}

export function somaLinhasPagamentoFinalizarApp(linhas: LinhaPagamentoFinalizarApp[]): number {
  return arredondar(linhas.reduce((soma, linha) => soma + linha.valor, 0))
}

export function alternarMeioNasLinhasFinalizarApp(input: {
  linhas: LinhaPagamentoFinalizarApp[]
  meioPagamentoId: string
  valorAlvo: number
}): LinhaPagamentoFinalizarApp[] {
  const id = input.meioPagamentoId.trim()
  if (!id) return input.linhas
  const existe = input.linhas.some(linha => linha.meioPagamentoId === id)
  if (existe) {
    const resto = input.linhas.filter(linha => linha.meioPagamentoId !== id)
    return encaixarLinhasNoAlvo(resto, input.valorAlvo)
  }
  const next = [...input.linhas, { meioPagamentoId: id, valor: 0 }]
  const parte = arredondar(input.valorAlvo / next.length)
  return encaixarLinhasNoAlvo(
    next.map((linha, indice) => (indice === next.length - 1 ? linha : { ...linha, valor: parte })),
    input.valorAlvo
  )
}

export function atualizarValorLinhaFinalizarApp(input: {
  linhas: LinhaPagamentoFinalizarApp[]
  indice: number
  valor: number
  valorAlvo: number
}): LinhaPagamentoFinalizarApp[] {
  if (input.indice < 0 || input.indice >= input.linhas.length) return input.linhas
  const teto = Math.max(0, input.valorAlvo)
  const valor = arredondar(Math.min(teto, Math.max(0, input.valor)))
  const next = input.linhas.map((linha, indice) =>
    indice === input.indice ? { ...linha, valor } : linha
  )
  if (next.length === 1) return [{ ...next[0], valor: teto }]
  const outro = next.length - 1 === input.indice ? next.length - 2 : next.length - 1
  const somaOutros = arredondar(
    next.reduce((soma, linha, indice) => soma + (indice === outro ? 0 : linha.valor), 0)
  )
  next[outro] = { ...next[outro], valor: arredondar(Math.max(0, teto - somaOutros)) }
  return next
}

export function montarPagamentosDasLinhasFinalizarApp(input: {
  cobrancas: CobrancaAppEntregador[]
  linhas: LinhaPagamentoFinalizarApp[]
  valorFinal: number
  faltaPagar: number
}): PagamentoSelecionado[] | null {
  const linhas = input.linhas.filter(linha => linha.meioPagamentoId && linha.valor > 0)
  if (linhas.length === 0) return null
  const alvo = valorACobrirFinalizarApp(input)
  if (Math.abs(somaLinhasPagamentoFinalizarApp(linhas) - alvo) > 0.009) return null

  const pagas = input.cobrancas.filter(cobranca => !cobranca.pendente && cobranca.id)
  const pendentes = input.cobrancas.filter(cobranca => cobranca.pendente)
  const iguaisPendentes =
    (pendentes.length > 0 || input.faltaPagar > 0) &&
    pendentes.length === linhas.length &&
    pendentes.every(
      (cobranca, indice) =>
        cobranca.meioPagamentoId === linhas[indice]?.meioPagamentoId &&
        Math.abs(cobranca.valor - linhas[indice].valor) < 0.009
    )
  if (iguaisPendentes) return null

  if (pendentes.length > 0 || input.faltaPagar > 0) {
    return [
      ...pagas.map(cobranca => ({
        id: cobranca.id,
        meioPagamentoId: cobranca.meioPagamentoId,
        valor: cobranca.valor,
      })),
      ...linhas.map(linha => ({
        meioPagamentoId: linha.meioPagamentoId,
        valor: arredondar(linha.valor),
      })),
    ]
  }

  const iguaisPagas =
    pagas.length === linhas.length &&
    pagas.every(
      (cobranca, indice) =>
        cobranca.meioPagamentoId === linhas[indice]?.meioPagamentoId &&
        Math.abs(cobranca.valor - linhas[indice].valor) < 0.009
    )
  if (iguaisPagas) return null
  return linhas.map(linha => ({
    meioPagamentoId: linha.meioPagamentoId,
    valor: arredondar(linha.valor),
  }))
}

function encaixarLinhasNoAlvo(
  linhas: LinhaPagamentoFinalizarApp[],
  valorAlvo: number
): LinhaPagamentoFinalizarApp[] {
  if (linhas.length === 0) return []
  if (linhas.length === 1) return [{ ...linhas[0], valor: arredondar(valorAlvo) }]
  const teto = arredondar(valorAlvo)
  const semUltima = linhas.slice(0, -1)
  const soma = somaLinhasPagamentoFinalizarApp(semUltima)
  return [...semUltima, { ...linhas[linhas.length - 1], valor: arredondar(Math.max(0, teto - soma)) }]
}
