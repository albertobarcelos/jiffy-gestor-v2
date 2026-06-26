import {
  fiscalPendentePodeReemitirAposCooldown,
  fiscalPendenteTravadoLimiteTentativas,
} from '@/src/domain/services/pedido/RegrasFiscaisVenda'
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
  'COM_NFE',
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

export function fiscalKanbanPendenteTravadoLimiteTentativas(v: VendaUnificadaDTO): boolean {
  return fiscalPendenteTravadoLimiteTentativas(dadosFiscalVendaKanban(v))
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
  if (sf === 'REJEITADA' || fiscalKanbanPodeReemitirAposCooldown(v)) {
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

  if (columnId === 'COM_NFE') {
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
  if (columnId === 'COM_NFE' && fiscalKanbanPodeReemitirAposCooldown(venda)) return true
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
    columnId !== 'COM_NFE'
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

  if (criterio === 'numero') {
    return [...vendas].sort((a, b) => {
      const diff =
        direcao === 'desc' ? b.numeroVenda - a.numeroVenda : a.numeroVenda - b.numeroVenda
      if (diff !== 0) return diff
      return direcao === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
    })
  }

  return [...vendas].sort((a, b) => {
    const nomeA = a.cliente?.nome?.trim() ? a.cliente.nome.trim() : LABEL_SEM_CLIENTE
    const nomeB = b.cliente?.nome?.trim() ? b.cliente.nome.trim() : LABEL_SEM_CLIENTE
    const diff = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })
    const diffFinal = direcao === 'desc' ? -diff : diff
    if (diffFinal !== 0) return diffFinal
    return direcao === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
  })
}

export function filtrarPorBusca(vendas: Venda[], termo: string): Venda[] {
  const t = termo.trim().toLowerCase()
  if (!t) return vendas
  return vendas.filter(v => {
    if (v.codigoVenda?.toLowerCase().includes(t)) return true
    if (String(v.numeroVenda).includes(t)) return true
    if (v.cliente?.nome?.toLowerCase().includes(t)) return true
    if (v.id?.toLowerCase().includes(t)) return true
    return false
  })
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
