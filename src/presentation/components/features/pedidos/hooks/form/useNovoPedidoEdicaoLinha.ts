'use client'

import { useState, useCallback } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import { formatarNumeroComMilhar } from '@/src/domain/services/pedido/CalculadoraPedido'
import { aplicarQuantidadeProdutoNaLinha } from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import type { ProdutoSelecionado } from '../../types'
import { obterUnidadeMedidaProdutoLinha } from '../../produtoCatalogoHelpers'
import type { UnidadeMedidaProduto } from '@/src/shared/types/unidadeMedidaProduto'

export interface UseNovoPedidoEdicaoLinhaParams {
  produtos: ProdutoSelecionado[]
  setProdutos: React.Dispatch<React.SetStateAction<ProdutoSelecionado[]>>
  catalogoProdutosPorId: Record<string, Produto>
  produtosList: Produto[]
  carregarProdutoNoCatalogoSeNecessario: (
    produtoId: string,
    options?: { forceRefresh?: boolean }
  ) => Promise<Produto | null>
}

export function useNovoPedidoEdicaoLinha({
  produtos,
  setProdutos,
  catalogoProdutosPorId,
  produtosList,
  carregarProdutoNoCatalogoSeNecessario,
}: UseNovoPedidoEdicaoLinhaParams) {
  const [modalEdicaoProdutoOpen, setModalEdicaoProdutoOpen] = useState(false)
  const [produtoIndexEdicao, setProdutoIndexEdicao] = useState<number | null>(null)
  const [quantidadeEdicao, setQuantidadeEdicao] = useState<number>(1)
  const [unidadeMedidaEdicao, setUnidadeMedidaEdicao] = useState<UnidadeMedidaProduto>('UN')
  const [ehAcrescimo, setEhAcrescimo] = useState(false)
  const [ehPorcentagem, setEhPorcentagem] = useState(false)
  const [valorDescontoAcrescimo, setValorDescontoAcrescimo] = useState<string>('0')
  const [valorUnitarioEdicaoPainel, setValorUnitarioEdicaoPainel] = useState<string>('')

  const abrirModalEdicaoProduto = useCallback(
    async (index: number) => {
      const produto = produtos[index]
      const produtoEntity = await carregarProdutoNoCatalogoSeNecessario(produto.produtoId)
      if (!produtoEntity) {
        showToast.error('Não foi possível obter os dados do produto para edição.')
        return
      }

      setProdutoIndexEdicao(index)
      const unidadeMedida = obterUnidadeMedidaProdutoLinha(
        produto,
        catalogoProdutosPorId,
        produtosList
      )
      setQuantidadeEdicao(produto.quantidade)
      setUnidadeMedidaEdicao(unidadeMedida)

      if (produto.tipoDesconto && produto.valorDesconto) {
        setEhAcrescimo(false)
        setEhPorcentagem(produto.tipoDesconto === 'porcentagem')
        setValorDescontoAcrescimo(
          produto.tipoDesconto === 'porcentagem'
            ? produto.valorDesconto.toString()
            : formatarNumeroComMilhar(produto.valorDesconto)
        )
      } else if (produto.tipoAcrescimo && produto.valorAcrescimo) {
        setEhAcrescimo(true)
        setEhPorcentagem(produto.tipoAcrescimo === 'porcentagem')
        setValorDescontoAcrescimo(
          produto.tipoAcrescimo === 'porcentagem'
            ? produto.valorAcrescimo.toString()
            : formatarNumeroComMilhar(produto.valorAcrescimo)
        )
      } else {
        setEhAcrescimo(false)
        setEhPorcentagem(false)
        setValorDescontoAcrescimo('0')
      }

      setValorUnitarioEdicaoPainel(
        produto.valorUnitario > 0 ? formatarNumeroComMilhar(produto.valorUnitario) : ''
      )

      setModalEdicaoProdutoOpen(true)
    },
    [produtos, carregarProdutoNoCatalogoSeNecessario]
  )

  const confirmarEdicaoProduto = useCallback(() => {
    if (produtoIndexEdicao === null) return

    const novosProdutos = [...produtos]
    const produtoAtual = novosProdutos[produtoIndexEdicao]

    const produtoEntity =
      catalogoProdutosPorId[produtoAtual.produtoId] ??
      produtosList.find(p => p.getId() === produtoAtual.produtoId)
    const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
    const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false
    const permiteAlterarPreco = produtoEntity?.permiteAlterarPrecoAtivo() ?? false

    let novoValorUnitario = produtoAtual.valorUnitario
    if (permiteAlterarPreco) {
      const limpo = valorUnitarioEdicaoPainel.replace(/\./g, '').replace(',', '.').trim()
      const v = parseFloat(limpo)
      if (valorUnitarioEdicaoPainel.trim() === '' || !Number.isFinite(v) || v <= 0) {
        showToast.error('Informe um valor unitário válido (maior que zero).')
        return
      }
      novoValorUnitario = v
    }

    let valorNum: number | null = null
    const valorDigitado = valorDescontoAcrescimo && valorDescontoAcrescimo !== '0'
    const podeAplicarDesconto = !ehAcrescimo && permiteDesconto && valorDigitado
    const podeAplicarAcrescimo = ehAcrescimo && permiteAcrescimo && valorDigitado

    if (podeAplicarDesconto || podeAplicarAcrescimo) {
      if (ehPorcentagem) {
        valorNum = parseFloat(valorDescontoAcrescimo) || 0
      } else {
        valorNum =
          parseFloat(valorDescontoAcrescimo.replace(/\./g, '').replace(',', '.')) || 0
      }
    }

    novosProdutos[produtoIndexEdicao] = aplicarQuantidadeProdutoNaLinha(
      {
        ...produtoAtual,
        unidadeMedida:
          produtoAtual.unidadeMedida ??
          produtoEntity?.getUnidadeMedida() ??
          unidadeMedidaEdicao,
        valorUnitario: novoValorUnitario,
        tipoDesconto: podeAplicarDesconto ? (ehPorcentagem ? 'porcentagem' : 'fixo') : null,
        valorDesconto: podeAplicarDesconto ? valorNum : null,
        tipoAcrescimo: podeAplicarAcrescimo ? (ehPorcentagem ? 'porcentagem' : 'fixo') : null,
        valorAcrescimo: podeAplicarAcrescimo ? valorNum : null,
      },
      quantidadeEdicao
    )

    setProdutos(novosProdutos)
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
    setValorUnitarioEdicaoPainel('')
  }, [
    produtoIndexEdicao,
    produtos,
    catalogoProdutosPorId,
    produtosList,
    valorUnitarioEdicaoPainel,
    valorDescontoAcrescimo,
    ehAcrescimo,
    ehPorcentagem,
    quantidadeEdicao,
    unidadeMedidaEdicao,
    setProdutos,
  ])

  const resetEdicaoLinha = useCallback(() => {
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
    setQuantidadeEdicao(1)
    setUnidadeMedidaEdicao('UN')
    setEhAcrescimo(false)
    setEhPorcentagem(false)
    setValorDescontoAcrescimo('0')
    setValorUnitarioEdicaoPainel('')
  }, [])

  return {
    modalEdicaoProdutoOpen,
    setModalEdicaoProdutoOpen,
    produtoIndexEdicao,
    setProdutoIndexEdicao,
    quantidadeEdicao,
    setQuantidadeEdicao,
    unidadeMedidaEdicao,
    setUnidadeMedidaEdicao,
    ehAcrescimo,
    setEhAcrescimo,
    ehPorcentagem,
    setEhPorcentagem,
    valorDescontoAcrescimo,
    setValorDescontoAcrescimo,
    valorUnitarioEdicaoPainel,
    setValorUnitarioEdicaoPainel,
    abrirModalEdicaoProduto,
    confirmarEdicaoProduto,
    resetEdicaoLinha,
  }
}
