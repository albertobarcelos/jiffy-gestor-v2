'use client'

import { useCallback, useMemo, useRef } from 'react'
import type { CriarVendaGestorInputDTO } from '@/src/application/dto/CriarVendaGestorDTO'
import {
  CriarPedidoDeliveryUseCase,
  extrairIdPedidoDeliveryCriado,
} from '@/src/application/use-cases/delivery/CriarPedidoDeliveryUseCase'
import {
  CriarVendaGestorUseCase,
  extrairIdVendaCriada,
  validarCriarVendaGestor,
  validarInformacoesPedido,
} from '@/src/application/use-cases/vendas/CriarVendaGestorUseCase'
import type { CriarPedidoDeliveryApiRequest } from '@/src/application/dto/api/pedidoDeliveryApi'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { validarObservacoesPedido } from '@/src/shared/helpers/observacaoPedido'

export { validarInformacoesPedido }

export function useNovoPedidoSubmitGuard(isPending: boolean) {
  const submitEmAndamentoRef = useRef(false)

  const iniciarSubmit = useCallback(() => {
    if (submitEmAndamentoRef.current || isPending) return false
    submitEmAndamentoRef.current = true
    return true
  }, [isPending])

  const finalizarSubmit = useCallback(() => {
    submitEmAndamentoRef.current = false
  }, [])

  return {
    iniciarSubmit,
    finalizarSubmit,
  }
}

export function useNovoPedidoResetOnExit(resetForm: () => void, onAfterClose?: () => void) {
  const resetFormRef = useRef(resetForm)
  resetFormRef.current = resetForm

  /** Após o Slide de saída: evita reset síncrono que quebra a animação e notifica o pai. */
  return useCallback(() => {
    resetFormRef.current()
    onAfterClose?.()
  }, [onAfterClose])
}

export interface UseNovoPedidoSubmitParams {
  isPending: boolean
  iniciarSubmit: () => boolean
  finalizarSubmit: () => void
  input: CriarVendaGestorInputDTO & { telefoneCliente?: string }
  validacao: {
    pedidoDeliveryGestor: boolean
    pedidoGestorComPagamentoNoPasso3: boolean
    pedidoEntregaAceitaPagamentoPendente: boolean
    entregaComCobrancaPeloEntregador: boolean
    pedidoComRetirada: boolean
    pedidoComEntrega: boolean
    temEnderecoEntrega: boolean
    troco: number
  }
  createVendaGestor: {
    mutateAsync: (
      payload: import('@/src/application/dto/api/vendaGestorApi').CriarVendaGestorApiRequest
    ) => Promise<unknown>
  }
  createPedidoDelivery?: {
    mutateAsync: (payload: CriarPedidoDeliveryApiRequest) => Promise<unknown>
  }
  onSuccess: () => void
  onClose: () => void
  setInternalDialogOpen: (open: boolean) => void
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  setVendaIdCriada: (id: string | null) => void
  status: CriarVendaGestorInputDTO['status']
  tipoInicioPedido: CriarVendaGestorInputDTO['tipoInicioPedido']
  processarAposTransicaoVendaGestorId?: (
    id: string,
    acao: 'iniciar_preparo'
  ) => Promise<void>
  preferenciasAutoIniciarPreparo?: boolean
  accessToken?: string
}

export function useNovoPedidoSubmit({
  isPending,
  iniciarSubmit,
  finalizarSubmit,
  input,
  validacao,
  createVendaGestor,
  createPedidoDelivery,
  onSuccess,
  onClose,
  setInternalDialogOpen,
  setCurrentStep,
  setVendaIdCriada,
  status,
  tipoInicioPedido,
  processarAposTransicaoVendaGestorId,
  preferenciasAutoIniciarPreparo,
  accessToken,
}: UseNovoPedidoSubmitParams) {
  const criarVendaGestorUseCase = useMemo(() => new CriarVendaGestorUseCase(), [])
  const criarPedidoDeliveryUseCase = useMemo(() => new CriarPedidoDeliveryUseCase(), [])

  const handleSubmit = useCallback(async () => {
    if (isPending) return

    const validacaoObservacoes = validarObservacoesPedido({
      observacaoPedido: input.observacaoPedido,
      produtos: input.produtos,
    })
    if (!validacaoObservacoes.ok) {
      showToast.error(validacaoObservacoes.message)
      return
    }

    const validacaoResult = validarCriarVendaGestor({
      produtosCount: input.produtos.length,
      produtos: input.produtos,
      pedidoDeliveryGestor: validacao.pedidoDeliveryGestor,
      clienteEntregaVinculadoId: input.clienteEntregaVinculado?.id,
      pedidoComEntrega: validacao.pedidoComEntrega,
      temEnderecoEntrega: validacao.temEnderecoEntrega,
      pedidoGestorComPagamentoNoPasso3: validacao.pedidoGestorComPagamentoNoPasso3,
      pedidoEntregaAceitaPagamentoPendente: validacao.pedidoEntregaAceitaPagamentoPendente,
      pagamentosCount: input.pagamentos.length,
      entregaComCobrancaPeloEntregador: validacao.entregaComCobrancaPeloEntregador,
      pedidoComRetirada: validacao.pedidoComRetirada,
      totalProdutos: input.totalProdutos,
      totalPagamentos: input.totalPagamentos,
      troco: validacao.troco,
      status,
      pagamentos: input.pagamentos,
    })

    if (!validacaoResult.ok) {
      if (validacaoResult.goToStep === 2 || validacaoResult.goToStep === 1) {
        showToast.error(validacaoResult.message)
        setCurrentStep(validacaoResult.goToStep)
        return
      }

      if (validacaoResult.code === 'pagamentos_total') {
        showToast.error(
          `Valor dos pagamentos (${transformarParaReal(input.totalPagamentos)}) não corresponde ao total (${transformarParaReal(input.totalProdutos)})`
        )
        return
      }

      showToast.error(validacaoResult.message)
      return
    }

    if (tipoInicioPedido === 'entrega' && !createPedidoDelivery) {
      showToast.error('Criação de pedido delivery não disponível.')
      return
    }

    if (!iniciarSubmit()) return

    try {
      const isPedidoDelivery = tipoInicioPedido === 'entrega'

      const resultado = isPedidoDelivery
        ? await criarPedidoDeliveryUseCase.execute(
            {
              ...input,
              telefoneCliente:
                input.telefoneCliente?.trim() ||
                input.moradaEntregaSelecionada?.telefone?.trim() ||
                '',
            },
            payload => createPedidoDelivery!.mutateAsync(payload),
            accessToken
          )
        : await criarVendaGestorUseCase.execute(input, payload =>
            createVendaGestor.mutateAsync(payload)
          )

      showToast.success('Pedido criado com sucesso!')

      const idCriado = isPedidoDelivery
        ? extrairIdPedidoDeliveryCriado(resultado)
        : extrairIdVendaCriada(resultado)

      if (idCriado) {
        setVendaIdCriada(idCriado)

        if (
          tipoInicioPedido === 'entrega' &&
          status === 'ABERTA' &&
          preferenciasAutoIniciarPreparo
        ) {
          await processarAposTransicaoVendaGestorId?.(idCriado, 'iniciar_preparo')
        }
      }

      setInternalDialogOpen(false)
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('❌ Erro ao criar pedido:', error)
      const err = error as {
        message?: string
        response?: { data?: { message?: string; error?: string } }
        stack?: string
      }
      console.error('❌ Detalhes do erro:', {
        message: err?.message,
        response: err?.response,
        responseData: err?.response?.data,
        stack: err?.stack,
      })
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao criar pedido'
      showToast.error(errorMessage)
    } finally {
      finalizarSubmit()
    }
  }, [
    isPending,
    input,
    validacao,
    iniciarSubmit,
    finalizarSubmit,
    criarVendaGestorUseCase,
    criarPedidoDeliveryUseCase,
    createVendaGestor,
    createPedidoDelivery,
    setVendaIdCriada,
    status,
    tipoInicioPedido,
    processarAposTransicaoVendaGestorId,
    preferenciasAutoIniciarPreparo,
    setInternalDialogOpen,
    onSuccess,
    onClose,
    setCurrentStep,
    accessToken,
  ])

  return { handleSubmit }
}
