'use client'

import { useCallback, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { brToEUA } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import {
  calcularNovoValorProdutoLote,
  validarAjustePrecoLote,
  type AjustePrecoDirecao,
  type AjustePrecoModo,
} from '../rules/precoLote.rules'
import {
  bulkUpdateProdutosLote,
  type BulkUpdateProdutoPayloadItem,
} from '../utils/produtosLoteMutations'

export interface UsePrecoLoteParams {
  produtos: Produto[]
  produtosSelecionados: Set<string>
  limparSelecaoProdutos: () => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'precos') => void
  buscarProdutos: () => Promise<unknown>
}

export function usePrecoLote({
  produtos,
  produtosSelecionados,
  limparSelecaoProdutos,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UsePrecoLoteParams) {
  const [adjustMode, setAdjustMode] = useState<AjustePrecoModo>('valor')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState<AjustePrecoDirecao>('increase')
  const [isUpdating, setIsUpdating] = useState(false)

  const bulkMutation = useSecureTenantMutation(
    async ({ token }, payload: BulkUpdateProdutoPayloadItem[]) =>
      bulkUpdateProdutosLote(token, payload)
  )

  const limparFormulario = useCallback(() => {
    setAdjustAmount('')
  }, [])

  const atualizarPrecos = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    const parsedAdjust = brToEUA(adjustAmount)
    const produtosSelecionadosDados = produtos.filter(produto =>
      produtosSelecionados.has(produto.getId())
    )

    const erroValidacao = validarAjustePrecoLote({
      parsedAdjust,
      adjustMode,
      adjustDirection,
      produtosSelecionados: produtosSelecionadosDados,
    })
    if (erroValidacao) {
      showToast.error(erroValidacao)
      return
    }

    const adjustValue = parsedAdjust

    setIsUpdating(true)
    showToast.loading('Atualizando preços...')

    try {
      const payload = produtosSelecionadosDados.map(produto => {
        const valorAtual = produto.getValor()
        const novoValor = calcularNovoValorProdutoLote(
          valorAtual,
          adjustMode,
          adjustDirection,
          adjustValue
        )

        if (novoValor <= 0) {
          throw new Error(`Valor calculado inválido para produto ${produto.getNome()}`)
        }

        return {
          produtoId: produto.getId(),
          valor: novoValor,
        }
      })

      await bulkMutation.mutateAsync(payload)

      marcarProdutosAlteradosNaSessao(
        payload.map(p => p.produtoId),
        'precos'
      )

      await new Promise(resolve => setTimeout(resolve, 800))
      await buscarProdutos()
      await new Promise(resolve => setTimeout(resolve, 500))

      showToast.success(`Preços atualizados com sucesso! (${payload.length} produtos)`)
      limparSelecaoProdutos()
      limparFormulario()
    } catch (error: unknown) {
      console.error('Erro ao atualizar preços', error)
      const message = error instanceof Error ? error.message : 'Erro ao atualizar preços'
      showToast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [
    adjustAmount,
    adjustDirection,
    adjustMode,
    bulkMutation,
    buscarProdutos,
    limparFormulario,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    produtos,
    produtosSelecionados,
  ])

  return {
    adjustMode,
    setAdjustMode,
    adjustAmount,
    setAdjustAmount,
    adjustDirection,
    setAdjustDirection,
    isUpdating,
    atualizarPrecos,
    limparFormulario,
  }
}
