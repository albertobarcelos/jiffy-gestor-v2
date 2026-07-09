'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarPedidoPublico } from '@/src/infrastructure/api/publicDeliveryApi'
import { usePublicDeliveryMeiosPagamento } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import {
  useDeliveryCarrinhoStore,
  useDeliveryCarrinhoItens,
  useDeliveryCarrinhoTotal,
} from '../stores/deliveryCarrinhoStore'
import {
  useDeliveryPreferenciaEntregaStore,
  type DeliveryTipoEntrega,
} from '../stores/deliveryPreferenciaEntregaStore'
import {
  montarPedidoPublico,
  type CheckoutFormData,
} from '../utils/montarPedidoPublico'

function createInitialForm(tipoEntrega: DeliveryTipoEntrega): CheckoutFormData {
  return {
    tipoEntrega,
    telefone: '',
    nome: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    meioPagamentoId: '',
  }
}

export function useDeliveryCheckout(slug: string) {
  const router = useRouter()
  const itens = useDeliveryCarrinhoItens(slug)
  const total = useDeliveryCarrinhoTotal(slug)
  const limpar = useDeliveryCarrinhoStore(s => s.limpar)
  const setTipoEntregaPreferencia = useDeliveryPreferenciaEntregaStore(s => s.setTipoEntrega)

  const { data: meiosData, isLoading: loadingMeios } = usePublicDeliveryMeiosPagamento(slug)

  const [form, setForm] = useState<CheckoutFormData>(() =>
    createInitialForm(
      useDeliveryPreferenciaEntregaStore.getState().getTipoEntrega(slug)
    )
  )
  const [enviando, setEnviando] = useState(false)

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
      setForm(prev => ({ ...prev, [key]: value }))
      if (key === 'tipoEntrega') {
        setTipoEntregaPreferencia(slug, value as DeliveryTipoEntrega)
      }
    },
    [slug, setTipoEntregaPreferencia]
  )

  const enviarPedido = useCallback(async () => {
    const resultado = montarPedidoPublico({ slug, itens, total, form })
    if (!resultado.ok) {
      showToast.error(resultado.error)
      return
    }

    setEnviando(true)
    try {
      await criarPedidoPublico(resultado.payload)
      limpar(slug)
      showToast.success('Pedido enviado com sucesso!')
      router.push(`/cardapio/${encodeURIComponent(slug)}`)
    } catch (error) {
      console.error(error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }, [slug, itens, total, form, limpar, router])

  return {
    itens,
    total,
    form,
    updateForm,
    meiosPagamento: meiosData?.meiosPagamento ?? [],
    loadingMeios,
    enviando,
    enviarPedido,
  }
}
