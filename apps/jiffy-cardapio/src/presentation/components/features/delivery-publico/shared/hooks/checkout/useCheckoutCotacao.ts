'use client'

import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { MutableRefObject } from 'react'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  formatarMensagemErroCotacaoPublica,
  isErroCoberturaEntregaPublica,
} from '@/src/application/errors/publicDeliveryErrors'
import { cotarPedidoPublicoUseCase } from '@/src/infrastructure/di/deliveryPublicoUseCases'
import {
  fingerprintItensCotacao,
  publicDeliveryCotacaoQueryKey,
  type CotacaoQueryCacheEntry,
} from '@/src/presentation/hooks/publicDeliveryCotacaoKeys'
import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryCarrinhoItem } from '../../stores/deliveryCarrinhoStore'
import {
  type DeliveryCheckoutCotacaoState,
  isTokenCotacaoExpirado,
  mapCotacaoDtoToCheckoutState,
} from '../../utils/deliveryCheckoutCotacaoUtils'
import type { RecotarPedidoResult } from './types'

type UseCheckoutCotacaoParams = {
  slug: string
  itens: DeliveryCarrinhoItem[]
  formRef: MutableRefObject<CheckoutFormData>
  clienteLookupRef: MutableRefObject<{ cliente: ClienteDeliveryPublicoDTO | null }>
  resolveTelefoneApi: (formData: CheckoutFormData) => string
  telefoneDigitsRef: MutableRefObject<string>
}

export function useCheckoutCotacao({
  slug,
  itens,
  formRef,
  clienteLookupRef,
  resolveTelefoneApi,
  telefoneDigitsRef,
}: UseCheckoutCotacaoParams) {
  const queryClient = useQueryClient()
  const [cotacao, setCotacao] = useState<DeliveryCheckoutCotacaoState | null>(null)
  const [cotacaoLoading, setCotacaoLoading] = useState(false)
  const [foraCoberturaDialogAberto, setForaCoberturaDialogAberto] = useState(false)

  const cotacaoSeqRef = useRef(0)
  const cotacaoRef = useRef(cotacao)
  cotacaoRef.current = cotacao
  const cotacaoAutoBloqueioRef = useRef<{ chaveFalha: string | null; rateLimitAte: number }>({
    chaveFalha: null,
    rateLimitAte: 0,
  })

  const limparCotacao = useCallback(() => {
    cotacaoSeqRef.current += 1
    cotacaoAutoBloqueioRef.current = { chaveFalha: null, rateLimitAte: 0 }
    setCotacao(null)
    setCotacaoLoading(false)
    void queryClient.removeQueries({
      queryKey: ['public-delivery', slug, 'cotacao'],
    })
  }, [queryClient, slug])

  const aplicarCotacaoAtualizada = useCallback(
    (dto: CotacaoPedidoPublicoDTO) => {
      const state = mapCotacaoDtoToCheckoutState(dto)
      setCotacao(state)
      const f = formRef.current
      const tel = resolveTelefoneApi(f)
      const queryKey = publicDeliveryCotacaoQueryKey({
        slug,
        tipoEntrega: f.tipoEntrega,
        enderecoIdEntrega:
          f.tipoEntrega === 'entrega' ? f.enderecoIdSelecionado.trim() : '',
        telefone: tel,
        fingerprintItens: fingerprintItensCotacao(itens),
      })
      queryClient.setQueryData<CotacaoQueryCacheEntry>(queryKey, { state })
    },
    [itens, queryClient, resolveTelefoneApi, slug, formRef]
  )

  const recotarPedido = useCallback(
    async (options?: {
      silencioso?: boolean
      chaveAuto?: string
    }): Promise<RecotarPedidoResult> => {
      const bloqueio = cotacaoAutoBloqueioRef.current
      if (Date.now() < bloqueio.rateLimitAte) {
        if (!options?.silencioso) {
          showToast.error(formatarMensagemErroCotacaoPublica(429))
        }
        return { ok: false, reason: 'rate_limit' }
      }

      if (options?.chaveAuto && bloqueio.chaveFalha === options.chaveAuto) {
        return { ok: false, reason: 'bloqueado' }
      }

      const f = formRef.current
      const tel = resolveTelefoneApi(f)
      telefoneDigitsRef.current = tel
      if (tel.length < 8) {
        if (!options?.silencioso) {
          showToast.error('Informe um telefone válido')
        }
        return { ok: false, reason: 'erro' }
      }
      if (itens.length === 0) {
        return { ok: false, reason: 'erro' }
      }

      const queryKey = publicDeliveryCotacaoQueryKey({
        slug,
        tipoEntrega: f.tipoEntrega,
        enderecoIdEntrega:
          f.tipoEntrega === 'entrega' ? f.enderecoIdSelecionado.trim() : '',
        telefone: tel,
        fingerprintItens: fingerprintItensCotacao(itens),
      })
      const cached = queryClient.getQueryData<CotacaoQueryCacheEntry>(queryKey)
      if (cached?.state && !isTokenCotacaoExpirado(cached.state.expiresAt)) {
        cotacaoSeqRef.current += 1
        setCotacao(cached.state)
        setCotacaoLoading(false)
        return { ok: true }
      }

      const nomeEfetivo =
        f.nome.trim() || clienteLookupRef.current.cliente?.nome?.trim() || null

      const seq = ++cotacaoSeqRef.current
      setCotacaoLoading(true)
      try {
        const resultado = await cotarPedidoPublicoUseCase.execute({
          slug,
          telefoneApi: tel,
          nomeEfetivo,
          itens,
          form: f,
          clienteLookup: clienteLookupRef.current.cliente,
        })

        if (seq !== cotacaoSeqRef.current) return { ok: false, reason: 'bloqueado' }

        if (!resultado.ok) {
          setCotacao(null)
          if (options?.chaveAuto) {
            const ate =
              resultado.httpStatus === 429
                ? Date.now() + 60_000
                : cotacaoAutoBloqueioRef.current.rateLimitAte
            cotacaoAutoBloqueioRef.current = {
              chaveFalha: options.chaveAuto,
              rateLimitAte: ate,
            }
          }

          if (isErroCoberturaEntregaPublica(resultado.error)) {
            setForaCoberturaDialogAberto(true)
            return { ok: false, reason: 'fora_cobertura' }
          }

          const exibirToast = !options?.silencioso || resultado.httpStatus === 429
          if (exibirToast) {
            showToast.error(resultado.error)
          }
          return {
            ok: false,
            reason: resultado.httpStatus === 429 ? 'rate_limit' : 'erro',
          }
        }

        if (options?.chaveAuto) {
          cotacaoAutoBloqueioRef.current = { chaveFalha: null, rateLimitAte: 0 }
        }
        const state = mapCotacaoDtoToCheckoutState(resultado.cotacao)
        setCotacao(state)
        queryClient.setQueryData<CotacaoQueryCacheEntry>(queryKey, { state })
        return { ok: true }
      } catch (error) {
        if (seq !== cotacaoSeqRef.current) return { ok: false, reason: 'bloqueado' }
        setCotacao(null)
        if (options?.chaveAuto) {
          cotacaoAutoBloqueioRef.current = {
            chaveFalha: options.chaveAuto,
            rateLimitAte: cotacaoAutoBloqueioRef.current.rateLimitAte,
          }
        }
        console.error(error)
        const msg = error instanceof Error ? error.message : 'Erro ao cotar pedido'
        if (isErroCoberturaEntregaPublica(msg)) {
          setForaCoberturaDialogAberto(true)
          return { ok: false, reason: 'fora_cobertura' }
        }
        if (!options?.silencioso) {
          showToast.error(msg)
        }
        return { ok: false, reason: 'erro' }
      } finally {
        if (seq === cotacaoSeqRef.current) {
          setCotacaoLoading(false)
        }
      }
    },
    [
      slug,
      itens,
      queryClient,
      resolveTelefoneApi,
      formRef,
      clienteLookupRef,
      telefoneDigitsRef,
    ]
  )

  return {
    cotacao,
    setCotacao,
    cotacaoLoading,
    setCotacaoLoading,
    cotacaoRef,
    cotacaoSeqRef,
    limparCotacao,
    recotarPedido,
    aplicarCotacaoAtualizada,
    foraCoberturaDialogAberto,
    fecharForaCoberturaDialog: () => setForaCoberturaDialogAberto(false),
    setForaCoberturaDialogAberto,
  }
}
