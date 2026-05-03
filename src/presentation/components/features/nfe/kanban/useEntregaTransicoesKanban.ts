import { useCallback, useState } from 'react'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import type { ColunaKanbanId, Venda } from './types'
import { COLUNAS_ENTREGA_OPERACIONAIS, acoesTransicaoEntregaAvanco } from './fiscalFlowKanban.rules'

interface UseEntregaTransicoesKanbanParams {
  executarTransicao: (payload: { id: string; acao: AcaoTransicaoGestor }) => Promise<unknown>
  refetch: () => Promise<unknown>
  /** Após transição bem-sucedida (ex.: impressão delivery). Chamado antes do toast e do refetch. */
  onAfterTransicaoSucesso?: (ctx: {
    venda: Venda
    acoesExecutadas: AcaoTransicaoGestor[]
  }) => void | Promise<void>
}

export function useEntregaTransicoesKanban(params: UseEntregaTransicoesKanbanParams) {
  const { executarTransicao, refetch, onAfterTransicaoSucesso } = params
  /** IDs de pedidos com avanço de etapa em andamento (botão "Avançar etapa"). */
  const [avancandoEtapaIds, setAvancandoEtapaIds] = useState<Record<string, boolean>>({})
  /** ISO da última transição bem-sucedida por vendaId (DnD ou botão), enquanto o GET unificado não reflete. */
  const [timestampsEtapaEntregaLocal, setTimestampsEtapaEntregaLocal] = useState<
    Record<string, string>
  >({})

  const marcarTransicaoLocal = useCallback((vendaId: string) => {
    const agoraIso = new Date().toISOString()
    setTimestampsEtapaEntregaLocal(prev => ({ ...prev, [vendaId]: agoraIso }))
  }, [])

  const finalizarEntrega = useCallback(
    async (venda: Venda) => {
      await executarTransicao({ id: venda.id, acao: 'finalizar' })
      marcarTransicaoLocal(venda.id)
      await onAfterTransicaoSucesso?.({ venda, acoesExecutadas: ['finalizar'] })
      showToast.success('Etapa do pedido atualizada.')
      await refetch()
    },
    [executarTransicao, marcarTransicaoLocal, onAfterTransicaoSucesso, refetch]
  )

  const executarAvancoEntrega = useCallback(
    async (venda: Venda, origIdx: number, destIdx: number) => {
      const acoes = acoesTransicaoEntregaAvanco(origIdx, destIdx)
      if (acoes.length === 0) return

      for (const acao of acoes) {
        await executarTransicao({ id: venda.id, acao })
      }
      marcarTransicaoLocal(venda.id)
      await onAfterTransicaoSucesso?.({ venda, acoesExecutadas: acoes })
      showToast.success('Etapa do pedido atualizada.')
      await refetch()
    },
    [executarTransicao, marcarTransicaoLocal, onAfterTransicaoSucesso, refetch]
  )

  /**
   * Avança o pedido de entrega para a próxima etapa operacional via botão "Avançar etapa".
   * Novos → Em preparo → Pronto → Em rota usam iniciar_preparo / marcar_pronto / despachar;
   * Em rota → Finalizadas usa POST …/transicoes com acao `finalizar`.
   */
  const handleAvancarEtapa = useCallback(
    async (venda: Venda, colunaAtual: ColunaKanbanId) => {
      if (avancandoEtapaIds[venda.id]) return
      const origIdx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(colunaAtual)
      if (origIdx < 0) return

      setAvancandoEtapaIds(prev => ({ ...prev, [venda.id]: true }))
      try {
        if (colunaAtual === 'EM_ROTA') {
          await finalizarEntrega(venda)
          return
        }

        if (origIdx >= COLUNAS_ENTREGA_OPERACIONAIS.length - 1) return
        await executarAvancoEntrega(venda, origIdx, origIdx + 1)
      } catch {
        /* toast em onError do hook */
      } finally {
        setAvancandoEtapaIds(prev => {
          const { [venda.id]: _, ...rest } = prev
          return rest
        })
      }
    },
    [avancandoEtapaIds, executarAvancoEntrega, finalizarEntrega]
  )

  const moverEntregaPorDrag = useCallback(
    async (venda: Venda, origIdx: number, destIdx: number) => {
      try {
        await executarAvancoEntrega(venda, origIdx, destIdx)
      } catch {
        /* toast em onError do hook */
      }
    },
    [executarAvancoEntrega]
  )

  const finalizarEntregaPorDrag = useCallback(
    async (venda: Venda) => {
      try {
        await finalizarEntrega(venda)
      } catch {
        /* toast em onError do hook */
      }
    },
    [finalizarEntrega]
  )

  return {
    avancandoEtapaIds,
    timestampsEtapaEntregaLocal,
    handleAvancarEtapa,
    moverEntregaPorDrag,
    finalizarEntregaPorDrag,
  }
}
