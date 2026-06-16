'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { decidirImpressaoAposAcao } from '@/src/application/delivery/decidirImpressaoPosTransicao'
import { fetchVendaGestorTickets } from '@/src/infrastructure/api/fetchVendaGestorTickets'
import { filtrarTicketsPorTipoDecidido } from '@/src/application/delivery/filtrarTicketsPorTipoDecidido'
import { filtrarWarningsTicketsParaImpressao } from '@/src/application/delivery/filtrarWarningsTicketsParaImpressao'
import {
  imprimirTicketsApiGestor,
  notificarWarningsTickets,
} from '@/src/application/delivery/imprimirTicketsApiGestor'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { ColunaKanbanId, Venda } from '@/src/presentation/components/features/nfe/kanban/types'
import { COLUNAS_ENTREGA_OPERACIONAIS } from '@/src/presentation/components/features/nfe/kanban/fiscalFlowKanban.rules'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import { tipoCupomParaReimpressao } from '@/src/shared/types/deliveryImpressao'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { showToast } from '@/src/shared/utils/toast'
import {
  reimpressaoExigeImpressoraExpedicao,
  temImpressoraExpedicaoConfigurada,
  TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA,
} from '@/src/shared/utils/deliveryImpressoraExpedicao'
import {
  erroImpressao,
  logImpressao,
  warnImpressao,
} from '@/src/shared/utils/logImpressaoDelivery'

export interface UseImpressaoDeliveryOptions {
  /** Abre o modal de configurações quando falta impressora de expedição (toast é exibido aqui). */
  onImpressoraExpedicaoNecessaria?: () => void
}

function preferenciasDoPayloadTickets(
  payload: VendaGestorTicketsResponse
): PreferenciasImpressaoDelivery | null {
  const modo = payload.modoImpressaoDelivery
  const copiasCupomUnificado = Number(payload.copiasCupomUnificado)
  if (
    (modo !== 'unificado' && modo !== 'separado') ||
    !Number.isFinite(copiasCupomUnificado) ||
    typeof payload.imprimirAoReceber !== 'boolean' ||
    typeof payload.imprimirAoFicarPronto !== 'boolean'
  ) {
    return null
  }

  return {
    modo,
    copiasCupomUnificado: Math.max(1, copiasCupomUnificado),
    autoIniciarPreparoNovosPedidos: true,
    imprimirAoReceber: payload.imprimirAoReceber,
    imprimirAoFicarPronto: payload.imprimirAoFicarPronto,
    impressoraExpedicaoId: null,
    impressoraPadraoNome: null,
  }
}

function warningCodes(payload: VendaGestorTicketsResponse): string[] {
  return (payload.warnings ?? []).map(w => (typeof w === 'string' ? w : w.code)).filter(Boolean)
}

function resolverTipoCupomComFallbackProduto(
  payload: VendaGestorTicketsResponse,
  tipoOriginal: NonNullable<ReturnType<typeof decidirImpressaoAposAcao>['tipoCupom']>
): NonNullable<ReturnType<typeof decidirImpressaoAposAcao>['tipoCupom']> {
  if (tipoOriginal === 'expedicao' && warningCodes(payload).includes('IMPRESSORA_EXPEDICAO_NAO_CONFIGURADA')) {
    warnImpressao('hook.expedicao_sem_fallback_para_producao', {
      motivo: 'pronto_entrega_deve_imprimir_expedicao',
      ticketsExpedicao: payload.tickets.filter(ticket => ticket.tipoCupom === 'expedicao').length,
    })
  }
  return tipoOriginal
}

/**
 * Impressão do fluxo delivery: os tickets vêm prontos do backend (`GET .../tickets`).
 */
export function useImpressaoDelivery(options?: UseImpressaoDeliveryOptions) {
  const { auth } = useAuthStore()
  const { empresa, preferenciasImpressaoDelivery, deliveryCupomTemplate } = useEmpresaMe()

  const avisarImpressoraExpedicaoNecessaria = useCallback(() => {
    showToast.warning(TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA)
    options?.onImpressoraExpedicaoNecessaria?.()
  }, [options?.onImpressoraExpedicaoNecessaria])

  const processarAposTransicoes = useCallback(
    async (
      venda: Venda,
      acoes: AcaoTransicaoGestor[],
      ticketsPreload?: VendaGestorTicketsResponse
    ) => {
      logImpressao('hook.processarAposTransicoes.entrada', {
        vendaId: venda.id,
        acoes,
        ehDeliveryGestor: venda.isPedidoEntregaGestor(),
      })
      if (!venda.isPedidoEntregaGestor()) return
      const token = auth?.getAccessToken()
      if (!token) {
        warnImpressao('hook.processarAposTransicoes.sem_token', { vendaId: venda.id })
        return
      }

      let ticketsPayload: VendaGestorTicketsResponse | null = ticketsPreload ?? null

      for (const acao of acoes) {
        logImpressao('hook.loop_acao', { vendaId: venda.id, acao })
        if (acao !== 'iniciar_preparo' && acao !== 'marcar_pronto') {
          logImpressao('hook.loop_acao.ignorada_para_impressao', { acao })
          continue
        }

        if (!ticketsPayload) {
          const ticketsFetch = await fetchVendaGestorTickets(venda.id, token)
          if (!ticketsFetch.ok) {
            if (ticketsFetch.status === 404) {
              warnImpressao('hook.fetch_tickets_404_modulo_delivery', {
                vendaId: venda.id,
                acao,
              })
              continue
            }
            erroImpressao('hook.fetch_tickets_erro', {
              vendaId: venda.id,
              status: ticketsFetch.status,
              mensagem: ticketsFetch.error ?? null,
            })
            showToast.error(ticketsFetch.error || 'Não foi possível carregar os tickets do pedido.')
            continue
          }
          ticketsPayload = ticketsFetch.data
        }

        const prefs = preferenciasDoPayloadTickets(ticketsPayload)
        if (!prefs) {
          warnImpressao('hook.preferencias_invalidas_do_payload', {
            vendaId: venda.id,
            modo: ticketsPayload.modoImpressaoDelivery,
            copias: ticketsPayload.copiasCupomUnificado,
            imprimirAoReceber: ticketsPayload.imprimirAoReceber,
            imprimirAoFicarPronto: ticketsPayload.imprimirAoFicarPronto,
          })
          showToast.error('Resposta de tickets sem parâmetros de impressão delivery.')
          continue
        }
        const d = decidirImpressaoAposAcao(prefs, acao)
        logImpressao('hook.decidir_impressao', {
          acao,
          imprimir: d.imprimir,
          tipoCupom: d.tipoCupom,
          copies: d.copies,
          prefsModo: prefs.modo,
        })
        if (!d.imprimir || !d.tipoCupom) {
          logImpressao('hook.nenhuma_impressao_automatica_nesta_acao', { acao })
          continue
        }

        const tipoCupomEfetivo = resolverTipoCupomComFallbackProduto(ticketsPayload, d.tipoCupom)
        const codesIgnorados =
          tipoCupomEfetivo !== d.tipoCupom ? ['IMPRESSORA_EXPEDICAO_NAO_CONFIGURADA'] : []

        const filtrados = filtrarTicketsPorTipoDecidido(ticketsPayload.tickets, tipoCupomEfetivo)
        if (filtrados.length === 0) {
          warnImpressao('hook.filtrados_vazios_apos_filtragem', {
            vendaId: venda.id,
            tipoCupomEsperado: tipoCupomEfetivo,
          })
          continue
        }

        const wsLista = filtrarWarningsTicketsParaImpressao(
          ticketsPayload.warnings,
          filtrados
        )
        const imprimeProducao = filtrados.some(ticket => ticket.tipoCupom === 'producao')
        logImpressao('hook.warnings_servidor', {
          quantidade: wsLista.length,
          codes: wsLista.map(w => (typeof w === 'string' ? w : (w as { code?: string }).code)),
          codesIgnorados,
        })

        notificarWarningsTickets(wsLista, m => showToast.info(m), {
          ignorarCodes: [...codesIgnorados, 'MAPEAMENTO_IMPRESSORA_NAO_CONFIGURADO', 'IMPRESSORA_WINDOWS_NAO_MAPEADA'],
          tickets: ticketsPayload.tickets,
          imprimeProducao,
          warningsProdutoSemImpressora: ticketsPayload.warnings,
        })

        logImpressao('hook.imprimir_tickets_agora', {
          vendaId: venda.id,
          numeroVenda: ticketsPayload.numeroVenda,
          qTickets: filtrados.length,
        })
        await imprimirTicketsApiGestor({
          response: ticketsPayload,
          ticketsAImprimir: filtrados,
          nomeEmpresa: empresa?.nomeExibicao,
          jobNamePrefix: 'Delivery',
          cupomTemplate: deliveryCupomTemplate,
          onMensagem: m => showToast.info(m),
        })
        logImpressao('hook.imprimir_tickets_concluido', { vendaId: venda.id })
      }
    },
    [auth, deliveryCupomTemplate, empresa?.nomeExibicao]
  )

  const processarAposTransicaoVendaGestorId = useCallback(
    async (vendaId: string, acao: AcaoTransicaoGestor) => {
      await processarAposTransicoes(
        {
          id: vendaId,
          isPedidoEntregaGestor: () => true,
        } as Venda,
        [acao]
      )
    },
    [processarAposTransicoes]
  )

  const reimprimirCupomEntrega = useCallback(
    async (venda: Venda, colunaId: ColunaKanbanId) => {
      logImpressao('hook.reimpressao.entrada', { vendaId: venda.id, colunaId })
      if (!venda.isPedidoEntregaGestor()) return
      if (!COLUNAS_ENTREGA_OPERACIONAIS.includes(colunaId)) {
        warnImpressao('hook.reimpressao.coluna_operacional_ignorada', { colunaId })
        return
      }
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão expirada.')
        return
      }

      const prefsEmpresa = preferenciasImpressaoDelivery
      if (
        reimpressaoExigeImpressoraExpedicao(prefsEmpresa.modo, colunaId) &&
        !temImpressoraExpedicaoConfigurada(prefsEmpresa.impressoraExpedicaoId)
      ) {
        avisarImpressoraExpedicaoNecessaria()
        return
      }

      const ticketsFetch = await fetchVendaGestorTickets(venda.id, token)
      if (!ticketsFetch.ok) {
        if (ticketsFetch.status === 404) {
          warnImpressao('hook.reimpressao.fetch_404_modulo_delivery', { vendaId: venda.id })
          showToast.info('Impressão de cupons ainda não disponível para pedidos do módulo delivery.')
          return
        }
        erroImpressao('hook.reimpressao.fetch_erro', { status: ticketsFetch.status })
        showToast.error(ticketsFetch.error || 'Não foi possível carregar os tickets do pedido.')
        return
      }

      const prefs = preferenciasDoPayloadTickets(ticketsFetch.data)
      if (!prefs) {
        warnImpressao('hook.reimpressao.prefs_invalidas', { vendaId: venda.id })
        showToast.error('Resposta de tickets sem parâmetros de impressão delivery.')
        return
      }
      const tipo = tipoCupomParaReimpressao(
        prefs.modo,
        colunaId as 'NOVOS_PEDIDOS' | 'EM_PREPARO' | 'PRONTO_ENTREGA' | 'EM_ROTA'
      )
      const tipoEfetivo = resolverTipoCupomComFallbackProduto(ticketsFetch.data, tipo)
      const codesIgnorados = tipoEfetivo !== tipo ? ['IMPRESSORA_EXPEDICAO_NAO_CONFIGURADA'] : []
      logImpressao('hook.reimpressao.tipo_inferido', {
        tipo,
        tipoEfetivo,
        modo: prefs.modo,
        colunaId,
        codesIgnorados,
      })

      const filtrados = filtrarTicketsPorTipoDecidido(ticketsFetch.data.tickets, tipoEfetivo)
      if (filtrados.length === 0) {
        warnImpressao('hook.reimpressao.sem_tickets_no_estagio', { tipo: tipoEfetivo, colunaId })
        showToast.info('Nenhum ticket disponível para reimpressão neste estágio.')
        return
      }

      const wsLista = filtrarWarningsTicketsParaImpressao(
        ticketsFetch.data.warnings,
        filtrados
      )
      const imprimeProducao = filtrados.some(ticket => ticket.tipoCupom === 'producao')
      logImpressao('hook.reimpressao.warnings', {
        quantidade: wsLista.length,
        codes: wsLista.map(w => (typeof w === 'string' ? w : (w as { code?: string }).code)),
      })
      notificarWarningsTickets(wsLista, m => showToast.info(m), {
        ignorarCodes: [...codesIgnorados, 'MAPEAMENTO_IMPRESSORA_NAO_CONFIGURADO', 'IMPRESSORA_WINDOWS_NAO_MAPEADA'],
        tickets: ticketsFetch.data.tickets,
        imprimeProducao,
        warningsProdutoSemImpressora: ticketsFetch.data.warnings,
      })

      logImpressao('hook.reimpressao.disparando_print', { q: filtrados.length })
      await imprimirTicketsApiGestor({
        response: ticketsFetch.data,
        ticketsAImprimir: filtrados,
        nomeEmpresa: empresa?.nomeExibicao,
        jobNamePrefix: 'Reimpressão',
        cupomTemplate: deliveryCupomTemplate,
        onMensagem: m => showToast.info(m),
      })
      logImpressao('hook.reimpressao_concluida', { vendaId: venda.id })
    },
    [
      auth,
      avisarImpressoraExpedicaoNecessaria,
      deliveryCupomTemplate,
      empresa?.nomeExibicao,
      preferenciasImpressaoDelivery,
    ]
  )

  return { processarAposTransicoes, processarAposTransicaoVendaGestorId, reimprimirCupomEntrega }
}
