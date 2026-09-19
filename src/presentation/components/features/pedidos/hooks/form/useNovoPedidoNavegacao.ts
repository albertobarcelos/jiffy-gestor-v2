'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import {
  notificarEnderecoForaDaCobertura,
  useHrefCoberturaEntregaPedido,
} from '../../utils/coberturaEntregaPedidoUi'
import {
  validarInformacoesPedido as validarInformacoesPedidoEntrega,
} from '../useNovoPedidoSubmit'
import type { PagamentoSelecionado, ProdutoSelecionado } from '../../types'

export interface UseNovoPedidoNavegacaoParams {
  open: boolean
  onClose: () => void
  vendaId?: string
  modoVisualizacao?: boolean
  tipoInicioPedido: 'balcao' | 'delivery'
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  clienteId: string
  currentStep: 1 | 2 | 3 | 4
  setCurrentStep: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>
  pedidoDeliveryGestor: boolean
  clienteEntregaVinculadoId?: string
  telefoneClienteDelivery?: string | null
  pedidoComEntrega: boolean
  temEnderecoEntrega: boolean
  enderecoEntregaTemGeo?: boolean
  enderecoEntregaCoberturaStatus?: 'ok' | 'fora' | 'pendente' | 'indisponivel' | null
  taxaEntregaOverride?: 'automatica' | 'sem_taxa' | 'catalogo'
  /** Edição de produtos de pedido existente: trava a navegação entre etapas. */
  modoEdicaoProdutos?: boolean
  /** ESC/fechar no modo edição: restaura o snapshot e sai da edição. */
  onFecharEdicaoProdutos?: () => void
  /** true quando a edição começou na aba Lista Produtos (não fecha o painel). */
  edicaoProdutosPermaneceNoPainel?: boolean
  /** Após editar itens, o pagamento divergiu — não deixa sair sem gravar a cobrança. */
  ajustandoPagamentoAposEdicaoItens?: boolean
  /**
   * Fecha o painel sem descartar o lançamento (atalho WhatsApp).
   * O rascunho volta ao reabrir o pedido da mesma conversa.
   */
  preservarRascunhoAoFechar?: boolean
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
  telefoneClienteDelivery,
  pedidoComEntrega,
  temEnderecoEntrega,
  enderecoEntregaTemGeo,
  enderecoEntregaCoberturaStatus,
  taxaEntregaOverride,
  modoEdicaoProdutos,
  onFecharEdicaoProdutos,
  edicaoProdutosPermaneceNoPainel = false,
  ajustandoPagamentoAposEdicaoItens = false,
  preservarRascunhoAoFechar = false,
}: UseNovoPedidoNavegacaoParams) {
  const hrefCoberturaEntrega = useHrefCoberturaEntregaPedido()
  const [modalConfirmacaoSaidaOpen, setModalConfirmacaoSaidaOpen] = useState(false)
  const [internalDialogOpen, setInternalDialogOpen] = useState(open)
  const ignorarBackdropAteRef = useRef(0)

  const temDadosVenda = useCallback(() => {
    if (vendaId && modoVisualizacao) return false
    return produtos.length > 0 || pagamentos.length > 0 || clienteId !== '' || currentStep > 1
  }, [vendaId, modoVisualizacao, produtos.length, pagamentos.length, clienteId, currentStep])

  const handleClose = useCallback(() => {
    if (ajustandoPagamentoAposEdicaoItens) {
      showToast.warning('Ajuste o pagamento do pedido antes de sair.')
      return
    }
    if (modoEdicaoProdutos && onFecharEdicaoProdutos) {
      onFecharEdicaoProdutos()
      return
    }
    if (vendaId && modoVisualizacao) {
      onClose()
      return
    }
    if (temDadosVenda()) {
      setModalConfirmacaoSaidaOpen(true)
    } else {
      onClose()
    }
  }, [
    ajustandoPagamentoAposEdicaoItens,
    modoEdicaoProdutos,
    onFecharEdicaoProdutos,
    vendaId,
    modoVisualizacao,
    temDadosVenda,
    onClose,
  ])

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
        telefoneClienteDelivery,
        pedidoComEntrega,
        temEnderecoEntrega,
        enderecoEntregaTemGeo,
        enderecoEntregaCoberturaStatus,
        taxaEntregaOverride,
        exibirToast,
        onError: message => {
          if (enderecoEntregaCoberturaStatus === 'fora') {
            notificarEnderecoForaDaCobertura(hrefCoberturaEntrega)
            return
          }
          showToast.error(message)
        },
      }),
    [
      pedidoDeliveryGestor,
      clienteEntregaVinculadoId,
      telefoneClienteDelivery,
      pedidoComEntrega,
      temEnderecoEntrega,
      enderecoEntregaTemGeo,
      enderecoEntregaCoberturaStatus,
      taxaEntregaOverride,
      hrefCoberturaEntrega,
    ]
  )

  const canGoToStep2 = useCallback(() => {
    return produtos.length > 0
  }, [produtos.length])

  const canGoToStep3 = useCallback(() => {
    if (tipoInicioPedido === 'delivery') return validarInformacoesPedido(false)
    return produtos.length > 0
  }, [tipoInicioPedido, validarInformacoesPedido, produtos.length])

  const handleNextStep = useCallback(() => {
    if (vendaId && modoVisualizacao) return
    if (modoEdicaoProdutos) return

    if (currentStep === 1 && canGoToStep2()) {
      setCurrentStep(tipoInicioPedido === 'delivery' ? 2 : 3)
    } else if (currentStep === 1 && !canGoToStep2()) {
      showToast.error('Adicione pelo menos um produto antes de continuar')
    } else if (currentStep === 2 && canGoToStep3()) {
      setCurrentStep(3)
    } else if (currentStep === 2 && !canGoToStep3()) {
      if (tipoInicioPedido === 'delivery') {
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
    modoEdicaoProdutos,
  ])

  const handlePreviousStep = useCallback(() => {
    if (vendaId && modoVisualizacao) return
    if (modoEdicaoProdutos) return

    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(tipoInicioPedido === 'delivery' ? 2 : 1)
    }
  }, [vendaId, modoVisualizacao, currentStep, tipoInicioPedido, setCurrentStep, modoEdicaoProdutos])

  const handleDialogOpenChange = useCallback(
    (isOpen: boolean, reason?: 'backdropClick' | 'escapeKeyDown') => {
      if (!isOpen) {
        if (reason === 'backdropClick' && Date.now() < ignorarBackdropAteRef.current) {
          setInternalDialogOpen(true)
          return
        }
        if (ajustandoPagamentoAposEdicaoItens) {
          setInternalDialogOpen(true)
          showToast.warning('Ajuste o pagamento do pedido antes de sair.')
          return
        }
        if (preservarRascunhoAoFechar && reason === 'backdropClick') {
          setInternalDialogOpen(false)
          onClose()
          return
        }
        if (modoEdicaoProdutos && onFecharEdicaoProdutos) {
          if (edicaoProdutosPermaneceNoPainel) {
            setInternalDialogOpen(true)
          } else {
            setInternalDialogOpen(false)
          }
          onFecharEdicaoProdutos()
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
    [
      temDadosVenda,
      onClose,
      preservarRascunhoAoFechar,
      ajustandoPagamentoAposEdicaoItens,
      modoEdicaoProdutos,
      onFecharEdicaoProdutos,
      edicaoProdutosPermaneceNoPainel,
    ]
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
