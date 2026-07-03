'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useImpressaoDelivery } from '../../delivery/hooks/useImpressaoDelivery'
import { confirmarCobrancaPendentePedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/ConfirmarCobrancaPendentePedidoDeliveryUseCase'
import { invalidarPedidoKanbanQuickViewCache } from '../../delivery/kanban-panels/carregarPedidoKanbanQuickView'
import { validarImpressaoAntesTransicaoKanban } from '@/src/application/delivery/validarImpressaoAntesTransicaoKanban'
import {
  extrairPatchKanbanDeRespostaTransicao,
  extrairVendaUnificadaDeRespostaDeliverySummary,
  patchKanbanVendasListagemCache,
  replaceKanbanVendasListagemCache,
} from '../utils/kanbanVendaCacheUpdate'
import {
  patchVendaDeliveryKanbanColumnCaches,
  sincronizarVendaDeliveryKanbanColumnCaches,
} from '../utils/kanbanDeliveryColumnCache'
import {
  definirEntregadorKanbanCache,
  resolverEntregadorIdVendaKanban,
} from '../../delivery/kanban-panels/entregadorKanbanStore'
import { vendaExigeEntregadorParaDespachar } from '../rules/vendasKanban.rules'
import { showToast } from '@/src/shared/utils/toast'
import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { EmpresaMeResumo } from '@/src/presentation/hooks/useEmpresaMe'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { ColunaKanbanId, Venda } from '../types'

export interface UseKanbanPreTransicaoParams {
  isModoDeliveryKanban: boolean
  infiniteQueryKey: readonly unknown[]
  todasVendasCarregadasRef: React.MutableRefObject<Venda[]>
  entregadorPorVendaIdRef: React.MutableRefObject<Record<string, string>>
  onPatchEntregadorPorVendaId: (vendaId: string, entregadorId: string) => void
  preferenciasImpressaoDelivery: PreferenciasImpressaoDelivery
  empresa: EmpresaMeResumo | null | undefined
  onAbrirConfigImpressoraExpedicao: () => void
}

export function useKanbanPreTransicao({
  isModoDeliveryKanban,
  infiniteQueryKey,
  todasVendasCarregadasRef,
  entregadorPorVendaIdRef,
  onPatchEntregadorPorVendaId,
  preferenciasImpressaoDelivery,
  empresa,
  onAbrirConfigImpressoraExpedicao,
}: UseKanbanPreTransicaoParams) {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  const { processarAposTransicoes, reimprimirCupomEntrega } = useImpressaoDelivery({
    onImpressoraExpedicaoNecessaria: onAbrirConfigImpressoraExpedicao,
  })

  const sincronizarVendaAposTransicao = useCallback(
    (vendaId: string, respostaTransicao: unknown, colunaDestino?: ColunaKanbanId): boolean => {
      if (isModoDeliveryKanban) {
        const fallback =
          todasVendasCarregadasRef.current.find(v => v.id === vendaId) ?? null
        const ok = sincronizarVendaDeliveryKanbanColumnCaches(
          queryClient,
          vendaId,
          respostaTransicao,
          fallback,
          colunaDestino
        )
        if (ok) {
          const cardAtualizado =
            extrairVendaUnificadaDeRespostaDeliverySummary(respostaTransicao)
          if (cardAtualizado?.entregador?.id) {
            definirEntregadorKanbanCache(vendaId, cardAtualizado.entregador.id)
            onPatchEntregadorPorVendaId(vendaId, cardAtualizado.entregador.id)
          }
        }
        return ok
      }

      const cardAtualizado = extrairVendaUnificadaDeRespostaDeliverySummary(respostaTransicao)
      if (cardAtualizado) {
        replaceKanbanVendasListagemCache(queryClient, cardAtualizado)
        return true
      }

      const patch = extrairPatchKanbanDeRespostaTransicao(respostaTransicao)
      patchKanbanVendasListagemCache(queryClient, vendaId, patch)
      return false
    },
    [
      isModoDeliveryKanban,
      infiniteQueryKey,
      queryClient,
      todasVendasCarregadasRef,
      onPatchEntregadorPorVendaId,
    ]
  )

  const agendarSincronizacaoLista = useCallback(
    (vendaId: string, colunaDestino?: ColunaKanbanId, onRecovered?: () => void) => {
      const token = auth?.getAccessToken()
      if (!token) return
      void (async () => {
        try {
          const response = await fetch(
            `/api/delivery/pedidos/${encodeURIComponent(vendaId)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
              cache: 'no-store',
            }
          )
          if (!response.ok) return
          const data = await response.json()
          if (isModoDeliveryKanban) {
            const fallback =
              todasVendasCarregadasRef.current.find(v => v.id === vendaId) ?? null
            const ok = sincronizarVendaDeliveryKanbanColumnCaches(
              queryClient,
              vendaId,
              data,
              fallback,
              colunaDestino
            )
            if (ok) onRecovered?.()
          } else {
            const patch = extrairPatchKanbanDeRespostaTransicao(data)
            patchKanbanVendasListagemCache(queryClient, vendaId, patch)
            onRecovered?.()
          }
        } catch {
          /* falha silenciosa */
        }
      })()
    },
    [auth, isModoDeliveryKanban, infiniteQueryKey, queryClient, todasVendasCarregadasRef]
  )

  const revalidarPagamentoAntesFinalizar = useCallback(
    async (vendaId: string) => {
      const token = auth?.getAccessToken()
      if (!token) return false
      try {
        const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        })
        if (!response.ok) return false
        const data = await response.json()
        const patch = extrairPatchKanbanDeRespostaTransicao(data)
        if (isModoDeliveryKanban) {
          patchVendaDeliveryKanbanColumnCaches(queryClient, vendaId, patch)
        } else {
          patchKanbanVendasListagemCache(queryClient, vendaId, patch)
        }
        const status = String(patch.statusFinanceiro ?? '').trim().toLowerCase()
        return status === 'pago'
      } catch {
        return false
      }
    },
    [auth, isModoDeliveryKanban, infiniteQueryKey, queryClient]
  )

  const verificarImpressaoAntesTransicoes = useCallback(
    async (venda: Venda, acoes: AcaoTransicaoGestor[]) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão expirada.')
        return { ok: false }
      }

      const resultado = await validarImpressaoAntesTransicaoKanban({
        vendaId: venda.id,
        token,
        prefs: preferenciasImpressaoDelivery,
        empresa,
        acoes,
      })

      for (const info of resultado.toastsInfo ?? []) {
        showToast.info(info)
      }

      if (resultado.podeAvancar) {
        return { ok: true, ticketsPayload: resultado.ticketsPayload }
      }

      if (resultado.toastWarning) {
        showToast.warning(resultado.toastWarning)
      }
      if (resultado.abrirModalConfig) {
        onAbrirConfigImpressoraExpedicao()
      }
      return { ok: false }
    },
    [auth, empresa, onAbrirConfigImpressoraExpedicao, preferenciasImpressaoDelivery]
  )

  const verificarEntregadorAntesDespachar = useCallback(
    async (venda: Venda) => {
      if (!vendaExigeEntregadorParaDespachar(venda)) {
        return true
      }
      const token = auth?.getAccessToken()
      if (!token) return false
      const entregadorId = await resolverEntregadorIdVendaKanban({
        vendaId: venda.id,
        tabelaOrigem: venda.tabelaOrigem === 'venda_gestor' ? 'venda_gestor' : 'venda',
        token,
        cacheLocal: entregadorPorVendaIdRef.current,
        forcarRevalidacao: true,
      })
      return Boolean(entregadorId)
    },
    [auth, entregadorPorVendaIdRef]
  )

  const confirmarPagamentoAntesFinalizar = useCallback(
    async (venda: Venda) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão expirada.')
        return false
      }
      try {
        const pedidoAtualizado = await confirmarCobrancaPendentePedidoDeliveryUseCase.execute(
          venda.id,
          token
        )
        if (isModoDeliveryKanban) {
          sincronizarVendaDeliveryKanbanColumnCaches(
            queryClient,
            venda.id,
            pedidoAtualizado,
            todasVendasCarregadasRef.current.find(x => x.id === venda.id) ?? null
          )
        } else {
          const patch = extrairPatchKanbanDeRespostaTransicao(pedidoAtualizado)
          patchKanbanVendasListagemCache(queryClient, venda.id, patch)
        }
        invalidarPedidoKanbanQuickViewCache(venda.id)
        return true
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : 'Não foi possível confirmar o pagamento.'
        showToast.error(mensagem)
        return false
      }
    },
    [auth, isModoDeliveryKanban, infiniteQueryKey, queryClient, todasVendasCarregadasRef]
  )

  return {
    sincronizarVendaAposTransicao,
    agendarSincronizacaoLista,
    revalidarPagamentoAntesFinalizar,
    verificarImpressaoAntesTransicoes,
    verificarEntregadorAntesDespachar,
    confirmarPagamentoAntesFinalizar,
    processarAposTransicoes,
    reimprimirCupomEntrega,
  }
}
