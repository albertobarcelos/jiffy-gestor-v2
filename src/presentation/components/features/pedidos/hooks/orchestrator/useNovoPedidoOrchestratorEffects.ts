'use client'

import { useEffect } from 'react'
import { statusPadraoNovoPedido } from '@/src/domain/services/pedido/RegrasStatusPedido'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type { AbaDetalhesPedido } from '../../types'

export type UseNovoPedidoOrchestratorEffectsParams = {
  open: boolean
  vendaId: string | undefined
  modoVisualizacao: boolean | undefined
  tipoInicioPedido: 'balcao' | 'entrega'
  abaDetalhesInicial?: AbaDetalhesPedido
  vendaDataUpdatedAt?: number
  currentStep: 1 | 2 | 3 | 4
  abaDetalhesPedido: AbaDetalhesPedido
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  setAbaDetalhesPedido: (aba: AbaDetalhesPedido) => void
  setStatus: (status: import('../../types').StatusVenda) => void
  setFluxoPagamentoEntrega: (fluxo: import('../../types').FluxoPagamentoEntrega) => void
  setNomeUsuario: (nome: string) => void
  longPressTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>
  longPressComplementoTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>
}

export function useNovoPedidoOrchestratorEffects({
  open,
  vendaId,
  modoVisualizacao,
  tipoInicioPedido,
  abaDetalhesInicial,
  vendaDataUpdatedAt,
  currentStep,
  abaDetalhesPedido,
  podeExibirAbaNotaFiscal,
  podeExibirAbaDadosEntrega,
  setCurrentStep,
  setAbaDetalhesPedido,
  setStatus,
  setFluxoPagamentoEntrega,
  setNomeUsuario,
  longPressTimeoutRef,
  longPressComplementoTimeoutRef,
}: UseNovoPedidoOrchestratorEffectsParams) {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  useEffect(() => {
    if (currentStep === 4 && abaDetalhesPedido === 'notaFiscal' && !podeExibirAbaNotaFiscal) {
      setAbaDetalhesPedido('infoPedido')
    }
  }, [currentStep, abaDetalhesPedido, podeExibirAbaNotaFiscal, setAbaDetalhesPedido])

  useEffect(() => {
    if (currentStep === 4 && abaDetalhesPedido === 'dadosEntrega' && !podeExibirAbaDadosEntrega) {
      setAbaDetalhesPedido('infoPedido')
    }
  }, [currentStep, abaDetalhesPedido, podeExibirAbaDadosEntrega, setAbaDetalhesPedido])

  useEffect(() => {
    if (!open || !vendaId || !modoVisualizacao || !abaDetalhesInicial) return
    setAbaDetalhesPedido(abaDetalhesInicial)
  }, [open, vendaId, modoVisualizacao, abaDetalhesInicial, setAbaDetalhesPedido])

  /** Kanban abre pagamentos para quitar antes de finalizar — efetiva na API, não só “cobrar na entrega”. */
  useEffect(() => {
    if (!open || !vendaId || !modoVisualizacao || abaDetalhesInicial !== 'pagamentos') return
    setFluxoPagamentoEntrega('ja_pago')
  }, [
    open,
    vendaId,
    modoVisualizacao,
    abaDetalhesInicial,
    vendaDataUpdatedAt,
    setFluxoPagamentoEntrega,
  ])

  useEffect(() => {
    if (!open || vendaId || modoVisualizacao) return
    setStatus(statusPadraoNovoPedido(tipoInicioPedido))
  }, [open, vendaId, modoVisualizacao, tipoInicioPedido, setStatus])

  useEffect(() => {
    if (open && !vendaId) {
      setCurrentStep(1)
    }
  }, [open, vendaId, setCurrentStep])

  useEffect(() => {
    if (!open || !vendaId) return

    if (modoVisualizacao) {
      setCurrentStep(4)
    } else {
      setCurrentStep(1)
    }
  }, [open, vendaId, modoVisualizacao, setCurrentStep])

  useEffect(() => {
    if (!open) {
      setNomeUsuario('')
      return
    }
    if (!tenantAuth) {
      setNomeUsuario('')
      return
    }
    setNomeUsuario(tenantAuth.getUser()?.getName()?.trim() ?? '')
  }, [open, tenantAuth, setNomeUsuario])

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
      if (longPressComplementoTimeoutRef.current) {
        clearTimeout(longPressComplementoTimeoutRef.current)
      }
    }
  }, [longPressTimeoutRef, longPressComplementoTimeoutRef])

  return {}
}
