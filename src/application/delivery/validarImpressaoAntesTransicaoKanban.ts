import { carregarPayloadTicketsImpressaoDelivery } from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { EmpresaMeResumo } from '@/src/presentation/hooks/useEmpresaMe'
import type { ModoImpressaoDelivery, PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type {
  VendaGestorTicket,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'
import {
  temImpressoraExpedicaoConfigurada,
  TOAST_IMPRESSORA_EXPEDICAO_MAPEAMENTO_WINDOWS,
  TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA,
  TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS,
  transicaoExigeImpressoraExpedicao,
} from '@/src/shared/utils/deliveryImpressoraExpedicao'
import { avisosProdutoSemImpressoraDoPayload } from '@/src/application/delivery/deliveryProdutoSemImpressoraAvisos'
import { logImpressao } from '@/src/shared/utils/logImpressaoDelivery'

export type ValidarImpressaoAntesTransicaoResult = {
  podeAvancar: boolean
  abrirModalConfig: boolean
  toastWarning?: string
  toastsInfo?: string[]
  /** Payload reutilizado na impressão pós-transição (evita GET duplicado). */
  ticketsPayload?: VendaGestorTicketsResponse
}

function transicaoPrecisaValidarTickets(
  modo: ModoImpressaoDelivery,
  acoes: AcaoTransicaoGestor[]
): boolean {
  if (acoes.includes('iniciar_preparo')) return true
  if (modo === 'separado' && acoes.includes('marcar_pronto')) return true
  return false
}

function ticketTemNomeWindows(ticket: VendaGestorTicket): boolean {
  return Boolean(
    ticket.impressora?.nomeImpressoraWindows?.trim() ||
      ticket.nomeImpressoraWindows?.trim()
  )
}

function ticketProducaoEhFallbackSemImpressoraProduto(ticket: VendaGestorTicket): boolean {
  if (ticket.tipoCupom !== 'producao') return false
  const origem = String(ticket.impressora?.origem ?? '')
    .trim()
    .toLowerCase()
  if (!origem) return false
  return origem.includes('fallback') || origem.includes('expedicao') || origem.includes('padr')
}

function validarExpedicaoParaTransicao(params: {
  modo: ModoImpressaoDelivery
  acoes: AcaoTransicaoGestor[]
  impressoraExpedicaoId: string | null
  tickets: VendaGestorTicket[]
}): Pick<ValidarImpressaoAntesTransicaoResult, 'podeAvancar' | 'abrirModalConfig' | 'toastWarning'> | null {
  const exigeExpedicao = params.acoes.some(acao =>
    transicaoExigeImpressoraExpedicao(params.modo, acao)
  )
  if (!exigeExpedicao) return null

  if (!temImpressoraExpedicaoConfigurada(params.impressoraExpedicaoId)) {
    return {
      podeAvancar: false,
      abrirModalConfig: true,
      toastWarning: TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA,
    }
  }

  const tipoTicket = params.modo === 'unificado' ? 'unificado' : 'expedicao'
  const ticketExpedicao = params.tickets.find(t => t.tipoCupom === tipoTicket)
  if (ticketExpedicao && !ticketTemNomeWindows(ticketExpedicao)) {
    return {
      podeAvancar: false,
      abrirModalConfig: true,
      toastWarning: TOAST_IMPRESSORA_EXPEDICAO_MAPEAMENTO_WINDOWS,
    }
  }

  return null
}

function validarProducaoSeparadoParaIniciarPreparo(
  tickets: VendaGestorTicket[]
): Pick<ValidarImpressaoAntesTransicaoResult, 'podeAvancar' | 'abrirModalConfig' | 'toastWarning'> | null {
  for (const ticket of tickets) {
    if (ticket.tipoCupom !== 'producao') continue
    if (ticketProducaoEhFallbackSemImpressoraProduto(ticket)) continue
    if (!ticket.impressoraId && !ticket.impressora?.id) continue
    if (ticketTemNomeWindows(ticket)) continue

    const nomeImpressora =
      ticket.impressoraNome?.trim() ||
      ticket.impressora?.nome?.trim() ||
      'produção'

    return {
      podeAvancar: false,
      abrirModalConfig: true,
      toastWarning: TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS(nomeImpressora),
    }
  }

  return null
}

export async function validarImpressaoAntesTransicaoKanban(params: {
  vendaId: string
  token: string
  prefs: PreferenciasImpressaoDelivery
  empresa?: EmpresaMeResumo | null
  acoes: AcaoTransicaoGestor[]
}): Promise<ValidarImpressaoAntesTransicaoResult> {
  const modo = params.prefs.modo
  const impressoraExpedicaoId = params.prefs.impressoraExpedicaoId

  if (!transicaoPrecisaValidarTickets(modo, params.acoes)) {
    return { podeAvancar: true, abrirModalConfig: false }
  }

  const ticketsFetch = await carregarPayloadTicketsImpressaoDelivery({
    vendaId: params.vendaId,
    accessToken: params.token,
    prefs: params.prefs,
    empresa: params.empresa,
  })
  if (!ticketsFetch.ok) {
    if (ticketsFetch.status === 404) {
      logImpressao('validarTransicao.tickets_indisponivel_permite_transicao', {
        vendaId: params.vendaId,
        acoes: params.acoes,
      })
      return { podeAvancar: true, abrirModalConfig: false }
    }

    logImpressao('validarTransicao.fetch_tickets_falhou', {
      vendaId: params.vendaId,
      status: ticketsFetch.status,
    })
    return {
      podeAvancar: false,
      abrirModalConfig: false,
      toastWarning:
        ticketsFetch.error || 'Não foi possível validar as impressoras para esta transição.',
    }
  }

  const payload = ticketsFetch.data
  const toastsInfo =
    modo === 'separado' && params.acoes.includes('iniciar_preparo')
      ? avisosProdutoSemImpressoraDoPayload(payload)
      : []

  const bloqueioExpedicao = validarExpedicaoParaTransicao({
    modo,
    acoes: params.acoes,
    impressoraExpedicaoId,
    tickets: payload.tickets,
  })
  if (bloqueioExpedicao) {
    return { ...bloqueioExpedicao, toastsInfo, ticketsPayload: payload }
  }

  if (modo === 'separado' && params.acoes.includes('iniciar_preparo')) {
    const bloqueioProducao = validarProducaoSeparadoParaIniciarPreparo(payload.tickets)
    if (bloqueioProducao) {
      return { ...bloqueioProducao, toastsInfo, ticketsPayload: payload }
    }
  }

  return {
    podeAvancar: true,
    abrirModalConfig: false,
    toastsInfo,
    ticketsPayload: payload,
  }
}
