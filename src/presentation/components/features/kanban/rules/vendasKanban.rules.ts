import { fiscalPendentePodeReemitirAposCooldown } from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import {
  isPedidoEntregaComEntregador,
  isPedidoEntregaKanban,
} from '@/src/shared/helpers/pedidoEntregaKanban'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  DirecaoOrdenacaoKanban,
  Venda,
} from '../types'

export const COLUNAS_ENTREGA_OPERACIONAIS: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
]

/**
 * Colunas onde os produtos do pedido delivery ainda podem ser alterados.
 * O backend só permite add/remove de itens nos status PENDENTE, EM_PREPARO e PRONTO
 * (a partir de EM_ROTA a operação é bloqueada).
 */
export const COLUNAS_ENTREGA_EDITAVEIS_PRODUTOS: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
]

export type AcaoAvancoEntrega = Extract<
  AcaoTransicaoGestor,
  'iniciar_preparo' | 'marcar_pronto' | 'despachar'
>

export const STATUS_FISCAL_AGUARDANDO_SEFAZ = new Set([
  'PENDENTE',
  'PENDENTE_AUTORIZACAO',
  'EMITINDO',
  'CONTINGENCIA',
])

/** Exibido quando o nome do cliente está vazio (Kanban e arraste). */
export const LABEL_SEM_CLIENTE = 'SEM CLIENTE'

/** Pedidos de retirada não exigem entregador para avançar até Em Rota / Retirada. */
export function vendaExigeEntregadorParaDespachar(venda: Venda): boolean {
  return isPedidoEntregaComEntregador(venda.tipoVenda)
}

/** Fiscal: arrastar entre Finalizadas ↔ Pendente emissão (e para Com nota). */
export const COLUNAS_KANBAN_DRAG_FISCAL = new Set<string>([
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
])

/** Entrega manual gestor: arrastar entre as 4 colunas operacionais. */
export const COLUNAS_KANBAN_DRAG_ENTREGA = new Set<string>(COLUNAS_ENTREGA_OPERACIONAIS)

/** Colunas onde o “primeiro da lista” é persistido no localStorage ao soltar. */
export const COLUNAS_KANBAN_DESTINO_PIN = new Set([
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
  'COM_FISCAL',
])

/**
 * Data/hora exibida no card de entrega (gestor) nas colunas operacionais, no mesmo estilo de “Finalizada: …”.
 * - Novos pedidos: quando o pedido entrou (criação).
 * - Demais etapas: `dataUltimaModificacao` da API quando existir (proxy de transição); senão data de criação.
 */
export function getLinhaTempoPedidoEntregaKanban(
  columnId: ColunaKanbanId,
  v: VendaUnificadaDTO,
  /** Timestamp local de transição (DnD ou botão), tem prioridade sobre `dataUltimaModificacao` da API. */
  isoLocalTransicao?: string
): { prefixo: string; iso: string } | null {
  const entregaGestor =
    isPedidoEntregaKanban(v.tabelaOrigem, v.tipoVenda, v.statusEtapaOperacional)
  if (!entregaGestor || !COLUNAS_ENTREGA_OPERACIONAIS.includes(columnId)) return null

  if (columnId === 'NOVOS_PEDIDOS') {
    return { prefixo: 'Recebido em:', iso: v.dataCriacao }
  }

  const ultimaApi = v.dataUltimaModificacao?.trim()
  const escolhida =
    isoLocalTransicao && (!ultimaApi || isoLocalTransicao > ultimaApi)
      ? isoLocalTransicao
      : ultimaApi
  if (escolhida) {
    return { prefixo: 'Na etapa desde:', iso: escolhida }
  }
  return { prefixo: 'Pedido em:', iso: v.dataCriacao }
}

/** Pedidos delivery gestor com pagamento ainda não quitado (não pode ir para Finalizadas). */
export function vendaPrecisaConfirmarPagamentoParaFinalizar(venda: Venda): boolean {
  return venda.precisaConfirmarPagamentoParaFinalizar()
}

/**
 * Cobrança em aberto ou status financeiro desconhecido no card.
 * O GET /vendas/unificado não expõe `statusFinanceiro`; o valor só entra no cache após transição/GET delivery.
 */
export function vendaCobrancaEmAbertoOuIndeterminadaKanban(venda: VendaUnificadaDTO): boolean {
  if (!venda.isPedidoEntregaGestor()) return false
  const status = String(venda.statusFinanceiro ?? '').trim().toLowerCase()
  if (status === 'pago' || status === 'cancelado') return false
  if (status === 'pendente' || status === 'parcial') return true
  return !status
}

/** Atalho no card: confirmar cobrança sem abrir o modal de detalhes (coluna Em Rota / Retirada). */
export function deveExibirBotaoSalvarCobrancaKanban(
  columnId: ColunaKanbanId,
  venda: VendaUnificadaDTO,
  modoKanbanVendas: ModoKanbanVendas
): boolean {
  if (modoKanbanVendas !== 'delivery') return false
  if (columnId !== 'EM_ROTA') return false
  return vendaCobrancaEmAbertoOuIndeterminadaKanban(venda)
}

/** Encadeia transições ao soltar à direita (ex.: Novos → Em rota = preparo + pronto + despacho). */
export function acoesTransicaoEntregaAvanco(
  origIdx: number,
  destIdx: number
): AcaoAvancoEntrega[] {
  if (destIdx <= origIdx) return []
  const acoes: AcaoAvancoEntrega[] = []
  for (let i = origIdx; i < destIdx; i++) {
    if (i === 0) acoes.push('iniciar_preparo')
    else if (i === 1) acoes.push('marcar_pronto')
    else if (i === 2) acoes.push('despachar')
  }
  return acoes
}

function dadosFiscalVendaKanban(v: VendaUnificadaDTO) {
  return {
    statusFiscal: v.statusFiscal,
    retornoSefaz: v.retornoSefaz,
    documentoFiscalId: v.documentoFiscalId,
    numeroFiscal: v.numeroFiscal,
    dataUltimaModificacao: v.dataUltimaModificacao,
    dataEmissaoFiscal: v.dataEmissaoFiscal,
    dataFinalizacao: v.dataFinalizacao,
    dataCriacao: v.dataCriacao,
  }
}

export function fiscalKanbanPodeReemitirAposCooldown(v: VendaUnificadaDTO): boolean {
  return fiscalPendentePodeReemitirAposCooldown(dadosFiscalVendaKanban(v))
}

export function statusFiscalAguardandoSefaz(v: VendaUnificadaDTO): boolean {
  if (fiscalKanbanPodeReemitirAposCooldown(v)) return false
  const sf = String(v.statusFiscal ?? '')
    .trim()
    .toUpperCase()
  return STATUS_FISCAL_AGUARDANDO_SEFAZ.has(sf)
}

/**
 * Borda esquerda e fundo do card conforme coluna e statusFiscal.
 * Finalizadas: primary. Pendente/Com nota: fiscal (emitida/cancelada/rejeitada), sem status na pendente → amarelo,
 * reemitindo, emitindo (emitir-nota direto) ou aguardando SEFAZ → custom-2.
 */
export function getCardBorderEFundoKanban(
  columnId: ColunaKanbanId,
  v: VendaUnificadaDTO,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): { borderClass: string; cardBgClass: string } {
  if (columnId === 'FINALIZADAS') {
    return { borderClass: 'border-l-primary', cardBgClass: 'bg-white' }
  }

  if (columnId === 'NOVOS_PEDIDOS') {
    return { borderClass: 'border-l-sky-500', cardBgClass: 'bg-white' }
  }
  if (columnId === 'EM_PREPARO') {
    return { borderClass: 'border-l-amber-500', cardBgClass: 'bg-white' }
  }
  if (columnId === 'PRONTO_ENTREGA') {
    return { borderClass: 'border-l-teal-500', cardBgClass: 'bg-white' }
  }
  if (columnId === 'EM_ROTA') {
    return { borderClass: 'border-l-indigo-500', cardBgClass: 'bg-white' }
  }

  const acao = acaoFiscalEmAndamentoPorVenda[v.id]
  if (acao === 'reemitindo' || acao === 'emitindo') {
    return { borderClass: 'border-l-custom-2', cardBgClass: 'bg-white' }
  }

  const sf = String(v.statusFiscal ?? '')
    .trim()
    .toUpperCase()

  if (sf === 'EMITIDA') {
    return { borderClass: 'border-l-green-500', cardBgClass: 'bg-white' }
  }
  if (sf === 'CANCELADA') {
    return { borderClass: 'border-l-gray-400', cardBgClass: 'bg-gray-50' }
  }
  if (sf === 'INUTILIZADA') {
    return { borderClass: 'border-l-gray-400', cardBgClass: 'bg-gray-50' }
  }
  if (sf === 'REJEITADA' || sf === 'DENEGADA' || fiscalKanbanPodeReemitirAposCooldown(v)) {
    return { borderClass: 'border-l-red-500', cardBgClass: 'bg-white' }
  }

  if (statusFiscalAguardandoSefaz(v)) {
    return { borderClass: 'border-l-custom-2', cardBgClass: 'bg-white' }
  }

  if (columnId === 'PENDENTE_EMISSAO' && !sf) {
    return { borderClass: 'border-l-yellow-400', cardBgClass: 'bg-white' }
  }

  if (columnId === 'PENDENTE_EMISSAO') {
    return { borderClass: 'border-l-yellow-400', cardBgClass: 'bg-white' }
  }

  if (columnId === 'COM_FISCAL') {
    return { borderClass: 'border-l-green-400', cardBgClass: 'bg-white' }
  }

  return { borderClass: 'border-l-gray-300', cardBgClass: 'bg-white' }
}

/** Mesma regra de desabilitar o botão “Emitir nota” — usada no drop em Com nota solicitada. */
export function vendaBloqueadaParaEmissaoInterativa(
  v: VendaUnificadaDTO,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): boolean {
  if (acaoFiscalEmAndamentoPorVenda[v.id]) return true
  const s = String(v.statusFiscal ?? '')
    .trim()
    .toUpperCase()
  if (s === 'EMITIDA' || s === 'PENDENTE_EMISSAO' || s === 'INUTILIZADA') return true
  if (statusFiscalAguardandoSefaz(v)) return true
  return false
}

/**
 * Exibe o botão Emitir/Reemitir (mesmo de Pendente emissão) em Pendente, em Finalizadas para entrega gestor,
 * ou enquanto reemissão/emissão direta estiver em andamento (qualquer coluna visível).
 */
export function deveExibirBotaoEmitirNotaNoKanban(
  columnId: ColunaKanbanId,
  venda: VendaUnificadaDTO,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): boolean {
  if (venda.statusFiscal === 'INUTILIZADA') return false
  const acao = acaoFiscalEmAndamentoPorVenda[venda.id]
  if (acao === 'reemitindo' || acao === 'emitindo') return true
  if (columnId === 'PENDENTE_EMISSAO') return true
  if (
    columnId === 'COM_FISCAL' &&
    (venda.statusFiscal === 'REJEITADA' ||
      venda.statusFiscal === 'DENEGADA' ||
      fiscalKanbanPodeReemitirAposCooldown(venda))
  ) {
    return true
  }
  if (columnId === 'FINALIZADAS' && venda.isPedidoEntregaGestor()) return true
  return false
}

/** Delivery (gestor entrega/retirada ou integradores): pedido já concluído na operação. */
export function isPedidoTipoDeliveryKanban(venda: VendaUnificadaDTO): boolean {
  return venda.isDelivery() || venda.isPedidoEntregaGestor()
}

/**
 * Botão "Observação" no card — apenas no modo delivery do kanban.
 * Oculto em Finalizadas, Pendente emissão e Com nota solicitada.
 */
export function deveExibirBotaoObservacaoPedidoKanban(
  columnId: ColunaKanbanId,
  venda: VendaUnificadaDTO,
  modoKanbanVendas: ModoKanbanVendas
): boolean {
  if (modoKanbanVendas !== 'delivery') return false
  if (!isPedidoTipoDeliveryKanban(venda)) return false

  return (
    columnId !== 'FINALIZADAS' &&
    columnId !== 'PENDENTE_EMISSAO' &&
    columnId !== 'COM_FISCAL'
  )
}

/** Venda sem nome de cliente preenchido (nome vazio ou só espaços). */
export function vendaSemNomeCliente(v: Venda): boolean {
  return !v.cliente?.nome?.trim()
}

/**
 * Ordena por data mais recente primeiro (igual em todas as colunas, sem depender de localStorage).
 * Prioridade: data de finalização → data de emissão fiscal → data de criação.
 */
export function ordenarVendasKanbanPorDataDesc(vendas: Venda[]): Venda[] {
  return ordenarVendasKanbanPorCriterio(vendas, 'data', 'desc')
}

function timestampDataOrdenacaoKanban(raw: string): number {
  if (!raw) return 0
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? ms : 0
}

/** Data padrão (fallback) usada quando não há contexto de coluna: finalização → emissão fiscal → criação. */
function dataOrdenacaoPadraoKanban(v: Venda): string {
  return v.dataFinalizacao?.trim() || v.dataEmissaoFiscal?.trim() || v.dataCriacao?.trim() || ''
}

/**
 * Data usada para ordenar o card na coluna, espelhando a data exibida no próprio card:
 * - Novos pedidos → criação ("Recebido em")
 * - Em preparo / Pronto / Em rota → entrada na etapa ("Na etapa desde", `dataUltimaModificacao`/transição local)
 * - Demais colunas → finalização → emissão fiscal → criação
 */
export function dataOrdenacaoCardKanban(
  columnId: ColunaKanbanId,
  v: VendaUnificadaDTO,
  isoLocalTransicao?: string
): string {
  const linha = getLinhaTempoPedidoEntregaKanban(columnId, v, isoLocalTransicao)
  if (linha?.iso?.trim()) return linha.iso
  return dataOrdenacaoPadraoKanban(v)
}

export function ordenarVendasKanbanPorCriterio(
  vendas: Venda[],
  criterio: CriterioOrdenacaoKanban,
  direcao: DirecaoOrdenacaoKanban,
  /** Resolve a data de ordenação por venda (alinhada ao card da coluna). Usado no critério 'data'. */
  obterDataOrdenacao?: (v: Venda) => string
): Venda[] {
  if (criterio === 'data') {
    const dataVenda = obterDataOrdenacao ?? dataOrdenacaoPadraoKanban
    return [...vendas].sort((a, b) => {
      const ta = timestampDataOrdenacaoKanban(dataVenda(a))
      const tb = timestampDataOrdenacaoKanban(dataVenda(b))
      const diff = direcao === 'desc' ? tb - ta : ta - tb
      if (diff !== 0) return diff
      return direcao === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
    })
  }

  return [...vendas].sort((a, b) => {
    const diff =
      direcao === 'desc' ? b.numeroVenda - a.numeroVenda : a.numeroVenda - b.numeroVenda
    if (diff !== 0) return diff
    return direcao === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
  })
}

export function filtrarPorBusca(vendas: Venda[], termo: string): Venda[] {
  const t = normalizarTermoBuscaKanban(termo)
  if (!t) return vendas
  return vendas.filter(v => vendaAtendeBuscaKanban(v, t, termo))
}

/** Remove `#` e espaços — card exibe `#ULUGSBYD`, API guarda `ULUGSBYD`. */
export function normalizarTermoBuscaKanban(termo: string): string {
  return String(termo ?? '')
    .trim()
    .replace(/^#+/, '')
    .trim()
    .toLowerCase()
}

/**
 * Interpreta termo de busca como valor monetário (ex.: `4,00`, `4.00`, `R$ 1.234,56`).
 * Retorna `null` se não for um valor.
 */
export function parseValorBuscaKanban(termo: string): number | null {
  const t = String(termo ?? '')
    .trim()
    .replace(/^r\$\s*/i, '')
    .replace(/\s/g, '')
  if (!t) return null

  // pt-BR: 1.234,56 ou 4,00
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(t) || /^\d+,\d{1,2}$/.test(t)) {
    const n = Number(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  // 4.00 ou 4
  if (/^\d+(\.\d{1,2})?$/.test(t)) {
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  return null
}

export function isTermoBuscaValorKanban(termo: string): boolean {
  return parseValorBuscaKanban(termo) != null
}

export function vendaAtendeBuscaKanban(
  venda: Pick<Venda, 'id' | 'numeroVenda' | 'codigoVenda' | 'cliente' | 'valorFinal'>,
  termoNormalizado: string,
  termoOriginal?: string
): boolean {
  const t = termoNormalizado.trim().toLowerCase()
  if (!t) return true

  const valorBusca = parseValorBuscaKanban(termoOriginal ?? termoNormalizado)
  if (valorBusca != null) {
    const valor = Number(venda.valorFinal)
    if (Number.isFinite(valor) && Math.abs(valor - valorBusca) < 0.005) return true
  }

  const codigo = String(venda.codigoVenda ?? '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
  if (codigo && codigo.includes(t)) return true

  const numero = String(venda.numeroVenda ?? '').trim()
  if (numero && numero.includes(t)) return true

  // Busca por valor não deve misturar com match parcial de nome/código confuso.
  if (valorBusca != null) return false

  const nome = String(venda.cliente?.nome ?? '')
    .trim()
    .toLowerCase()
  if (nome && nome.includes(t)) return true

  const id = String(venda.id ?? '')
    .trim()
    .toLowerCase()
  if (id && id.includes(t)) return true

  return false
}

export function formatarDataCard(dataISO: string | null | undefined): string {
  if (!dataISO) return '—'
  try {
    const d = new Date(dataISO)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatarTipoVenda(tipo: string | null | undefined): string {
  if (!tipo) return '—'
  const t = tipo.toLowerCase()
  if (t === 'balcao') return 'Balcão'
  if (t === 'mesa') return 'Mesa'
  if (t === 'gestor') return 'Gestor'
  return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase()
}

/** Cupom público `/notas-fiscais/{id}`: NFC-e de PDV, balcão gestor ou Jiffy Delivery. */
const ORIGENS_CUPOM_PUBLICO_NFCE = new Set([
  'PDV',
  'GESTOR',
  'JIFFY_DELIVERY',
  'DELIVERY',
])

export function kanbanVendaUsaCupomPublicoNfce(
  v: Pick<Venda, 'origem' | 'tipoDocFiscal'>
): boolean {
  return (
    v.tipoDocFiscal === 'NFCE' && ORIGENS_CUPOM_PUBLICO_NFCE.has(v.origem)
  )
}

/**
 * No modo Delivery, pendente emissão aparece na coluna Finalizadas — borda/cores da etapa real.
 */
export function colunaParaEstiloCardKanban(
  columnId: ColunaKanbanId,
  etapaKanbanCard: ColunaKanbanId,
  modoKanbanVendas: ModoKanbanVendas
): ColunaKanbanId {
  if (
    modoKanbanVendas === 'delivery' &&
    columnId === 'FINALIZADAS' &&
    etapaKanbanCard === 'PENDENTE_EMISSAO'
  ) {
    return 'PENDENTE_EMISSAO'
  }
  return columnId
}

export function colunaPermiteEditarClienteKanban(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): boolean {
  if (columnId === 'FINALIZADAS' || columnId === 'PENDENTE_EMISSAO') return true
  if (
    columnId === 'COM_FISCAL' &&
    (acaoFiscalEmAndamentoPorVenda[venda.id] === 'reemitindo' ||
      acaoFiscalEmAndamentoPorVenda[venda.id] === 'emitindo')
  ) {
    return true
  }
  if (
    modoKanbanVendas === 'delivery' &&
    venda.isPedidoEntregaGestor() &&
    COLUNAS_ENTREGA_OPERACIONAIS.includes(columnId)
  ) {
    return true
  }
  return false
}

export function podeEditarClienteNaKanbanCard(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): boolean {
  return (
    colunaPermiteEditarClienteKanban(
      columnId,
      venda,
      modoKanbanVendas,
      acaoFiscalEmAndamentoPorVenda
    ) &&
    !vendaSemNomeCliente(venda) &&
    Boolean(venda.cliente?.id?.trim())
  )
}

/**
 * Permite alterar os produtos do pedido delivery (botão "Editar produtos" no card).
 * Liberado apenas nas etapas anteriores a EM_ROTA, em pedidos de entrega/retirada do gestor.
 */
export function podeEditarProdutosNaKanbanCard(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas
): boolean {
  return (
    modoKanbanVendas === 'delivery' &&
    venda.isPedidoEntregaGestor() &&
    COLUNAS_ENTREGA_EDITAVEIS_PRODUTOS.includes(columnId)
  )
}

export function exibirAtribuirEntregadorKanban(
  modoKanbanVendas: ModoKanbanVendas,
  venda: Venda,
  colunaAtual: ColunaKanbanId
): boolean {
  const tipoVendaStr = String(venda.tipoVenda ?? '').trim().toLowerCase()
  return (
    modoKanbanVendas === 'delivery' &&
    tipoVendaStr === 'entrega' &&
    venda.isPedidoEntregaGestor() &&
    COLUNAS_ENTREGA_OPERACIONAIS.includes(colunaAtual)
  )
}

/**
 * Venda da coluna Rejeitadas que pode ser reenviada automaticamente no lote.
 * Exige REJEITADA/DENEGADA + documento fiscal (ou modelo conhecido para emissão direta).
 */
export function vendaElegivelParaReemissaoAutomaticaLote(
  venda: VendaUnificadaDTO,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): boolean {
  if (vendaBloqueadaParaEmissaoInterativa(venda, acaoFiscalEmAndamentoPorVenda)) return false

  const sf = String(venda.statusFiscal ?? '')
    .trim()
    .toUpperCase()
  if (sf !== 'REJEITADA' && sf !== 'DENEGADA') return false

  if (venda.documentoFiscalId?.trim()) return true

  const tipoDoc = String(venda.tipoDocFiscal ?? '')
    .trim()
    .toUpperCase()
  if (tipoDoc === 'NFE' || tipoDoc === 'NF-E') {
    return Boolean(venda.cliente?.id?.trim())
  }
  if (tipoDoc === 'NFCE' || tipoDoc === 'NFC-E') return true

  return false
}

/** Rótulo do botão Emitir/Reemitir nota no card. */
export function rotuloBotaoEmissaoKanban(
  venda: Venda,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): string {
  const acaoEmAndamento = acaoFiscalEmAndamentoPorVenda[venda.id]
  if (acaoEmAndamento === 'reemitindo') return 'Em emissão'
  if (acaoEmAndamento === 'emitindo') return 'Em emissão'
  const documentoLabel = venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'
  const podeReemitir =
    venda.statusFiscal === 'REJEITADA' ||
    venda.statusFiscal === 'DENEGADA' ||
    fiscalKanbanPodeReemitirAposCooldown(venda)
  if (podeReemitir) {
    if (venda.tipoDocFiscal === 'NFE' || venda.tipoDocFiscal === 'NFCE') {
      return `Reemitir ${documentoLabel}`
    }
    return 'Reemitir nota'
  }
  if (venda.statusFiscal === 'PENDENTE_EMISSAO') return 'Em emissão'
  if (statusFiscalAguardandoSefaz(venda)) return 'Em emissão'
  return 'Emitir Nota'
}
