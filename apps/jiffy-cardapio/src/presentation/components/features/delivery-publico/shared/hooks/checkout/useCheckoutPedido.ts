'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { isIdentificacaoCheckoutCompleta } from '../../../public/components/checkout/deliveryCheckoutProgress'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import { isErroCoberturaEntregaPublica } from '@/src/application/errors/publicDeliveryErrors'
import { enviarPedidoPublicoUseCase } from '@/src/infrastructure/di/deliveryPublicoUseCases'
import { usePublicDeliveryMeiosPagamento } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryCarrinhoItem } from '../../stores/deliveryCarrinhoStore'
import {
  type DeliveryCheckoutCotacaoState,
  isTokenCotacaoExpirado,
} from '../../utils/deliveryCheckoutCotacaoUtils'
import type {
  ClienteLookupState,
  EnviarPedidoCheckoutResult,
  RecotarPedidoResult,
  UseDeliveryCheckoutOptions,
} from './types'

type UseCheckoutPedidoParams = {
  slug: string
  options?: UseDeliveryCheckoutOptions
  form: CheckoutFormData
  formRef: MutableRefObject<CheckoutFormData>
  clienteLookup: ClienteLookupState
  setClienteLookup: Dispatch<SetStateAction<ClienteLookupState>>
  itens: DeliveryCarrinhoItem[]
  total: number
  cotacaoRef: MutableRefObject<DeliveryCheckoutCotacaoState | null>
  resolveTelefoneApi: (formData: CheckoutFormData) => string
  telefoneDigitsRef: MutableRefObject<string>
  recotarPedido: (options?: {
    silencioso?: boolean
    chaveAuto?: string
  }) => Promise<RecotarPedidoResult>
  setForaCoberturaDialogAberto: (open: boolean) => void
}

export function useCheckoutPedido({
  slug,
  options,
  form,
  formRef: _formRef,
  clienteLookup,
  setClienteLookup,
  itens,
  total,
  cotacaoRef,
  resolveTelefoneApi,
  telefoneDigitsRef,
  recotarPedido,
  setForaCoberturaDialogAberto,
}: UseCheckoutPedidoParams) {
  const [enviando, setEnviando] = useState(false)

  const identificacaoCompletaParaMeios = useMemo(
    () =>
      isIdentificacaoCheckoutCompleta({
        lookupStatus: clienteLookup.status,
        nomeCadastro: clienteLookup.cliente?.nome ?? null,
        nomeDigitado: form.nome,
      }),
    [clienteLookup.status, clienteLookup.cliente?.nome, form.nome]
  )

  const fetchMeiosPagamento =
    (options?.fetchMeiosPagamento ?? false) ||
    ((options?.prefetchMeiosAposIdentificacao ?? false) && identificacaoCompletaParaMeios)

  const { data: meiosData, isLoading: loadingMeios } = usePublicDeliveryMeiosPagamento(
    slug,
    fetchMeiosPagamento
  )

  const enviarPedido = useCallback(async (): Promise<EnviarPedidoCheckoutResult> => {
    const tel = resolveTelefoneApi(form)
    telefoneDigitsRef.current = tel
    if (tel.length < 8) {
      showToast.error('Informe um telefone válido')
      return { ok: false }
    }

    if (itens.length === 0) {
      showToast.error('Carrinho vazio')
      return { ok: false }
    }

    const nomeEfetivo =
      form.nome.trim() || clienteLookup.cliente?.nome?.trim() || null

    let tokenCotacao = cotacaoRef.current?.tokenCotacao ?? ''
    if (
      !tokenCotacao ||
      (cotacaoRef.current && isTokenCotacaoExpirado(cotacaoRef.current.expiresAt))
    ) {
      const cotou = await recotarPedido()
      if (!cotou.ok) return { ok: false }
      tokenCotacao = cotacaoRef.current?.tokenCotacao ?? ''
    }

    if (!tokenCotacao) {
      showToast.error('Não foi possível validar os valores do pedido')
      return { ok: false }
    }

    setEnviando(true)
    try {
      const resultado = await enviarPedidoPublicoUseCase.execute({
        slug,
        telefoneApi: tel,
        nomeEfetivo,
        itens,
        total: cotacaoRef.current?.valorFinal ?? total,
        form,
        clienteLookup: clienteLookup.cliente,
        tokenCotacao,
      })

      if (!resultado.ok) {
        if ('reason' in resultado && resultado.reason === 'cotacao_desatualizada') {
          return {
            ok: false,
            reason: 'cotacao_desatualizada',
            message: resultado.message,
            cotacao: resultado.cotacao,
          }
        }
        if ('reason' in resultado && resultado.reason === 'loja_fechada') {
          showToast.error(
            'A loja está fechada no momento. Não é possível finalizar pedidos.'
          )
          return { ok: false, reason: 'loja_fechada' }
        }
        if ('error' in resultado) {
          if (isErroCoberturaEntregaPublica(resultado.error)) {
            setForaCoberturaDialogAberto(true)
          } else {
            showToast.error(resultado.error)
          }
        }
        return { ok: false }
      }

      if (resultado.clienteAtualizado) {
        setClienteLookup(prev => ({
          ...prev,
          status: 'encontrado',
          telefoneConsultado: tel,
          cliente: resultado.clienteAtualizado,
          mensagemErro: null,
        }))
      }

      return { ok: true, pedido: resultado.pedido }
    } catch (error) {
      console.error(error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido')
      return { ok: false }
    } finally {
      setEnviando(false)
    }
  }, [
    slug,
    itens,
    total,
    form,
    clienteLookup.cliente,
    resolveTelefoneApi,
    recotarPedido,
    cotacaoRef,
    telefoneDigitsRef,
    setClienteLookup,
    setForaCoberturaDialogAberto,
  ])

  return {
    meiosPagamento: meiosData?.meiosPagamento ?? [],
    loadingMeios,
    enviando,
    enviarPedido,
  }
}
