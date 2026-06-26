import { useCallback, useState } from 'react'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { showToast } from '@/src/shared/utils/toast'
import type { ColunaKanbanId, Venda } from '@/src/presentation/components/features/kanban/types'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  acoesTransicaoEntregaAvanco,
  vendaPrecisaConfirmarPagamentoParaFinalizar,
} from '@/src/presentation/components/features/kanban/rules/fiscalFlowKanban.rules'

export type ExecutarTransicaoKanbanPayload = {
  id: string
  acao?: AcaoTransicaoGestor
  acoes?: AcaoTransicaoGestor[]
}

export type VerificarImpressaoKanbanResult = {
  ok: boolean
  ticketsPayload?: VendaGestorTicketsResponse
}

interface UseEntregaTransicoesKanbanParams {
  executarTransicao: (payload: ExecutarTransicaoKanbanPayload) => Promise<unknown>
  /** Retorna true quando a resposta summary já atualizou o card (sem GET extra). */
  sincronizarVendaAposTransicao?: (
    vendaId: string,
    respostaTransicao: unknown,
    colunaDestino?: ColunaKanbanId
  ) => boolean | void
  /** Reconsulta lista após transição incompleta; `onRecovered` limpa UI otimista quando o cache foi corrigido. */
  agendarSincronizacaoLista?: (
    vendaId: string,
    colunaDestino?: ColunaKanbanId,
    onRecovered?: () => void
  ) => void
  onAfterTransicaoSucesso?: (ctx: {
    venda: Venda
    acoesExecutadas: AcaoTransicaoGestor[]
    ticketsPreload?: VendaGestorTicketsResponse
  }) => void | Promise<void>
  verificarImpressaoAntesTransicoes?: (
    venda: Venda,
    acoes: AcaoTransicaoGestor[]
  ) => Promise<VerificarImpressaoKanbanResult>
  verificarEntregadorAntesDespachar?: (venda: Venda) => Promise<boolean>
  /** Sem entregador ao despachar: abrir o modal de vínculo de entregador do card. */
  onEntregadorAusenteAoDespachar?: (venda: Venda) => void
  /** Quando finalizar exige pagamento quitado e ele ainda está pendente: confirma a cobrança automaticamente (retorna true se confirmado). */
  confirmarPagamentoAntesFinalizar?: (venda: Venda) => Promise<boolean>
  /** Reconsulta pagamento no delivery antes de bloquear finalização (lista unificada pode estar defasada). */
  revalidarPagamentoAntesFinalizar?: (vendaId: string) => Promise<boolean>
}

export function useEntregaTransicoesKanban(params: UseEntregaTransicoesKanbanParams) {
  const {
    executarTransicao,
    sincronizarVendaAposTransicao,
    agendarSincronizacaoLista,
    onAfterTransicaoSucesso,
    verificarImpressaoAntesTransicoes,
    verificarEntregadorAntesDespachar,
    onEntregadorAusenteAoDespachar,
    confirmarPagamentoAntesFinalizar,
    revalidarPagamentoAntesFinalizar,
  } = params

  const [avancandoEtapaIds, setAvancandoEtapaIds] = useState<Record<string, boolean>>({})
  const [timestampsEtapaEntregaLocal, setTimestampsEtapaEntregaLocal] = useState<
    Record<string, string>
  >({})
  const [etapaLocalPorVendaId, setEtapaLocalPorVendaId] = useState<
    Record<string, ColunaKanbanId>
  >({})

  const marcarTransicaoLocal = useCallback((vendaId: string) => {
    const agoraIso = new Date().toISOString()
    setTimestampsEtapaEntregaLocal(prev => ({ ...prev, [vendaId]: agoraIso }))
  }, [])

  const limparEtapaLocal = useCallback((vendaId: string) => {
    setEtapaLocalPorVendaId(prev => {
      if (!(vendaId in prev)) return prev
      const { [vendaId]: _, ...rest } = prev
      return rest
    })
  }, [])

  const iniciarTransicaoUi = useCallback((vendaId: string, colunaDestino: ColunaKanbanId) => {
    setAvancandoEtapaIds(prev => ({ ...prev, [vendaId]: true }))
    setEtapaLocalPorVendaId(prev => ({ ...prev, [vendaId]: colunaDestino }))
  }, [])

  const finalizarTransicaoUi = useCallback((vendaId: string) => {
    setAvancandoEtapaIds(prev => {
      if (!(vendaId in prev)) return prev
      const { [vendaId]: _, ...rest } = prev
      return rest
    })
  }, [])

  const concluirTransicaoComSucesso = useCallback(
    (
      venda: Venda,
      acoesExecutadas: AcaoTransicaoGestor[],
      respostaTransicao: unknown,
      colunaDestino: ColunaKanbanId,
      ticketsPreload?: VendaGestorTicketsResponse
    ) => {
      marcarTransicaoLocal(venda.id)
      const cardCompleto = sincronizarVendaAposTransicao?.(
        venda.id,
        respostaTransicao,
        colunaDestino
      )
      if (cardCompleto) {
        limparEtapaLocal(venda.id)
      }
      showToast.success('Etapa do pedido atualizada.')
      void onAfterTransicaoSucesso?.({ venda, acoesExecutadas, ticketsPreload })
      if (!cardCompleto) {
        agendarSincronizacaoLista?.(venda.id, colunaDestino, () => limparEtapaLocal(venda.id))
      }
    },
    [
      agendarSincronizacaoLista,
      limparEtapaLocal,
      marcarTransicaoLocal,
      onAfterTransicaoSucesso,
      sincronizarVendaAposTransicao,
    ]
  )

  const reverterTransicaoUi = useCallback(
    (vendaId: string) => {
      limparEtapaLocal(vendaId)
    },
    [limparEtapaLocal]
  )

  const finalizarEntrega = useCallback(
    async (venda: Venda) => {
      if (vendaPrecisaConfirmarPagamentoParaFinalizar(venda)) {
        const quitado = revalidarPagamentoAntesFinalizar
          ? await revalidarPagamentoAntesFinalizar(venda.id)
          : false
        if (!quitado) {
          const confirmado = confirmarPagamentoAntesFinalizar
            ? await confirmarPagamentoAntesFinalizar(venda)
            : false
          if (!confirmado) return
        }
      }
      iniciarTransicaoUi(venda.id, 'FINALIZADAS')
      try {
        const resposta = await executarTransicao({ id: venda.id, acao: 'finalizar' })
        concluirTransicaoComSucesso(venda, ['finalizar'], resposta, 'FINALIZADAS')
      } catch (error) {
        reverterTransicaoUi(venda.id)
        throw error
      } finally {
        finalizarTransicaoUi(venda.id)
      }
    },
    [
      concluirTransicaoComSucesso,
      executarTransicao,
      finalizarTransicaoUi,
      iniciarTransicaoUi,
      confirmarPagamentoAntesFinalizar,
      revalidarPagamentoAntesFinalizar,
      reverterTransicaoUi,
    ]
  )

  const executarAvancoEntrega = useCallback(
    async (venda: Venda, origIdx: number, destIdx: number) => {
      const acoes = acoesTransicaoEntregaAvanco(origIdx, destIdx)
      if (acoes.length === 0) return

      const colunaDestino = COLUNAS_ENTREGA_OPERACIONAIS[destIdx]
      if (!colunaDestino) return

      iniciarTransicaoUi(venda.id, colunaDestino)

      let ticketsPreload: VendaGestorTicketsResponse | undefined

      try {
        if (verificarImpressaoAntesTransicoes) {
          const verificacao = await verificarImpressaoAntesTransicoes(venda, acoes)
          if (!verificacao.ok) {
            reverterTransicaoUi(venda.id)
            return
          }
          ticketsPreload = verificacao.ticketsPayload
        }

        if (acoes.includes('despachar') && verificarEntregadorAntesDespachar) {
          const podeDespachar = await verificarEntregadorAntesDespachar(venda)
          if (!podeDespachar) {
            showToast.error('Vincule um entregador antes de despachar para entrega.')
            onEntregadorAusenteAoDespachar?.(venda)
            reverterTransicaoUi(venda.id)
            return
          }
        }

        const resposta =
          acoes.length > 1
            ? await executarTransicao({ id: venda.id, acoes })
            : await executarTransicao({ id: venda.id, acao: acoes[0] })

        concluirTransicaoComSucesso(venda, acoes, resposta, colunaDestino, ticketsPreload)
      } catch (error) {
        reverterTransicaoUi(venda.id)
        throw error
      } finally {
        finalizarTransicaoUi(venda.id)
      }
    },
    [
      concluirTransicaoComSucesso,
      executarTransicao,
      finalizarTransicaoUi,
      iniciarTransicaoUi,
      onEntregadorAusenteAoDespachar,
      reverterTransicaoUi,
      verificarEntregadorAntesDespachar,
      verificarImpressaoAntesTransicoes,
    ]
  )

  const handleAvancarEtapa = useCallback(
    async (venda: Venda, colunaAtual: ColunaKanbanId) => {
      if (avancandoEtapaIds[venda.id]) return
      const origIdx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(colunaAtual)
      if (origIdx < 0) return

      try {
        if (colunaAtual === 'EM_ROTA') {
          await finalizarEntrega(venda)
          return
        }

        if (origIdx >= COLUNAS_ENTREGA_OPERACIONAIS.length - 1) return
        await executarAvancoEntrega(venda, origIdx, origIdx + 1)
      } catch {
        /* toast em onError do hook de transição */
      }
    },
    [avancandoEtapaIds, executarAvancoEntrega, finalizarEntrega]
  )

  const moverEntregaPorDrag = useCallback(
    async (venda: Venda, origIdx: number, destIdx: number) => {
      if (avancandoEtapaIds[venda.id]) return
      try {
        await executarAvancoEntrega(venda, origIdx, destIdx)
      } catch {
        /* toast em onError do hook de transição */
      }
    },
    [avancandoEtapaIds, executarAvancoEntrega]
  )

  const finalizarEntregaPorDrag = useCallback(
    async (venda: Venda) => {
      if (avancandoEtapaIds[venda.id]) return
      try {
        await finalizarEntrega(venda)
      } catch {
        /* toast em onError do hook de transição */
      }
    },
    [avancandoEtapaIds, finalizarEntrega]
  )

  return {
    avancandoEtapaIds,
    etapaLocalPorVendaId,
    timestampsEtapaEntregaLocal,
    handleAvancarEtapa,
    moverEntregaPorDrag,
    finalizarEntregaPorDrag,
  }
}
