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
import { COTACAO_INVALIDATING_FORM_KEYS, createInitialForm } from './formHelpers'
import type { UseDeliveryCheckoutOptions } from './types'
import { useCheckoutCliente } from './useCheckoutCliente'
import { useCheckoutCotacao } from './useCheckoutCotacao'
import { useCheckoutPedido } from './useCheckoutPedido'

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
  })

  const limparCotacaoComPagamentos = useCallback(() => {
    cotacaoApi.limparCotacao()
    setForm(prev => {
      if (prev.pagamentos.length === 0) return prev
      return { ...prev, pagamentos: [] }
    })
  }, [cotacaoApi.limparCotacao])

  useEffect(() => {
    limparCotacaoComPagamentos()
  }, [itens, limparCotacaoComPagamentos])

  const clienteApi = useCheckoutCliente({
    formRef,
    setForm,
    telefoneDigitsRef,
    limparCotacao: limparCotacaoComPagamentos,
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
      const next = { ...formRef.current, [key]: value }
      next.telefonePaisIso2 = 'BR'
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
      if (COTACAO_INVALIDATING_FORM_KEYS.has(key)) {
        limparCotacaoComPagamentos()
      }
    },
    [slug, setTipoEntregaPreferencia, agendarConsultaTelefone, limparCotacaoComPagamentos]
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

  const limparCarrinhoAposPedido = useCallback(() => {
    limparCotacaoComPagamentos()
    limpar(slug)
  }, [limpar, slug, limparCotacaoComPagamentos])

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
    limparCotacao: limparCotacaoComPagamentos,
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
    enviarPedido: pedidoApi.enviarPedido,
  }
}
