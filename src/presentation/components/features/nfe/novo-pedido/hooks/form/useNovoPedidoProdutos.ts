'use client'

import { useRef, useState, useCallback } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import type { ModalLancamentoProdutoPainelConfirmPayload, ModalLancamentoProdutoPainelModo } from '../../../ModalLancamentoProdutoPainel'
import type { ComplementoSelecionado, ProdutoSelecionado } from '../../types'
import { produtoPermiteAlterarPreco, obterUnidadeMedidaProdutoLinha } from '../../produtoCatalogoHelpers'
import {
  aplicarQuantidadeComplementoNaLinha,
  aplicarQuantidadeProdutoNaLinha,
  normalizarComplementosLinha,
} from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import { showToast } from '@/src/shared/utils/toast'

export interface UseNovoPedidoProdutosParams {
  produtos: ProdutoSelecionado[]
  setProdutos: React.Dispatch<React.SetStateAction<ProdutoSelecionado[]>>
  catalogoProdutosPorId: Record<string, Produto>
  setCatalogoProdutosPorId: React.Dispatch<React.SetStateAction<Record<string, Produto>>>
  produtosList: Produto[]
  carregarProdutoNoCatalogoSeNecessario: (
    produtoId: string,
    options?: { forceRefresh?: boolean }
  ) => Promise<Produto | null>
}

export function useNovoPedidoProdutos({
  produtos,
  setProdutos,
  catalogoProdutosPorId,
  setCatalogoProdutosPorId,
  produtosList,
  carregarProdutoNoCatalogoSeNecessario,
}: UseNovoPedidoProdutosParams) {
  const [valoresEmEdicao, setValoresEmEdicao] = useState<Record<string | number, string>>({})
  const [modalLancamentoProdutoPainelOpen, setModalLancamentoProdutoPainelOpen] = useState(false)
  const [produtoParaLancamentoPainel, setProdutoParaLancamentoPainel] = useState<Produto | null>(
    null
  )
  const [indiceLinhaPainelProduto, setIndiceLinhaPainelProduto] = useState<number | null>(null)
  const [painelLinhaModo, setPainelLinhaModo] =
    useState<ModalLancamentoProdutoPainelModo>('lancamento')
  const [carregandoComplementosPainel, setCarregandoComplementosPainel] = useState(false)

  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressIndexRef = useRef<number | null>(null)
  const longPressComplementoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressComplementoIndexRef = useRef<number | null>(null)

  const produtoTemComplementos = useCallback((produto: Produto): boolean => {
    const gruposComplementos = produto.getGruposComplementos()
    if (!gruposComplementos || gruposComplementos.length === 0) return false
    return gruposComplementos.some(grupo => grupo.complementos && grupo.complementos.length > 0)
  }, [])

  const garantirComplementosProdutoNoPainel = useCallback(
    (produtoId: string, produtoBase: Produto) => {
      if (!produtoBase.abreComplementosAtivo() || produtoTemComplementos(produtoBase)) {
        setCarregandoComplementosPainel(false)
        return
      }

      setCarregandoComplementosPainel(true)
      void carregarProdutoNoCatalogoSeNecessario(produtoId)
        .then(produtoAtualizado => {
          if (!produtoAtualizado) return
          setProdutoParaLancamentoPainel(prev =>
            prev?.getId() === produtoId ? produtoAtualizado : prev
          )
        })
        .finally(() => {
          setCarregandoComplementosPainel(false)
        })
    },
    [carregarProdutoNoCatalogoSeNecessario, produtoTemComplementos]
  )

  const adicionarProduto = useCallback(
    (produtoId: string) => {
      const produto =
        catalogoProdutosPorId[produtoId] ?? produtosList.find(p => p.getId() === produtoId)
      if (!produto) return

      if (!catalogoProdutosPorId[produtoId]) {
        setCatalogoProdutosPorId(prev => ({ ...prev, [produto.getId()]: produto }))
      }

      const mostrarAlterarPreco = produto.permiteAlterarPrecoAtivo()
      const abreComplementos = produto.abreComplementosAtivo()

      if (!mostrarAlterarPreco && !abreComplementos) {
        setProdutos(prev => [
          ...prev,
          {
            produtoId: produto.getId(),
            nome: produto.getNome(),
            quantidade: 1,
            valorUnitario: produto.getValor(),
            unidadeMedida: produto.getUnidadeMedida(),
            complementos: [],
          },
        ])
        return
      }

      setIndiceLinhaPainelProduto(null)
      setPainelLinhaModo('lancamento')
      setProdutoParaLancamentoPainel(produto)
      setModalLancamentoProdutoPainelOpen(true)
      garantirComplementosProdutoNoPainel(produtoId, produto)
    },
    [
      catalogoProdutosPorId,
      produtosList,
      garantirComplementosProdutoNoPainel,
      setCatalogoProdutosPorId,
      setProdutos,
    ]
  )

  const confirmarLancamentoProdutoPainel = useCallback(
    ({ valorUnitario, complementos, observacao }: ModalLancamentoProdutoPainelConfirmPayload) => {
      const produto = produtoParaLancamentoPainel
      if (!produto) return

      const idxLinha = indiceLinhaPainelProduto

      if (painelLinhaModo === 'observacao' && idxLinha !== null) {
        const trimmed = observacao?.trim()
        setProdutos(prev => {
          const novos = [...prev]
          const atual = novos[idxLinha]
          if (!atual) return prev
          novos[idxLinha] = {
            ...atual,
            observacao: trimmed || undefined,
          }
          return novos
        })
        return
      }

      const permiteAlterarPreco = produto.permiteAlterarPrecoAtivo()
      const valorUnitarioFinal = permiteAlterarPreco
        ? valorUnitario
        : idxLinha !== null
          ? (produtos[idxLinha]?.valorUnitario ?? produto.getValor())
          : produto.getValor()

      const complementosLinha: ComplementoSelecionado[] = complementos.map(c => {
        if (idxLinha !== null) {
          const atual = produtos[idxLinha]
          const antigo = atual?.complementos.find(x => x.grupoId === c.grupoId && x.id === c.id)
          return {
            id: c.id,
            grupoId: c.grupoId,
            nome: c.nome,
            valor: c.valor,
            quantidade: antigo?.quantidade ?? c.quantidade,
            tipoImpactoPreco: c.tipoImpactoPreco,
          }
        }
        return {
          id: c.id,
          grupoId: c.grupoId,
          nome: c.nome,
          valor: c.valor,
          quantidade: c.quantidade,
          tipoImpactoPreco: c.tipoImpactoPreco,
        }
      })

      const aplicarComplementos = (base: ProdutoSelecionado): ProdutoSelecionado => ({
        ...base,
        complementos: normalizarComplementosLinha(base, complementosLinha),
      })

      if (idxLinha !== null) {
        setProdutos(prev => {
          const novos = [...prev]
          const atual = novos[idxLinha]
          if (!atual) return prev
          novos[idxLinha] = aplicarComplementos({
            ...atual,
            valorUnitario: valorUnitarioFinal,
          })
          return novos
        })
      } else {
        setProdutos(prev => [
          ...prev,
          aplicarComplementos({
            produtoId: produto.getId(),
            nome: produto.getNome(),
            quantidade: 1,
            valorUnitario: valorUnitarioFinal,
            unidadeMedida: produto.getUnidadeMedida(),
            complementos: complementosLinha,
            tipoDesconto: null,
            valorDesconto: null,
            tipoAcrescimo: null,
            valorAcrescimo: null,
          }),
        ])
      }
      setCatalogoProdutosPorId(prev => ({ ...prev, [produto.getId()]: produto }))
    },
    [
      produtoParaLancamentoPainel,
      indiceLinhaPainelProduto,
      painelLinhaModo,
      produtos,
      setProdutos,
      setCatalogoProdutosPorId,
    ]
  )

  const abrirModalComplementosProdutoExistente = useCallback(
    (index: number) => {
      const produtoSelecionado = produtos[index]
      if (!produtoSelecionado) return

      const produtoCache =
        catalogoProdutosPorId[produtoSelecionado.produtoId] ??
        produtosList.find(p => p.getId() === produtoSelecionado.produtoId)
      if (!produtoCache) {
        setCarregandoComplementosPainel(true)
        void carregarProdutoNoCatalogoSeNecessario(produtoSelecionado.produtoId)
          .then(produto => {
            if (!produto) {
              setCarregandoComplementosPainel(false)
              return
            }
            setIndiceLinhaPainelProduto(index)
            setPainelLinhaModo('complementos')
            setProdutoParaLancamentoPainel(produto)
            setModalLancamentoProdutoPainelOpen(true)
            garantirComplementosProdutoNoPainel(produtoSelecionado.produtoId, produto)
          })
          .catch(() => {
            setCarregandoComplementosPainel(false)
          })
        return
      }

      setIndiceLinhaPainelProduto(index)
      setPainelLinhaModo('complementos')
      setProdutoParaLancamentoPainel(produtoCache)
      setModalLancamentoProdutoPainelOpen(true)
      garantirComplementosProdutoNoPainel(produtoSelecionado.produtoId, produtoCache)
    },
    [
      produtos,
      catalogoProdutosPorId,
      produtosList,
      carregarProdutoNoCatalogoSeNecessario,
      garantirComplementosProdutoNoPainel,
    ]
  )

  const abrirModalObservacaoProduto = useCallback(
    (index: number) => {
      const produtoSelecionado = produtos[index]
      if (!produtoSelecionado) return

      const abrirComProduto = (produto: Produto) => {
        setIndiceLinhaPainelProduto(index)
        setPainelLinhaModo('observacao')
        setProdutoParaLancamentoPainel(produto)
        setModalLancamentoProdutoPainelOpen(true)
      }

      const produtoCache =
        catalogoProdutosPorId[produtoSelecionado.produtoId] ??
        produtosList.find(p => p.getId() === produtoSelecionado.produtoId)
      if (produtoCache) {
        abrirComProduto(produtoCache)
        return
      }

      void carregarProdutoNoCatalogoSeNecessario(produtoSelecionado.produtoId).then(produto => {
        if (produto) abrirComProduto(produto)
      })
    },
    [
      produtos,
      catalogoProdutosPorId,
      produtosList,
      carregarProdutoNoCatalogoSeNecessario,
    ]
  )

  const removerProduto = useCallback(
    (index: number) => {
      setProdutos(prev => prev.filter((_, i) => i !== index))
    },
    [setProdutos]
  )

  const atualizarProduto = useCallback(
    (index: number, campo: keyof ProdutoSelecionado, valor: unknown) => {
      if (campo === 'valorUnitario') {
        const linha = produtos[index]
        if (!linha) return

        if (
          !produtoPermiteAlterarPreco(linha.produtoId, catalogoProdutosPorId, produtosList)
        ) {
          return
        }
      }

      setProdutos(prev => {
        const novosProdutos = [...prev]
        const linhaAtual = novosProdutos[index]
        if (!linhaAtual) return prev

        if (campo === 'quantidade') {
          const unidadeMedida = obterUnidadeMedidaProdutoLinha(
            linhaAtual,
            catalogoProdutosPorId,
            produtosList
          )
          novosProdutos[index] = aplicarQuantidadeProdutoNaLinha(
            { ...linhaAtual, unidadeMedida },
            Number(valor)
          )
          return novosProdutos
        }

        novosProdutos[index] = { ...linhaAtual, [campo]: valor }
        return novosProdutos
      })
    },
    [setProdutos, produtos, catalogoProdutosPorId, produtosList]
  )

  const atualizarComplemento = useCallback(
    (
      produtoIndex: number,
      complementoIndex: number,
      campo: keyof ComplementoSelecionado,
      valor: unknown
    ) => {
      setProdutos(prev => {
        const novosProdutos = [...prev]
        const linhaAtual = novosProdutos[produtoIndex]
        if (!linhaAtual) return prev

        if (campo === 'quantidade') {
          const resultado = aplicarQuantidadeComplementoNaLinha(
            linhaAtual,
            complementoIndex,
            Number(valor)
          )
          if (!resultado.aceito) {
            if (resultado.mensagem) showToast.error(resultado.mensagem)
            return prev
          }
          novosProdutos[produtoIndex] = resultado.produto
          return novosProdutos
        }

        const novosComplementos = [...linhaAtual.complementos]
        novosComplementos[complementoIndex] = {
          ...novosComplementos[complementoIndex],
          [campo]: valor,
        }
        novosProdutos[produtoIndex] = {
          ...linhaAtual,
          complementos: novosComplementos,
        }
        return novosProdutos
      })
    },
    [setProdutos]
  )

  const removerComplemento = useCallback(
    (produtoIndex: number, complementoIndex: number) => {
      setProdutos(prev => {
        const novosProdutos = [...prev]
        const novosComplementos = novosProdutos[produtoIndex].complementos.filter(
          (_, i) => i !== complementoIndex
        )
        novosProdutos[produtoIndex] = {
          ...novosProdutos[produtoIndex],
          complementos: novosComplementos,
        }
        return novosProdutos
      })
    },
    [setProdutos]
  )

  const limparLongPressTimeouts = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    longPressIndexRef.current = null
    if (longPressComplementoTimeoutRef.current) {
      clearTimeout(longPressComplementoTimeoutRef.current)
      longPressComplementoTimeoutRef.current = null
    }
    longPressComplementoIndexRef.current = null
  }, [])

  return {
    valoresEmEdicao,
    setValoresEmEdicao,
    modalLancamentoProdutoPainelOpen,
    setModalLancamentoProdutoPainelOpen,
    produtoParaLancamentoPainel,
    setProdutoParaLancamentoPainel,
    indiceLinhaPainelProduto,
    setIndiceLinhaPainelProduto,
    painelLinhaModo,
    setPainelLinhaModo,
    longPressTimeoutRef,
    longPressIndexRef,
    longPressComplementoTimeoutRef,
    longPressComplementoIndexRef,
    produtoTemComplementos,
    carregandoComplementosPainel,
    adicionarProduto,
    confirmarLancamentoProdutoPainel,
    abrirModalComplementosProdutoExistente,
    abrirModalObservacaoProduto,
    removerProduto,
    atualizarProduto,
    atualizarComplemento,
    removerComplemento,
    limparLongPressTimeouts,
  }
}
