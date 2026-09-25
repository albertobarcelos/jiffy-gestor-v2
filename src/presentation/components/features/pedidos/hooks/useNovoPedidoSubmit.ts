'use client'

import { useCallback, useMemo, useRef } from 'react'
import type { CriarVendaGestorInputDTO } from '@/src/application/dto/CriarVendaGestorDTO'
import { extrairIdPedidoDeliveryCriado } from '@/src/application/use-cases/delivery/CriarPedidoDeliveryUseCase'
import {
  criarPedidoDeliveryUseCase,
  resolverEstacaoIdParaCriarVendaGestorUseCase,
} from '@/src/infrastructure/composition/pedidoUseCases'
import {
  CriarVendaGestorUseCase,
  extrairIdVendaCriada,
  validarCriarVendaGestor,
  validarInformacoesPedido,
} from '@/src/application/use-cases/vendas/CriarVendaGestorUseCase'
import { MSG_ESTACAO_OBRIGATORIA_CRIAR_PEDIDO } from '@/src/domain/policies/pedido/estacaoCriarVendaGestor'
import type { CriarPedidoDeliveryApiRequest } from '@/src/application/dto/api/pedidoDeliveryApi'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { notificarEnderecoForaDaCobertura, useHrefCoberturaEntregaPedido } from '../utils/coberturaEntregaPedidoUi'
import { validarObservacoesPedido } from '@/src/shared/helpers/observacaoPedido'
import { salvarRascunhoInformacoesAdicionais } from '@/src/shared/helpers/informacoesAdicionaisNota'
import { solicitarAbrirConfigEstacaoImpressao } from '@/src/infrastructure/printing/estacaoImpressaoStorage'

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

export function useNovoPedidoResetOnExit(
  resetForm: () => void,
  onAfterClose?: () => void,
  deveResetar?: () => boolean
) {
  const resetFormRef = useRef(resetForm)
  resetFormRef.current = resetForm
  const deveResetarRef = useRef(deveResetar)
  deveResetarRef.current = deveResetar

  /** Após o Slide de saída: evita reset síncrono que quebra a animação e notifica o pai. */
  return useCallback(() => {
    if (deveResetarRef.current?.() !== false) {
      resetFormRef.current()
    }
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
    enderecoEntregaTemGeo?: boolean
    enderecoEntregaCoberturaStatus?: 'ok' | 'fora' | 'pendente' | 'indisponivel' | null
    taxaEntregaOverride?: 'automatica' | 'sem_taxa' | 'catalogo'
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
  observacaoNota?: string
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
  observacaoNota,
  status,
  tipoInicioPedido,
  processarAposTransicaoVendaGestorId,
  preferenciasAutoIniciarPreparo,
  accessToken,
}: UseNovoPedidoSubmitParams) {
  const hrefCoberturaEntrega = useHrefCoberturaEntregaPedido()
  const criarVendaGestorUseCase = useMemo(() => new CriarVendaGestorUseCase(), [])

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
      telefoneClienteDelivery: input.telefoneCliente,
      pedidoComEntrega: validacao.pedidoComEntrega,
      temEnderecoEntrega: validacao.temEnderecoEntrega,
      enderecoEntregaTemGeo: validacao.enderecoEntregaTemGeo,
      enderecoEntregaCoberturaStatus: validacao.enderecoEntregaCoberturaStatus,
      taxaEntregaOverride: validacao.taxaEntregaOverride,
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
      if (validacaoResult.code === 'cobertura') {
        notificarEnderecoForaDaCobertura(hrefCoberturaEntrega)
        setCurrentStep(validacaoResult.goToStep ?? 2)
        return
      }

      if (validacaoResult.goToStep === 2 || validacaoResult.goToStep === 1) {
        showToast.error(validacaoResult.message)
        setCurrentStep(validacaoResult.goToStep)
        return
      }

      if (validacaoResult.code === 'pagamentos_total') {
        const valorInformado =
          validacao.entregaComCobrancaPeloEntregador ||
          input.totalPagamentosLancados > input.totalPagamentos
            ? input.totalPagamentosLancados
            : input.totalPagamentos
        showToast.error(
          `Valor dos pagamentos (${transformarParaReal(valorInformado)}) não corresponde ao total (${transformarParaReal(input.totalProdutos)})`
        )
        return
      }

      showToast.error(validacaoResult.message)
      return
    }

    if (tipoInicioPedido === 'delivery' && !createPedidoDelivery) {
      showToast.error('Criação de pedido delivery não disponível.')
      return
    }

    const isPedidoDelivery = tipoInicioPedido === 'delivery'
    let estacaoIdCriacao = ''

    if (!isPedidoDelivery) {
      const estacao = await resolverEstacaoIdParaCriarVendaGestorUseCase.execute(accessToken)
      if (!estacao.ok) {
        showToast.error(estacao.mensagem)
        if (estacao.codigo === 'AUSENTE') {
          solicitarAbrirConfigEstacaoImpressao()
        }
        return
      }
      estacaoIdCriacao = estacao.estacaoId
    }

    if (!iniciarSubmit()) return

    try {
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
        : await criarVendaGestorUseCase.execute(
            { ...input, estacaoId: estacaoIdCriacao },
            payload => createVendaGestor.mutateAsync(payload)
          )

      showToast.success('Pedido criado com sucesso!')

      const idCriado = isPedidoDelivery
        ? extrairIdPedidoDeliveryCriado(resultado)
        : extrairIdVendaCriada(resultado)

      if (idCriado) {
        setVendaIdCriada(idCriado)
        if (observacaoNota) {
          salvarRascunhoInformacoesAdicionais(idCriado, observacaoNota)
        }
      }

      setInternalDialogOpen(false)
      onSuccess()
      onClose()

      if (
        idCriado &&
        tipoInicioPedido === 'delivery' &&
        status === 'ABERTA' &&
        preferenciasAutoIniciarPreparo
      ) {
        void processarAposTransicaoVendaGestorId?.(idCriado, 'iniciar_preparo').catch(error => {
          console.error('Impressão após criar pedido falhou; o pedido já foi criado.', error)
        })
      }
    } catch (error: unknown) {
      console.error('❌ Erro ao criar pedido:', error)
      const err = error as {
        message?: string
        response?: {
          data?: {
            message?: string
            error?: string
            title?: string
            code?: string
            type?: string
          }
        }
        stack?: string
      }
      console.error('❌ Detalhes do erro:', {
        message: err?.message,
        response: err?.response,
        responseData: err?.response?.data,
        stack: err?.stack,
      })
      const data = err?.response?.data
      const code = String(data?.code ?? data?.type ?? data?.title ?? data?.error ?? '')
      const rawMessage =
        data?.message || data?.error || data?.title || err?.message || 'Erro ao criar pedido'

      if (code.includes('GEOLOCALIZACAO_NAO_CONFIGURADA') || /geolocaliza/i.test(rawMessage)) {
        showToast.error(
          'Não foi possível obter a localização. Confira o endereço e a geo da empresa no hub Delivery.'
        )
        setCurrentStep(2)
        return
      }

      if (
        /estacaoId|esta[cç][aã]o.*obrigat/i.test(rawMessage) ||
        /esta[cç][aã]o do gestor/i.test(rawMessage)
      ) {
        showToast.error(MSG_ESTACAO_OBRIGATORIA_CRIAR_PEDIDO)
        solicitarAbrirConfigEstacaoImpressao()
        return
      }

      if (
        code.includes('ENDERECO_FORA_COBERTURA_ENTREGA') ||
        /fora da cobertura|não está coberto/i.test(rawMessage)
      ) {
        notificarEnderecoForaDaCobertura(hrefCoberturaEntrega)
        setCurrentStep(2)
        return
      }

      showToast.error(rawMessage)
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
    observacaoNota,
    status,
    tipoInicioPedido,
    processarAposTransicaoVendaGestorId,
    preferenciasAutoIniciarPreparo,
    setInternalDialogOpen,
    onSuccess,
    onClose,
    setCurrentStep,
    accessToken,
    hrefCoberturaEntrega,
  ])

  return { handleSubmit }
}
