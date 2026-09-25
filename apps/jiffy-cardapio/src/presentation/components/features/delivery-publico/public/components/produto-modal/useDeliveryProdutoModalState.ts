'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { calcularTotalProduto } from '@/src/domain/services/pedido/CalculadoraPedido'
import { sincronizarComplementosQuantidadeProduto } from '@/src/domain/policies/pedido/SincronizarComplementosQuantidadeProduto'
import { itemCarrinhoParaProdutoSelecionado } from '@/src/application/mappers/CarrinhoDeliveryMapper'
import { showToast } from '@/src/shared/utils/toast'
import { useProdutoComplementos } from '../../../shared/hooks/useProdutoComplementos'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../../shared/stores/deliveryCarrinhoStore'
import {
  buildProdutoShareUrl,
  compartilharLinkDelivery,
} from '../../../shared/utils/compartilharProdutoDelivery'
import { getProdutoImageSourceRect } from '../../../shared/utils/getProdutoImageSourceRect'
import type { FlySourceRect } from '../../../shared/components/FlyingProduct'
import { observacaoItemCarrinho } from '../../../shared/utils/deliveryCarrinhoItemUtils'
import type { GrupoComplementoPendente } from '../../../shared/utils/produtoComplementosUtils'

export type DeliveryProdutoModalProps = {
  slug: string
  produto: CatalogoPublicoProdutoDTO
  onClose: () => void
  /** Chamado após adicionar item novo (não edição). */
  onAdicionado?: (payload: {
    produtoId: string
    nome: string
    imagemUrl: string | null
    sourceRect?: FlySourceRect | null
  }) => void
  /** Quando informado, atualiza o item do carrinho em vez de adicionar um novo. */
  itemEdicao?: DeliveryCarrinhoItem
}

export function useDeliveryProdutoModalState({
  slug,
  produto,
  onClose,
  onAdicionado,
  itemEdicao,
}: DeliveryProdutoModalProps) {
  const adicionarItem = useDeliveryCarrinhoStore(s => s.adicionarItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const isEdicao = Boolean(itemEdicao)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bannerComplementosRef = useRef<HTMLDivElement>(null)
  const [alturaPrimeiraDobra, setAlturaPrimeiraDobra] = useState<number | null>(null)

  const [quantidade, setQuantidade] = useState(itemEdicao?.quantidade ?? 1)
  const [observacao, setObservacao] = useState(
    itemEdicao ? observacaoItemCarrinho(itemEdicao) : ''
  )
  const [salvando, setSalvando] = useState(false)
  const [gruposPendentesAlerta, setGruposPendentesAlerta] = useState<GrupoComplementoPendente[]>(
    []
  )
  const [aberto, setAberto] = useState(true)
  /** Evita fechar no click sintético / remount (Strict Mode) logo após abrir. */
  const fechamentoIntencionalRef = useRef(false)
  const [podeFecharPorOverlay, setPodeFecharPorOverlay] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setPodeFecharPorOverlay(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  const requestClose = () => {
    fechamentoIntencionalRef.current = true
    setAberto(false)
  }

  const handleExitComplete = () => {
    if (fechamentoIntencionalRef.current) onClose()
  }

  const handleOverlayClick = () => {
    if (!podeFecharPorOverlay) return
    requestClose()
  }

  const complementosIniciaisModal = (itemEdicao?.complementos ?? []).map(c => {
    const qtdProd = Math.max(1, Math.floor(itemEdicao?.quantidade ?? 1))
    const qtdComp = Math.max(1, Math.floor(c.quantidade))
    const quantidadePorUnidade = qtdProd > 1 && qtdComp === qtdProd ? 1 : qtdComp
    return { ...c, quantidade: quantidadePorUnidade }
  })

  const {
    grupos,
    precisaComplementos,
    carregandoComplementos,
    cacheComplementos,
    complementosSelecionados,
    valorComplementosUnitario,
    ajustarQuantidadeComplemento,
    getQuantidadeComplemento,
    obterGruposPendentes,
  } = useProdutoComplementos(slug, produto, complementosIniciaisModal)

  const complementosParaLinha = sincronizarComplementosQuantidadeProduto(
    complementosSelecionados,
    quantidade
  )
  const valorUnitario = produto.valor
  const valorTotal = calcularTotalProduto(
    itemCarrinhoParaProdutoSelecionado(
      {
        produtoId: produto.id,
        produtoNome: produto.nome,
        quantidade,
        valorUnitario,
        observacoes: [],
        complementos: complementosParaLinha,
      },
      { quantidade, valorUnitario }
    )
  )
  const painelAmplo = precisaComplementos
  const carregandoOpcoes =
    precisaComplementos && carregandoComplementos && !cacheComplementos

  useLayoutEffect(() => {
    if (painelAmplo) {
      setAlturaPrimeiraDobra(null)
      return
    }

    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const atualizarAltura = () => {
      const bannerH = bannerComplementosRef.current?.offsetHeight ?? 0
      setAlturaPrimeiraDobra(Math.max(0, scrollEl.clientHeight - bannerH))
    }

    atualizarAltura()
    const observer = new ResizeObserver(atualizarAltura)
    observer.observe(scrollEl)
    if (bannerComplementosRef.current) {
      observer.observe(bannerComplementosRef.current)
    }
    return () => observer.disconnect()
  }, [painelAmplo, precisaComplementos, produto.nome])

  const handleIrParaComplementos = () => {
    bannerComplementosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCompartilhar = () => {
    void compartilharLinkDelivery({
      title: produto.nome,
      text: `Confira ${produto.nome}`,
      url: buildProdutoShareUrl(slug, produto.id),
    })
  }

  const handleConfirmarAlertaComplementos = () => {
    setGruposPendentesAlerta([])
    handleIrParaComplementos()
  }

  const handleSalvar = () => {
    if (precisaComplementos && !cacheComplementos) {
      showToast.error('Aguarde o carregamento das opções do produto')
      return
    }
    if (grupos.length > 0) {
      const pendentes = obterGruposPendentes()
      if (pendentes.length > 0) {
        setGruposPendentesAlerta(pendentes)
        return
      }
    }

    setSalvando(true)
    try {
      const observacoes = observacao.trim().length >= 3 ? [observacao.trim()] : []
      const payload = {
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoImagemUrl: produto.imagemUrl,
        quantidade,
        valorUnitario,
        valorTotal,
        observacoes,
        complementos: complementosParaLinha,
      }

      if (itemEdicao) {
        substituirItem(slug, itemEdicao.id, payload)
        showToast.success('Item atualizado!')
        requestClose()
      } else {
        adicionarItem(slug, payload)
        onAdicionado?.({
          produtoId: produto.id,
          nome: produto.nome,
          imagemUrl: produto.imagemUrl,
          sourceRect: getProdutoImageSourceRect(produto.id),
        })
        requestClose()
      }
    } finally {
      setSalvando(false)
    }
  }

  return {
    produto,
    isEdicao,
    scrollRef,
    bannerComplementosRef,
    alturaPrimeiraDobra,
    quantidade,
    setQuantidade,
    observacao,
    setObservacao,
    salvando,
    gruposPendentesAlerta,
    aberto,
    requestClose,
    handleExitComplete,
    handleOverlayClick,
    grupos,
    precisaComplementos,
    valorComplementosUnitario,
    ajustarQuantidadeComplemento,
    getQuantidadeComplemento,
    valorTotal,
    painelAmplo,
    carregandoOpcoes,
    handleIrParaComplementos,
    handleCompartilhar,
    handleConfirmarAlertaComplementos,
    handleSalvar,
  }
}

export type DeliveryProdutoModalState = ReturnType<typeof useDeliveryProdutoModalState>
