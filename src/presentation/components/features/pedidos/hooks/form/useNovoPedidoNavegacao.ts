'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import {
  validarInformacoesPedido as validarInformacoesPedidoEntrega,
} from '../useNovoPedidoSubmit'
import type { PagamentoSelecionado, ProdutoSelecionado } from '../../types'

export interface UseNovoPedidoNavegacaoParams {
  open: boolean
  onClose: () => void
  vendaId?: string
  modoVisualizacao?: boolean
  tipoInicioPedido: 'balcao' | 'entrega'
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  clienteId: string
  currentStep: 1 | 2 | 3 | 4
  setCurrentStep: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
}

export function useNovoPedidoNavegacao({
  open,
  onClose,
  vendaId,
  modoVisualizacao,
  tipoInicioPedido,
  produtos,
  pagamentos,
  clienteId,
  currentStep,
  setCurrentStep,
  pedidoDeliveryGestor,
  clienteEntregaVinculadoId,
  pedidoComEntrega,
  temEnderecoEntrega,
}: UseNovoPedidoNavegacaoParams) {
  const [modalConfirmacaoSaidaOpen, setModalConfirmacaoSaidaOpen] = useState(false)
  const [internalDialogOpen, setInternalDialogOpen] = useState(open)
  const ignorarBackdropAteRef = useRef(0)

  const temDadosVenda = useCallback(() => {
    if (vendaId && modoVisualizacao) return false
    return produtos.length > 0 || pagamentos.length > 0 || clienteId !== '' || currentStep > 1
  }, [vendaId, modoVisualizacao, produtos.length, pagamentos.length, clienteId, currentStep])

  const handleClose = useCallback(() => {
    if (vendaId && modoVisualizacao) {
      onClose()
      return
    }
    if (temDadosVenda()) {
      setModalConfirmacaoSaidaOpen(true)
    } else {
      onClose()
    }
  }, [vendaId, modoVisualizacao, temDadosVenda, onClose])

  const handleConfirmarSaida = useCallback(() => {
    setModalConfirmacaoSaidaOpen(false)
    setInternalDialogOpen(false)
    onClose()
  }, [onClose])

  const handleCancelarSaida = useCallback(() => {
    setModalConfirmacaoSaidaOpen(false)
  }, [])

  const validarInformacoesPedido = useCallback(
    (exibirToast = false) =>
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor,
        clienteEntregaVinculadoId,
        pedidoComEntrega,
        temEnderecoEntrega,
        exibirToast,
        onError: showToast.error,
      }),
    [pedidoDeliveryGestor, clienteEntregaVinculadoId, pedidoComEntrega, temEnderecoEntrega]
  )

  const canGoToStep2 = useCallback(() => {
    return produtos.length > 0
  }, [produtos.length])

  const canGoToStep3 = useCallback(() => {
    if (tipoInicioPedido === 'entrega') return validarInformacoesPedido(false)
    return produtos.length > 0
  }, [tipoInicioPedido, validarInformacoesPedido, produtos.length])

  const handleNextStep = useCallback(() => {
    if (vendaId && modoVisualizacao) return

    if (currentStep === 1 && canGoToStep2()) {
      setCurrentStep(tipoInicioPedido === 'entrega' ? 2 : 3)
    } else if (currentStep === 1 && !canGoToStep2()) {
      showToast.error('Adicione pelo menos um produto antes de continuar')
    } else if (currentStep === 2 && canGoToStep3()) {
      setCurrentStep(3)
    } else if (currentStep === 2 && !canGoToStep3()) {
      if (tipoInicioPedido === 'entrega') {
        validarInformacoesPedido(true)
      } else {
        showToast.error('Adicione pelo menos um produto antes de continuar')
      }
    }
  }, [
    vendaId,
    modoVisualizacao,
    currentStep,
    canGoToStep2,
    canGoToStep3,
    tipoInicioPedido,
    setCurrentStep,
    validarInformacoesPedido,
  ])

  const handlePreviousStep = useCallback(() => {
    if (vendaId && modoVisualizacao) return

    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(tipoInicioPedido === 'entrega' ? 2 : 1)
    }
  }, [vendaId, modoVisualizacao, currentStep, tipoInicioPedido, setCurrentStep])

  const handleDialogOpenChange = useCallback(
    (isOpen: boolean, reason?: 'backdropClick' | 'escapeKeyDown') => {
      if (!isOpen) {
        if (reason === 'backdropClick' && Date.now() < ignorarBackdropAteRef.current) {
          setInternalDialogOpen(true)
          return
        }
        if (temDadosVenda()) {
          setInternalDialogOpen(true)
          setModalConfirmacaoSaidaOpen(true)
        } else {
          setInternalDialogOpen(false)
          onClose()
        }
      } else {
        setInternalDialogOpen(true)
      }
    },
    [temDadosVenda, onClose]
  )

  useEffect(() => {
    setInternalDialogOpen(open)
    if (open) {
      ignorarBackdropAteRef.current = Date.now() + 550
    }
  }, [open])

  return {
    modalConfirmacaoSaidaOpen,
    setModalConfirmacaoSaidaOpen,
    internalDialogOpen,
    setInternalDialogOpen,
    ignorarBackdropAteRef,
    handleClose,
    handleConfirmarSaida,
    handleCancelarSaida,
    handleNextStep,
    handlePreviousStep,
    handleDialogOpenChange,
    validarInformacoesPedido,
    temDadosVenda,
  }
}
