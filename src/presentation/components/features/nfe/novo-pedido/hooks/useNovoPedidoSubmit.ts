'use client'

import { useCallback, useMemo, useRef } from 'react'
import type { CriarVendaGestorInputDTO } from '@/src/application/dto/CriarVendaGestorDTO'
import {
  CriarVendaGestorUseCase,
  extrairIdVendaCriada,
  validarCriarVendaGestor,
  validarInformacoesPedido,
} from '@/src/application/use-cases/vendas/CriarVendaGestorUseCase'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'

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
  input: CriarVendaGestorInputDTO
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
  onSuccess: () => void
  onClose: () => void
  setInternalDialogOpen: (open: boolean) => void
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  setVendaIdCriada: (id: string | null) => void
  status: CriarVendaGestorInputDTO['status']
  tipoInicioPedido: CriarVendaGestorInputDTO['tipoInicioPedido']
  finalizarVendaGestor?: { mutateAsync: (params: { id: string }) => Promise<unknown> }
  processarAposTransicaoVendaGestorId?: (
    id: string,
    acao: 'iniciar_preparo'
  ) => Promise<void>
  preferenciasAutoIniciarPreparo?: boolean
}

export function useNovoPedidoSubmit({
  isPending,
  iniciarSubmit,
  finalizarSubmit,
  input,
  validacao,
  createVendaGestor,
  onSuccess,
  onClose,
  setInternalDialogOpen,
  setCurrentStep,
  setVendaIdCriada,
  status,
  tipoInicioPedido,
  finalizarVendaGestor,
  processarAposTransicaoVendaGestorId,
  preferenciasAutoIniciarPreparo,
}: UseNovoPedidoSubmitParams) {
  const useCase = useMemo(() => new CriarVendaGestorUseCase(), [])

  const handleSubmit = useCallback(async () => {
    if (isPending) return

    const validacaoResult = validarCriarVendaGestor({
      produtosCount: input.produtos.length,
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
        validarInformacoesPedido({
          pedidoDeliveryGestor: validacao.pedidoDeliveryGestor,
          clienteEntregaVinculadoId: input.clienteEntregaVinculado?.id,
          pedidoComEntrega: validacao.pedidoComEntrega,
          temEnderecoEntrega: validacao.temEnderecoEntrega,
          exibirToast: true,
          onError: showToast.error,
        })
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

    if (!iniciarSubmit()) return

    try {
      const resultado = await useCase.execute(input, payload =>
        createVendaGestor.mutateAsync(payload)
      )
      console.log('✅ Venda criada com sucesso:', resultado)
      showToast.success('Pedido criado com sucesso!')

      const idCriado = extrairIdVendaCriada(resultado)

      if (idCriado) {
        setVendaIdCriada(idCriado)

        if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
          try {
            await finalizarVendaGestor?.mutateAsync({ id: idCriado })
          } catch {
            // Falha silenciosa: a venda foi criada e a lista será atualizada pelo fluxo de sucesso.
          }
        }

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
    useCase,
    createVendaGestor,
    setVendaIdCriada,
    status,
    tipoInicioPedido,
    finalizarVendaGestor,
    processarAposTransicaoVendaGestorId,
    preferenciasAutoIniciarPreparo,
    setInternalDialogOpen,
    onSuccess,
    onClose,
    setCurrentStep,
  ])

  return { handleSubmit }
}
