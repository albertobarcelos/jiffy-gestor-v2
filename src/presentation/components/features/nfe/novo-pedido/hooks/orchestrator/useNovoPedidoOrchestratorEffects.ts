'use client'

import { useEffect, useRef } from 'react'
import { resolverNomeUsuarioGestorUseCase } from '@/src/application/use-cases/auth/ResolverNomeUsuarioGestorUseCase'
import { statusPadraoNovoPedido } from '@/src/domain/services/pedido/RegrasStatusPedido'
import type { Auth } from '@/src/domain/entities/Auth'
import type { AbaDetalhesPedido } from '../../types'

type AuthState = Auth | null

export type UseNovoPedidoOrchestratorEffectsParams = {
  open: boolean
  vendaId: string | undefined
  modoVisualizacao: boolean | undefined
  tipoInicioPedido: 'balcao' | 'entrega'
  auth: AuthState
  currentStep: 1 | 2 | 3 | 4
  abaDetalhesPedido: AbaDetalhesPedido
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  setAbaDetalhesPedido: (aba: AbaDetalhesPedido) => void
  setStatus: (status: import('../../types').StatusVenda) => void
  setNomeUsuario: (nome: string) => void
  carregarVendaExistente: () => void | Promise<void>
  longPressTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>
  longPressComplementoTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>
}

export function useNovoPedidoOrchestratorEffects({
  open,
  vendaId,
  modoVisualizacao,
  tipoInicioPedido,
  auth,
  currentStep,
  abaDetalhesPedido,
  podeExibirAbaNotaFiscal,
  podeExibirAbaDadosEntrega,
  setCurrentStep,
  setAbaDetalhesPedido,
  setStatus,
  setNomeUsuario,
  carregarVendaExistente,
  longPressTimeoutRef,
  longPressComplementoTimeoutRef,
}: UseNovoPedidoOrchestratorEffectsParams) {
  const nomeUsuarioCarregadoNoCicloRef = useRef(false)

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
    if (!open || vendaId || modoVisualizacao) return
    setStatus(statusPadraoNovoPedido(tipoInicioPedido))
  }, [open, vendaId, modoVisualizacao, tipoInicioPedido, setStatus])

  useEffect(() => {
    if (open && !vendaId) {
      setCurrentStep(1)
    }
  }, [open, vendaId, setCurrentStep])

  useEffect(() => {
    if (open && vendaId) {
      if (modoVisualizacao) {
        setCurrentStep(4)
      } else {
        setCurrentStep(1)
      }
      carregarVendaExistente()
    }
  }, [open, vendaId, modoVisualizacao, carregarVendaExistente, setCurrentStep])

  useEffect(() => {
    const fetchNomeUsuario = async () => {
      if (!open) return
      if (!auth) {
        setNomeUsuario('')
        nomeUsuarioCarregadoNoCicloRef.current = false
        return
      }
      if (nomeUsuarioCarregadoNoCicloRef.current) return
      nomeUsuarioCarregadoNoCicloRef.current = true

      try {
        const token = auth.getAccessToken()
        if (!token) {
          setNomeUsuario('')
          nomeUsuarioCarregadoNoCicloRef.current = false
          return
        }

        const user = auth.getUser()
        const nome = await resolverNomeUsuarioGestorUseCase.execute(
          token,
          user?.getName() || ''
        )
        setNomeUsuario(nome)
      } catch {
        const user = auth.getUser()
        setNomeUsuario(user?.getName() || '')
        nomeUsuarioCarregadoNoCicloRef.current = false
      }
    }

    void fetchNomeUsuario()
  }, [open, auth, setNomeUsuario])

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

  return { resetNomeUsuarioCarregado: () => {
    nomeUsuarioCarregadoNoCicloRef.current = false
  } }
}
