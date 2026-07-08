'use client'

import { useCallback, useState } from 'react'
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
  montarPedidoPublico,
  type CheckoutFormData,
} from '../utils/montarPedidoPublico'

const INITIAL_FORM: CheckoutFormData = {
  tipoEntrega: 'retirada',
  telefone: '',
  nome: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: '',
  meioPagamentoId: '',
}

export function useDeliveryCheckout(slug: string) {
  const router = useRouter()
  const itens = useDeliveryCarrinhoItens(slug)
  const total = useDeliveryCarrinhoTotal(slug)
  const limpar = useDeliveryCarrinhoStore(s => s.limpar)

  const { data: meiosData, isLoading: loadingMeios } = usePublicDeliveryMeiosPagamento(slug)

  const [form, setForm] = useState<CheckoutFormData>(INITIAL_FORM)
  const [enviando, setEnviando] = useState(false)

  const updateForm = useCallback(<K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const enviarPedido = useCallback(async () => {
    const resultado = montarPedidoPublico({ slug, itens, total, form })
    if (!resultado.ok) {
      showToast.error(resultado.error)
      return
    }
    if (!confirm('Confirmar envio do pedido?')) return

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
