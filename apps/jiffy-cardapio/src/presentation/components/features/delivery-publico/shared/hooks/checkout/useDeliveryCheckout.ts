'use client'

/**
 * Façade do checkout público.
 *
 * Responsabilidades (B1):
 * - form / preferência de entrega
 * - cliente: lookup telefone, nome, endereços (useCheckoutCliente)
 * - cotação: token, cobertura, rate-limit (useCheckoutCotacao)
 * - pedido: meios + envio (useCheckoutPedido)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { comporTelefoneApi } from '@/src/shared/utils/deliveryTelefonePais'
import {
  useDeliveryCarrinhoStore,
  useDeliveryCarrinhoItens,
  useDeliveryCarrinhoTotal,
} from '../../stores/deliveryCarrinhoStore'
import {
  useDeliveryPreferenciaEntregaStore,
  type DeliveryTipoEntrega,
} from '../../stores/deliveryPreferenciaEntregaStore'
import { COTACAO_INVALIDATING_FORM_KEYS, aplicarPatchFormCheckout, createInitialForm } from './formHelpers'
import type { UseDeliveryCheckoutOptions } from './types'
import { useCheckoutCliente } from './useCheckoutCliente'
import { useCheckoutCotacao } from './useCheckoutCotacao'
import { useCheckoutPedido } from './useCheckoutPedido'
import { deveLimparPagamentosPorMudancaTotal } from '@/src/application/services/delivery-publico/checkoutPagamentos'

export type {
  ClienteLookupState,
  ClienteLookupStatus,
  EnviarPedidoCheckoutResult,
  RecotarPedidoResult,
  UseDeliveryCheckoutOptions,
} from './types'

export function useDeliveryCheckout(slug: string, options?: UseDeliveryCheckoutOptions) {
  const itens = useDeliveryCarrinhoItens(slug)
  const total = useDeliveryCarrinhoTotal(slug)
  const limpar = useDeliveryCarrinhoStore(s => s.limpar)
  const setTipoEntregaPreferencia = useDeliveryPreferenciaEntregaStore(s => s.setTipoEntrega)

  const [form, setForm] = useState<CheckoutFormData>(() =>
    createInitialForm(
      useDeliveryPreferenciaEntregaStore.getState().getTipoEntrega(slug)
    )
  )
  const formRef = useRef(form)
  formRef.current = form

  const telefoneDigitsRef = useRef('')
  const clienteLookupBridgeRef = useRef<{ cliente: ClienteDeliveryPublicoDTO | null }>({
    cliente: null,
  })
  const onClienteGarantidoRef = useRef<(cliente: ClienteDeliveryPublicoDTO) => void>(
    () => undefined
  )
  /** Total sob o qual os pagamentos atuais foram lançados / validados. */
  const totalPagamentosBaselineRef = useRef<number | null>(null)

  const resolveTelefoneApi = useCallback((formData: CheckoutFormData) => {
    return (
      telefoneDigitsRef.current ||
      comporTelefoneApi(formData.telefone, formData.telefonePaisIso2)
    )
  }, [])

  const cotacaoApi = useCheckoutCotacao({
    slug,
    itens,
    formRef,
    clienteLookupRef: clienteLookupBridgeRef,
    resolveTelefoneApi,
    telefoneDigitsRef,
    onClienteGarantido: cliente => onClienteGarantidoRef.current(cliente),
  })

  /**
   * Invalida só o token de cotação.
   * Pagamentos só caem quando o total oficial muda (`deveLimparPagamentosPorMudancaTotal`)
   * ou em reset explícito do carrinho após pedido.
   */
  const limparCotacao = useCallback(() => {
    cotacaoApi.limparCotacao()
  }, [cotacaoApi.limparCotacao])

  const limparPagamentos = useCallback(() => {
    if (formRef.current.pagamentos.length === 0) return
    const next = { ...formRef.current, pagamentos: [] }
    formRef.current = next
    setForm(next)
    totalPagamentosBaselineRef.current = null
  }, [])

  const limparCotacaoEPagamentos = useCallback(() => {
    limparCotacao()
    limparPagamentos()
  }, [limparCotacao, limparPagamentos])

  useEffect(() => {
    limparCotacao()
  }, [itens, limparCotacao])

  const clienteApi = useCheckoutCliente({
    formRef,
    setForm,
    telefoneDigitsRef,
    limparCotacao,
    cotacaoRef: cotacaoApi.cotacaoRef,
    cotacaoSeqRef: cotacaoApi.cotacaoSeqRef,
    setCotacao: cotacaoApi.setCotacao,
    setCotacaoLoading: cotacaoApi.setCotacaoLoading,
  })

  const {
    agendarConsultaTelefone,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    restaurarEnderecoSelecaoCancelada,
    limparBackupEnderecoSelecionado,
    preencherFormParaEditarEndereco,
    removerEnderecoCliente,
    consultarClientePorTelefone,
    consultarTelefoneAtual,
    limparIdentificacaoCliente,
    confirmarNovoEndereco,
    confirmarGeoEnderecoExistente,
    salvarNomeCliente,
    podeCriarNovoEndereco,
    clienteLookup,
    setClienteLookup,
  } = clienteApi

  onClienteGarantidoRef.current = cliente => {
    setClienteLookup({
      status: 'encontrado',
      telefoneConsultado: cliente.telefone,
      cliente,
      mensagemErro: null,
    })
  }

  clienteLookupBridgeRef.current = { cliente: clienteLookup.cliente }

  useEffect(() => {
    const syncTipoEntregaFromStore = () => {
      setForm(prev => ({
        ...prev,
        tipoEntrega: useDeliveryPreferenciaEntregaStore.getState().getTipoEntrega(slug),
      }))
    }

    if (useDeliveryPreferenciaEntregaStore.persist.hasHydrated()) {
      syncTipoEntregaFromStore()
      return
    }

    return useDeliveryPreferenciaEntregaStore.persist.onFinishHydration(syncTipoEntregaFromStore)
  }, [slug])

  const updateForm = useCallback(
    <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => {
      const invalidaCotacao = COTACAO_INVALIDATING_FORM_KEYS.has(key)
      const next = aplicarPatchFormCheckout(formRef.current, key, value)
      if (key === 'telefone' || key === 'telefonePaisIso2') {
        telefoneDigitsRef.current = comporTelefoneApi(next.telefone, 'BR')
      }
      formRef.current = next
      setForm(next)
      if (key === 'tipoEntrega') {
        setTipoEntregaPreferencia(slug, value as DeliveryTipoEntrega)
      }
      if (key === 'telefone' || key === 'telefonePaisIso2') {
        agendarConsultaTelefone(next.telefone)
      }
      if (invalidaCotacao) {
        cotacaoApi.limparCotacao()
      }
    },
    [slug, setTipoEntregaPreferencia, agendarConsultaTelefone, cotacaoApi.limparCotacao]
  )

  const pedidoApi = useCheckoutPedido({
    slug,
    options,
    form,
    formRef,
    clienteLookup,
    setClienteLookup,
    itens,
    total,
    cotacaoRef: cotacaoApi.cotacaoRef,
    resolveTelefoneApi,
    telefoneDigitsRef,
    recotarPedido: cotacaoApi.recotarPedido,
    setForaCoberturaDialogAberto: cotacaoApi.setForaCoberturaDialogAberto,
  })

  const totalOficial = cotacaoApi.cotacao?.valorFinal ?? null
  const subtotalOficial = cotacaoApi.cotacao?.subtotalProdutos ?? null
  const taxaEntregaOficial = cotacaoApi.cotacao?.taxaEntrega ?? null
  const cotacaoPronta =
    Boolean(cotacaoApi.cotacao?.tokenCotacao) && !cotacaoApi.cotacaoLoading

  useEffect(() => {
    if (pedidoApi.enviando) return

    const pagamentos = formRef.current.pagamentos
    const baseline = totalPagamentosBaselineRef.current

    if (pagamentos.length === 0) {
      totalPagamentosBaselineRef.current = totalOficial
      return
    }

    if (deveLimparPagamentosPorMudancaTotal(baseline, totalOficial, pagamentos.length)) {
      const next = { ...formRef.current, pagamentos: [] }
      formRef.current = next
      setForm(next)
      totalPagamentosBaselineRef.current = totalOficial
      return
    }

    if (baseline == null && totalOficial != null) {
      totalPagamentosBaselineRef.current = totalOficial
    }
  }, [totalOficial, pedidoApi.enviando])

  const limparCarrinhoAposPedido = useCallback(() => {
    limparCotacaoEPagamentos()
    limpar(slug)
  }, [limpar, slug, limparCotacaoEPagamentos])

  return {
    itens,
    total,
    totalOficial,
    subtotalOficial,
    taxaEntregaOficial,
    cotacao: cotacaoApi.cotacao,
    cotacaoLoading: cotacaoApi.cotacaoLoading,
    cotacaoPronta,
    recotarPedido: cotacaoApi.recotarPedido,
    aplicarCotacaoAtualizada: cotacaoApi.aplicarCotacaoAtualizada,
    limparCotacao,
    limparCarrinhoAposPedido,
    foraCoberturaDialogAberto: cotacaoApi.foraCoberturaDialogAberto,
    fecharForaCoberturaDialog: cotacaoApi.fecharForaCoberturaDialog,
    form,
    updateForm,
    clienteLookup,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    restaurarEnderecoSelecaoCancelada,
    limparBackupEnderecoSelecionado,
    preencherFormParaEditarEndereco,
    removerEnderecoCliente,
    consultarClientePorTelefone,
    consultarTelefoneAtual,
    limparIdentificacaoCliente,
    confirmarNovoEndereco,
    confirmarGeoEnderecoExistente,
    salvarNomeCliente,
    podeCriarNovoEndereco,
    meiosPagamento: pedidoApi.meiosPagamento,
    loadingMeios: pedidoApi.loadingMeios,
    enviando: pedidoApi.enviando,
    etapaEnvio: pedidoApi.etapaEnvio,
    enviarPedido: pedidoApi.enviarPedido,
  }
}
