'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MdClose } from 'react-icons/md'
import {
  flattenCatalogoGrupos,
  useAutoFetchCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryCarrinhoItemCard } from '../../shared/components/DeliveryCarrinhoItemCard'
import { DeliveryCarrinhoSwipeableItem } from '../../shared/components/DeliveryCarrinhoSwipeableItem'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { DELIVERY_MSG_CELULAR_COMPLETO } from '../../shared/constants/deliveryPublicoPlaceholders'
import { useDeliveryBodyScrollLock } from '../../shared/hooks/useDeliveryBodyScrollLock'
import { useDeliveryCheckout } from '../../shared/hooks/useDeliveryCheckout'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../shared/stores/deliveryCarrinhoStore'
import { findCatalogoProdutoById, findCatalogoGrupoIdByProdutoId } from '../../shared/utils/findCatalogoProdutoById'
import { itemSemComplemento } from '../../shared/utils/deliveryCarrinhoItemUtils'
import { formatEmpresaPublicaEndereco } from '../../shared/utils/formatEmpresaPublicaEndereco'
import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'
import { DeliveryPecaTambemCarousel } from '../../shared/components/DeliveryPecaTambemCarousel'
import { usePecaTambemSugestoes } from '@/src/presentation/hooks/usePecaTambemSugestoes'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { produtoTemComplementosAtivos } from '../../shared/utils/produtoComplementosUtils'
import { DeliveryCheckoutFooterActions } from '../components/checkout/DeliveryCheckoutFooterActions'
import { DeliveryCheckoutIdentifiqueSeModal } from '../components/checkout/DeliveryCheckoutIdentifiqueSeModal'
import { DeliveryCheckoutEnderecosModal } from '../components/checkout/DeliveryCheckoutEnderecosModal'
import { DeliveryCheckoutEnderecoFormModal } from '../components/checkout/DeliveryCheckoutEnderecoFormModal'
import { DeliveryCheckoutQuandoModal } from '../components/checkout/DeliveryCheckoutQuandoModal'
import type { ModoEntregaOpcao } from '../components/checkout/DeliveryCheckoutTipoEntregaOpcoes'
import { DeliveryCheckoutPagamentoModal } from '../components/checkout/DeliveryCheckoutPagamentoModal'
import { DeliveryCheckoutRevisaoModal } from '../components/checkout/DeliveryCheckoutRevisaoModal'
import { DeliveryCheckoutProgressProvider } from '../components/checkout/DeliveryCheckoutProgressContext'
import {
  DeliveryCheckoutShell,
  getCheckoutSlideDirection,
} from '../components/checkout/DeliveryCheckoutShell'
import {
  calculateDeliveryCheckoutProgress,
  isIdentificacaoCheckoutCompleta,
  type DeliveryCheckoutStep,
} from '../components/checkout/deliveryCheckoutProgress'

type DeliveryPublicoCarrinhoScreenProps = {
  slug: string
  /** Chamado após a animação de fechamento (overlay sobre a home). */
  onClose: () => void
}

export function DeliveryPublicoCarrinhoScreen({
  slug,
  onClose,
}: DeliveryPublicoCarrinhoScreenProps) {
  const atualizarQuantidade = useDeliveryCarrinhoStore(s => s.atualizarQuantidade)
  const removerItem = useDeliveryCarrinhoStore(s => s.removerItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const adicionarItem = useDeliveryCarrinhoStore(s => s.adicionarItem)
  const [itemEditando, setItemEditando] = useState<DeliveryCarrinhoItem | null>(null)
  const [produtoPecaTambem, setProdutoPecaTambem] =
    useState<CatalogoPublicoProdutoDTO | null>(null)
  const [produtoPecaTambemGrupoId, setProdutoPecaTambemGrupoId] = useState<
    string | null
  >(null)
  const [checkoutStep, setCheckoutStep] = useState<DeliveryCheckoutStep>(null)
  const [checkoutDirection, setCheckoutDirection] = useState<1 | -1>(1)
  const prevCheckoutStepRef = useRef<DeliveryCheckoutStep>(null)
  const [highestCheckoutPercentage, setHighestCheckoutPercentage] = useState(0)
  /** Quando true, concluir um step intermediário volta para a revisão. */
  const [voltarParaRevisao, setVoltarParaRevisao] = useState(false)
  /** Quando true, concluir endereço volta ao modal unificado (identificação + tipo). */
  const [voltarParaIdentificacao, setVoltarParaIdentificacao] = useState(false)
  const [aberto, setAberto] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set())

  const requestClose = () => setAberto(false)

  const requestRemoveItem = useCallback(
    (itemId: string) => {
      setRemovingIds(prev => {
        if (prev.has(itemId)) return prev
        return new Set(prev).add(itemId)
      })
      window.setTimeout(() => {
        removerItem(slug, itemId)
        setRemovingIds(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }, 380)
    },
    [removerItem, slug]
  )

  const {
    itens,
    total,
    form,
    updateForm,
    selecionarOpcaoEntrega,
    clienteLookup,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    consultarClientePorTelefone,
    confirmarNovoEndereco,
    meiosPagamento,
    loadingMeios,
    enviando,
    enviarPedido,
    salvarNomeCliente,
    limparIdentificacaoCliente,
    consultarTelefoneAtual,
  } = useDeliveryCheckout(slug)

  const quantidadeItens = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade, 0),
    [itens]
  )

  const itensVisiveis = useMemo(
    () => itens.filter(item => !removingIds.has(item.id)),
    [itens, removingIds]
  )

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  useAutoFetchCatalogoGrupos(catalogQuery)

  const empresa = catalogQuery.data?.pages[0]?.empresa ?? null
  const enderecoEmpresaTexto = formatEmpresaPublicaEndereco(empresa?.endereco ?? null)

  const grupos = useMemo(
    () => (catalogQuery.data?.pages ? flattenCatalogoGrupos(catalogQuery.data.pages) : []),
    [catalogQuery.data?.pages]
  )

  const produtoEdicao = useMemo(() => {
    if (!itemEditando) return null
    return findCatalogoProdutoById(grupos, itemEditando.produtoId)
  }, [itemEditando, grupos])

  const grupoIdsCarrinho = useMemo(() => {
    const ids: string[] = []
    const seen = new Set<string>()
    // Prioriza último item adicionado: ordena por adicionadoEm desc
    const ordenados = [...itens].sort((a, b) =>
      b.adicionadoEm.localeCompare(a.adicionadoEm)
    )
    for (const item of ordenados) {
      const grupoId =
        item.grupoId ?? findCatalogoGrupoIdByProdutoId(grupos, item.produtoId)
      if (!grupoId || seen.has(grupoId)) continue
      seen.add(grupoId)
      ids.push(grupoId)
    }
    return ids
  }, [itens, grupos])

  const produtoIdsNoCarrinho = useMemo(
    () => [...new Set(itens.map(i => i.produtoId))],
    [itens]
  )

  const pecaTambemQuery = usePecaTambemSugestoes(
    slug,
    grupoIdsCarrinho,
    produtoIdsNoCarrinho
  )

  const quantidadePorProduto = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of itens) {
      map[item.produtoId] = (map[item.produtoId] ?? 0) + item.quantidade
    }
    return map
  }, [itens])

  const pecaTambemById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof pecaTambemQuery.data>[number]>()
    for (const p of pecaTambemQuery.data ?? []) {
      map.set(p.id, p)
    }
    return map
  }, [pecaTambemQuery.data])

  const handlePecaTambemClick = useCallback(
    (produtoId: string) => {
      const fromSugestao = pecaTambemById.get(produtoId)
      const fromCatalogo = findCatalogoProdutoById(grupos, produtoId)
      const produto = fromCatalogo ?? fromSugestao ?? null
      if (!produto) return
      setProdutoPecaTambem(produto)
      setProdutoPecaTambemGrupoId(
        fromSugestao?.grupoIdOrigem ??
          findCatalogoGrupoIdByProdutoId(grupos, produtoId)
      )
    },
    [grupos, pecaTambemById]
  )

  const handlePecaTambemAddRapido = useCallback(
    (produtoId: string) => {
      const fromSugestao = pecaTambemById.get(produtoId)
      const fromCatalogo = findCatalogoProdutoById(grupos, produtoId)
      const produto = fromCatalogo ?? fromSugestao ?? null
      if (!produto) return

      if (produtoTemComplementosAtivos(produto)) {
        handlePecaTambemClick(produtoId)
        return
      }

      adicionarItem(slug, {
        produtoId: produto.id,
        grupoId:
          fromSugestao?.grupoIdOrigem ??
          findCatalogoGrupoIdByProdutoId(grupos, produto.id),
        produtoNome: produto.nome,
        produtoImagemUrl: produto.imagemUrl,
        quantidade: 1,
        valorUnitario: produto.valor,
        valorTotal: produto.valor,
        observacoes: [],
        complementos: [],
      })
      showToast.success(`${produto.nome} adicionado`)
    },
    [adicionarItem, grupos, handlePecaTambemClick, pecaTambemById, slug]
  )

  const enderecoClienteSelecionado = useMemo(() => {
    if (form.modoEndereco !== 'existente') return null
    const id = form.enderecoIdSelecionado.trim()
    if (!id) return null
    return clienteLookup.cliente?.enderecos.find(e => e.id === id) ?? null
  }, [form.modoEndereco, form.enderecoIdSelecionado, clienteLookup.cliente?.enderecos])

  const enderecoParaRevisao = form.tipoEntrega === 'entrega' ? enderecoClienteSelecionado : null

  const pagamentosRevisao = useMemo(
    () =>
      form.pagamentos.map(p => ({
        ...p,
        meio: meiosPagamento.find(m => m.id === p.meioPagamentoId) ?? null,
      })),
    [form.pagamentos, meiosPagamento]
  )

  const nomeClienteExibicao = form.nome.trim() || clienteLookup.cliente?.nome?.trim() || ''

  const identificacaoCompleta = useMemo(
    () =>
      isIdentificacaoCheckoutCompleta({
        lookupStatus: clienteLookup.status,
        nomeCadastro: clienteLookup.cliente?.nome ?? null,
        nomeDigitado: form.nome,
      }),
    [clienteLookup.status, clienteLookup.cliente?.nome, form.nome]
  )

  const currentCheckoutProgress = useMemo(
    () =>
      calculateDeliveryCheckoutProgress({
        checkoutStep,
        tipoEntrega: form.tipoEntrega,
        modoTempo: form.modoTempo,
        preserveCompleted: voltarParaRevisao,
        identificacaoCompleta,
      }),
    [
      checkoutStep,
      form.modoTempo,
      form.tipoEntrega,
      voltarParaRevisao,
      identificacaoCompleta,
    ]
  )

  useEffect(() => {
    if (!currentCheckoutProgress) return
    if (checkoutStep === 'telefone') {
      setHighestCheckoutPercentage(currentCheckoutProgress.percentage)
      return
    }
    setHighestCheckoutPercentage(current =>
      Math.max(current, currentCheckoutProgress.percentage)
    )
  }, [currentCheckoutProgress, checkoutStep])

  const checkoutProgress = useMemo(() => {
    if (!currentCheckoutProgress) return null

    const percentage =
      checkoutStep === 'telefone'
        ? currentCheckoutProgress.percentage
        : Math.max(currentCheckoutProgress.percentage, highestCheckoutPercentage)

    return {
      ...currentCheckoutProgress,
      percentage,
      label:
        percentage === 100
          ? 'Etapas do pedido concluídas'
          : `${percentage}% das etapas concluídas`,
    }
  }, [currentCheckoutProgress, highestCheckoutPercentage, checkoutStep])

  const goToCheckoutStep = useCallback((next: DeliveryCheckoutStep) => {
    setCheckoutDirection(getCheckoutSlideDirection(prevCheckoutStepRef.current, next))
    prevCheckoutStepRef.current = next
    setCheckoutStep(next)
  }, [])

  const fecharCheckout = () => {
    setHighestCheckoutPercentage(0)
    setVoltarParaRevisao(false)
    setVoltarParaIdentificacao(false)
    prevCheckoutStepRef.current = null
    setCheckoutStep(null)
  }

  const fecharOuRevisao = () => {
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    if (voltarParaIdentificacao) {
      goToCheckoutStep('telefone')
      return
    }
    fecharCheckout()
  }

  const voltarDoQuando = () => {
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    goToCheckoutStep('telefone')
  }

  const voltarDoPagamento = () => {
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    goToCheckoutStep(form.modoTempo === 'agendado' ? 'quando' : 'telefone')
  }

  const irParaProximoAposEndereco = () => {
    if (form.modoTempo === 'agendado' && !form.slotInicio.trim()) {
      goToCheckoutStep('quando')
      return
    }
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    goToCheckoutStep('pagamento')
  }

  const abrirStepDaRevisao = (step: DeliveryCheckoutStep) => {
    setVoltarParaRevisao(true)
    setVoltarParaIdentificacao(false)
    goToCheckoutStep(step)
  }

  useEffect(() => {
    if (!itemEditando) return
    if (produtoEdicao) return
    if (catalogQuery.isLoading || catalogQuery.isFetchingNextPage || catalogQuery.hasNextPage) {
      return
    }
    showToast.error('Produto não encontrado no cardápio')
    setItemEditando(null)
  }, [
    itemEditando,
    produtoEdicao,
    catalogQuery.isLoading,
    catalogQuery.isFetchingNextPage,
    catalogQuery.hasNextPage,
  ])

  const handleEnviarPedido = async () => {
    const enviado = await enviarPedido()
    if (!enviado) return
    fecharCheckout()
    requestClose()
  }

  const voltar = () => requestClose()
  const carregandoEdicao = Boolean(itemEditando) && !produtoEdicao
  useDeliveryBodyScrollLock(aberto)

  const handleSelecionarEndereco = (enderecoId: string) => {
    selecionarEnderecoExistente(enderecoId)
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    if (voltarParaIdentificacao) {
      setVoltarParaIdentificacao(false)
      goToCheckoutStep('telefone')
      return
    }
    irParaProximoAposEndereco()
  }

  const handleUsarNovoEndereco = () => {
    usarNovoEndereco()
    goToCheckoutStep('enderecoForm')
  }

  const handleContinuarCheckout = () => {
    setHighestCheckoutPercentage(0)
    setVoltarParaRevisao(false)
    setVoltarParaIdentificacao(false)
    prevCheckoutStepRef.current = null
    goToCheckoutStep('telefone')
  }

  const abrirFluxoEndereco = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      goToCheckoutStep('enderecos')
      return
    }
    usarNovoEndereco()
    goToCheckoutStep('enderecoForm')
  }

  const avancarAposIdentificacao = () => {
    if (form.tipoEntrega === 'entrega' && !enderecoClienteSelecionado) {
      setVoltarParaIdentificacao(false)
      setVoltarParaRevisao(false)
      abrirFluxoEndereco()
      return
    }
    if (form.modoTempo === 'agendado' && !form.slotInicio.trim()) {
      goToCheckoutStep('quando')
      return
    }
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    goToCheckoutStep('pagamento')
  }

  const handleQuandoContinuar = () => {
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    goToCheckoutStep('pagamento')
  }

  const handlePagamentoContinuar = () => {
    setVoltarParaRevisao(false)
    goToCheckoutStep('revisao')
  }

  const handleAlterarEndereco = (origem: 'identificacao' | 'revisao' = 'identificacao') => {
    if (origem === 'revisao') {
      setVoltarParaRevisao(true)
      setVoltarParaIdentificacao(false)
    } else {
      setVoltarParaIdentificacao(true)
      setVoltarParaRevisao(false)
    }
    abrirFluxoEndereco()
  }

  const handleChangeOpcaoEntrega = (opcao: ModoEntregaOpcao) => {
    selecionarOpcaoEntrega(opcao.tipoEntrega, opcao.modoTempo)
  }

  const handleTelefoneContinuar = async (digits: string) => {
    const { status } = await consultarClientePorTelefone(digits)
    if (status === 'invalido') {
      showToast.error(DELIVERY_MSG_CELULAR_COMPLETO)
      return
    }
    if (status === 'erro' || status === 'idle') {
      showToast.error(clienteLookup.mensagemErro || 'Erro ao consultar cadastro')
      return
    }

    avancarAposIdentificacao()
  }

  const handleConfirmarEnderecoForm = async () => {
    await confirmarNovoEndereco()
    showToast.success('Endereço salvo!')
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    if (voltarParaIdentificacao) {
      setVoltarParaIdentificacao(false)
      goToCheckoutStep('telefone')
      return
    }
    irParaProximoAposEndereco()
  }

  const handleCancelarEnderecoForm = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      goToCheckoutStep('enderecos')
      return
    }
    setVoltarParaIdentificacao(false)
    goToCheckoutStep('telefone')
  }

  return (
    <DeliveryCheckoutProgressProvider value={checkoutProgress}>
      <AnimatePresence onExitComplete={onClose}>
        {aberto ? (
          <motion.div
            key="delivery-carrinho-backdrop"
            className="delivery-vv-overlay z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={voltar}
            aria-hidden
          />
        ) : null}

        {aberto ? (
          <motion.aside
            key="delivery-carrinho"
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho"
            className="delivery-vv-panel z-50 flex flex-col shadow-2xl"
            style={{
              backgroundColor: 'var(--delivery-bg)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <header
              className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
              style={{
                backgroundColor: 'var(--delivery-surface)',
                borderColor: 'var(--delivery-border)',
              }}
            >
              <h1 className="delivery-font-title text-base font-semibold uppercase tracking-wide delivery-text-primary">
                Carrinho
              </h1>
              <button
                type="button"
                onClick={voltar}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ color: 'var(--delivery-text-primary)' }}
              >
                <MdClose className="h-5 w-5" />
              </button>
            </header>

            <div className="relative mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-3 pb-36 max-sm:scrollbar-hide sm:space-y-5 sm:p-4">
              {itens.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="delivery-text-muted">Carrinho vazio</p>
                  <DeliveryButton onClick={voltar} className="mt-4 px-6 py-2">
                    Ver cardápio
                  </DeliveryButton>
                </div>
              ) : (
                <>
                  <div className="overflow-x-hidden">
                    <AnimatePresence initial={false}>
                      {itensVisiveis.map(item => (
                        <DeliveryCarrinhoSwipeableItem
                          key={item.id}
                          itemId={item.id}
                          onSwipeRemove={() => requestRemoveItem(item.id)}
                        >
                          <DeliveryCarrinhoItemCard
                            item={item}
                            onDecrease={() =>
                              item.quantidade <= 1
                                ? requestRemoveItem(item.id)
                                : atualizarQuantidade(slug, item.id, item.quantidade - 1)
                            }
                            onIncrease={() =>
                              atualizarQuantidade(slug, item.id, item.quantidade + 1)
                            }
                            onRemove={() => requestRemoveItem(item.id)}
                            onEdit={() => setItemEditando(item)}
                            onRemoveComplemento={(complementoId, grupoComplementoId) =>
                              substituirItem(
                                slug,
                                item.id,
                                itemSemComplemento(item, complementoId, grupoComplementoId)
                              )
                            }
                          />
                        </DeliveryCarrinhoSwipeableItem>
                      ))}
                    </AnimatePresence>
                  </div>

                  {(pecaTambemQuery.data?.length ?? 0) > 0 ? (
                    <DeliveryPecaTambemCarousel
                      produtos={pecaTambemQuery.data ?? []}
                      quantidadePorProduto={quantidadePorProduto}
                      onProdutoClick={handlePecaTambemClick}
                      onProdutoAddRapido={handlePecaTambemAddRapido}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={voltar}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl text-sm font-semibold uppercase tracking-wide delivery-text-primary"
                    style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                  >
                    Adicionar mais produtos
                  </button>
                </>
              )}
            </div>

            {itens.length > 0 ? (
              <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-neutral-200 bg-white">
                <DeliveryCheckoutFooterActions
                  onVoltar={voltar}
                  onContinuar={handleContinuarCheckout}
                  top={
                    <p className="text-base leading-tight text-neutral-900 @sm:text-lg">
                      <span className="font-semibold">Total da compra:</span>{' '}
                      {formatDeliveryCurrency(total)}
                      <span className="text-neutral-400">
                        {' '}
                        / {quantidadeItens === 1 ? '1 item' : `${quantidadeItens} itens`}
                      </span>
                    </p>
                  }
                />
              </div>
            ) : null}

            {carregandoEdicao ? (
              <div className="absolute inset-0 z-50 flex overscroll-none items-center justify-center">
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: 'var(--delivery-overlay)' }}
                  onClick={() => setItemEditando(null)}
                  aria-hidden
                />
                <div
                  className="h-10 w-10 animate-spin rounded-full border-b-2"
                  style={{ borderColor: 'var(--delivery-primary)' }}
                />
              </div>
            ) : null}

            {itemEditando && produtoEdicao ? (
              <DeliveryProdutoModal
                key={itemEditando.id}
                slug={slug}
                produto={produtoEdicao}
                grupoId={
                  itemEditando.grupoId ??
                  findCatalogoGrupoIdByProdutoId(grupos, itemEditando.produtoId)
                }
                itemEdicao={itemEditando}
                onClose={() => setItemEditando(null)}
              />
            ) : null}

            {produtoPecaTambem && !itemEditando ? (
              <DeliveryProdutoModal
                key={`peca-tambem-${produtoPecaTambem.id}`}
                slug={slug}
                produto={produtoPecaTambem}
                grupoId={produtoPecaTambemGrupoId}
                onClose={() => {
                  setProdutoPecaTambem(null)
                  setProdutoPecaTambemGrupoId(null)
                }}
              />
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <DeliveryCheckoutShell
        open={checkoutStep != null}
        stepKey={checkoutStep ?? 'telefone'}
        direction={checkoutDirection}
        onClose={checkoutStep === 'revisao' ? fecharCheckout : fecharOuRevisao}
      >
        {checkoutStep === 'telefone' ? (
          <DeliveryCheckoutIdentifiqueSeModal
            slug={slug}
            telefone={form.telefone}
            telefonePaisIso2={form.telefonePaisIso2}
            nome={form.nome}
            nomeCadastro={clienteLookup.cliente?.nome ?? null}
            telefoneConfirmadoDigits={
              clienteLookup.status === 'encontrado' ||
              clienteLookup.status === 'nao_encontrado'
                ? clienteLookup.telefoneConsultado
                : null
            }
            lookupStatus={clienteLookup.status}
            tipoEntrega={form.tipoEntrega}
            modoTempo={form.modoTempo}
            enderecoCliente={enderecoClienteSelecionado}
            temEnderecosCadastrados={(clienteLookup.cliente?.enderecos?.length ?? 0) > 0}
            enderecoEmpresaTexto={enderecoEmpresaTexto}
            onChangeTelefone={value => updateForm('telefone', value)}
            onChangeTelefonePais={iso2 => updateForm('telefonePaisIso2', iso2)}
            onConsultarTelefone={consultarTelefoneAtual}
            onChangeNome={value => updateForm('nome', value)}
            onChangeOpcaoEntrega={handleChangeOpcaoEntrega}
            onEditarEndereco={() => handleAlterarEndereco('identificacao')}
            onCadastrarEndereco={() => handleAlterarEndereco('identificacao')}
            onSalvarNome={salvarNomeCliente}
            onLimparIdentificacao={limparIdentificacaoCliente}
            onClose={fecharOuRevisao}
            onContinuar={handleTelefoneContinuar}
          />
        ) : null}

        {checkoutStep === 'enderecos' ? (
          <DeliveryCheckoutEnderecosModal
            enderecos={clienteLookup.cliente?.enderecos ?? []}
            enderecoIdSelecionado={form.enderecoIdSelecionado}
            onClose={fecharOuRevisao}
            onSelecionar={handleSelecionarEndereco}
            onUsarNovoEndereco={handleUsarNovoEndereco}
          />
        ) : null}

        {checkoutStep === 'enderecoForm' ? (
          <DeliveryCheckoutEnderecoFormModal
            form={form}
            onChange={updateForm}
            onClose={fecharOuRevisao}
            onCancelar={handleCancelarEnderecoForm}
            onConfirmar={handleConfirmarEnderecoForm}
          />
        ) : null}

        {checkoutStep === 'quando' ? (
          <DeliveryCheckoutQuandoModal
            slug={slug}
            tipoEntrega={form.tipoEntrega}
            slotInicio={form.slotInicio}
            slotLabel={form.slotLabel}
            onChangeSlot={slot => {
              updateForm('slotInicio', slot?.inicio ?? '')
              updateForm('slotFim', slot?.fim ?? '')
              updateForm('slotLabel', slot?.label ?? '')
            }}
            onClose={fecharOuRevisao}
            onVoltar={voltarDoQuando}
            onContinuar={handleQuandoContinuar}
          />
        ) : null}

        {checkoutStep === 'pagamento' ? (
          <DeliveryCheckoutPagamentoModal
            total={total}
            meiosPagamento={meiosPagamento}
            loadingMeios={loadingMeios}
            pagamentos={form.pagamentos}
            onChangePagamentos={value => updateForm('pagamentos', value)}
            onClose={fecharOuRevisao}
            onVoltar={voltarDoPagamento}
            onContinuar={handlePagamentoContinuar}
          />
        ) : null}

        {checkoutStep === 'revisao' ? (
          <DeliveryCheckoutRevisaoModal
            tipoEntrega={form.tipoEntrega}
            nome={nomeClienteExibicao}
            telefone={form.telefone}
            telefonePaisIso2={form.telefonePaisIso2}
            enderecoCliente={enderecoParaRevisao}
            enderecoEmpresaTexto={enderecoEmpresaTexto}
            itens={itens}
            total={total}
            pagamentos={pagamentosRevisao}
            observacaoPedido={form.observacaoPedido}
            modoTempo={form.modoTempo}
            slotInicio={form.slotInicio}
            slotLabel={form.slotLabel}
            cpfNotaFiscal={form.cpfNotaFiscal}
            enviando={enviando}
            onClose={fecharCheckout}
            onVoltar={() => {
              setVoltarParaRevisao(false)
              goToCheckoutStep('pagamento')
            }}
            onEditarTipoEntrega={() => abrirStepDaRevisao('telefone')}
            onEditarCliente={() => abrirStepDaRevisao('telefone')}
            onEditarEndereco={() => handleAlterarEndereco('revisao')}
            onEditarPedido={() => {
              setVoltarParaRevisao(false)
              setVoltarParaIdentificacao(false)
              fecharCheckout()
            }}
            onEditarQuando={() =>
              abrirStepDaRevisao(form.modoTempo === 'agendado' ? 'quando' : 'telefone')
            }
            onEditarPagamento={() => abrirStepDaRevisao('pagamento')}
            onChangeObservacaoPedido={value => updateForm('observacaoPedido', value)}
            onChangeCpfNotaFiscal={value => updateForm('cpfNotaFiscal', value)}
            onEnviar={() => void handleEnviarPedido()}
          />
        ) : null}
      </DeliveryCheckoutShell>
    </DeliveryCheckoutProgressProvider>
  )
}
