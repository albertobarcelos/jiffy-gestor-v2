'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { MdClose } from 'react-icons/md'
import {
  flattenCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import { clienteAtingiuMaxEnderecosDelivery } from '@/src/shared/constants/deliveryClienteEnderecos'
import { DeliveryCarrinhoItemCard } from '../../shared/components/DeliveryCarrinhoItemCard'
import { DeliveryCarrinhoSwipeableItem } from '../../shared/components/DeliveryCarrinhoSwipeableItem'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { DELIVERY_MSG_CELULAR_COMPLETO } from '../../shared/constants/deliveryPublicoPlaceholders'
import { useDeliveryBodyScrollLock } from '../../shared/hooks/useDeliveryBodyScrollLock'
import { useDeliveryCheckout } from '../../shared/hooks/useDeliveryCheckout'
import { useDeliveryCheckoutFlow } from '../../shared/hooks/useDeliveryCheckoutFlow'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../shared/stores/deliveryCarrinhoStore'
import {
  mapPedidoPublicoCriadoParaConfirmado,
  type PedidoPublicoConfirmadoSnapshot,
} from '@/src/application/mappers/PedidoPublicoConfirmadoMapper'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '@/src/shared/constants/deliveryPaisesTelefone'
import { findCatalogoProdutoById } from '../../shared/utils/findCatalogoProdutoById'
import { itemSemComplemento } from '../../shared/utils/deliveryCarrinhoItemUtils'
import { formatEmpresaPublicaEndereco } from '../../shared/utils/formatEmpresaPublicaEndereco'
import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'
import { isTokenCotacaoExpirado } from '../../shared/utils/deliveryCheckoutCotacaoUtils'
import { useLocalizacaoEmpresaPublica } from '../../shared/hooks/useLocalizacaoEmpresaPublica'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'
import { DeliveryCheckoutFooterActions } from '../components/checkout/DeliveryCheckoutFooterActions'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { enderecoTemGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoDelivery'
import { fingerprintItensCotacao } from '@/src/presentation/hooks/publicDeliveryCotacaoKeys'
import type { ModoEntregaOpcao } from '../components/checkout/DeliveryCheckoutTipoEntregaOpcoes'
import { DeliveryCheckoutProgressProvider } from '../components/checkout/DeliveryCheckoutProgressContext'
import { DeliveryCheckoutShell } from '../components/checkout/DeliveryCheckoutShell'
import type { DeliveryCheckoutStep } from '../components/checkout/deliveryCheckoutProgress'

/** Placeholder leve enquanto o chunk do modal carrega (P4.1). */
function CheckoutModalChunkFallback() {
  return (
    <div
      className="min-h-[240px] w-full animate-pulse rounded-2xl bg-neutral-100"
      aria-hidden
    />
  )
}

const DeliveryCheckoutIdentifiqueSeModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutIdentifiqueSeModal').then(m => ({
      default: m.DeliveryCheckoutIdentifiqueSeModal,
    })),
  { loading: CheckoutModalChunkFallback }
)

const DeliveryCheckoutEnderecosModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutEnderecosModal').then(m => ({
      default: m.DeliveryCheckoutEnderecosModal,
    })),
  { loading: CheckoutModalChunkFallback }
)

const DeliveryCheckoutEnderecoFormModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutEnderecoFormModal').then(m => ({
      default: m.DeliveryCheckoutEnderecoFormModal,
    })),
  { loading: CheckoutModalChunkFallback }
)

const DeliveryCheckoutEnderecoGeoModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutEnderecoGeoModal').then(m => ({
      default: m.DeliveryCheckoutEnderecoGeoModal,
    })),
  { ssr: false, loading: CheckoutModalChunkFallback }
)

const DeliveryCheckoutPagamentoModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutPagamentoModal').then(m => ({
      default: m.DeliveryCheckoutPagamentoModal,
    })),
  { loading: CheckoutModalChunkFallback }
)

const DeliveryCheckoutRevisaoModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutRevisaoModal').then(m => ({
      default: m.DeliveryCheckoutRevisaoModal,
    })),
  { loading: CheckoutModalChunkFallback }
)

const DeliveryCheckoutSucessoModal = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutSucessoModal').then(m => ({
      default: m.DeliveryCheckoutSucessoModal,
    })),
  { loading: CheckoutModalChunkFallback }
)

const DeliveryCotacaoDesatualizadaDialog = dynamic(
  () =>
    import('../components/checkout/DeliveryCotacaoDesatualizadaDialog').then(m => ({
      default: m.DeliveryCotacaoDesatualizadaDialog,
    }))
)

const DeliveryCheckoutForaCoberturaDialog = dynamic(
  () =>
    import('../components/checkout/DeliveryCheckoutForaCoberturaDialog').then(m => ({
      default: m.DeliveryCheckoutForaCoberturaDialog,
    }))
)

type DeliveryPublicoCarrinhoScreenProps = {
  slug: string
  lojaAberta?: boolean
  /** Chamado após a animação de fechamento (overlay sobre a home). */
  onClose: () => void
}

export function DeliveryPublicoCarrinhoScreen({
  slug,
  lojaAberta = true,
  onClose,
}: DeliveryPublicoCarrinhoScreenProps) {
  const atualizarQuantidade = useDeliveryCarrinhoStore(s => s.atualizarQuantidade)
  const removerItem = useDeliveryCarrinhoStore(s => s.removerItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const [itemEditando, setItemEditando] = useState<DeliveryCarrinhoItem | null>(null)
  const [aberto, setAberto] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set())
  const [pedidoConfirmado, setPedidoConfirmado] =
    useState<PedidoPublicoConfirmadoSnapshot | null>(null)
  const [cotacaoDesatualizada, setCotacaoDesatualizada] = useState<{
    message: string
    cotacao: CotacaoPedidoPublicoDTO
  } | null>(null)

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
    clienteLookup,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    restaurarEnderecoSelecaoCancelada,
    removerEnderecoCliente,
    consultarClientePorTelefone,
    confirmarNovoEndereco,
    confirmarGeoEnderecoExistente,
    meiosPagamento,
    loadingMeios,
    enviando,
    enviarPedido,
    salvarNomeCliente,
    limparIdentificacaoCliente,
    consultarTelefoneAtual,
    totalOficial,
    subtotalOficial,
    taxaEntregaOficial,
    cotacao,
    cotacaoLoading,
    cotacaoPronta,
    recotarPedido,
    aplicarCotacaoAtualizada,
    limparCotacao,
    limparCarrinhoAposPedido,
    foraCoberturaDialogAberto,
    fecharForaCoberturaDialog,
    podeCriarNovoEndereco,
  } = useDeliveryCheckout(slug, {
    fetchMeiosPagamento: true,
    prefetchMeiosAposIdentificacao: true,
  })

  const quantidadeItens = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade, 0),
    [itens]
  )

  const itensVisiveis = useMemo(
    () => itens.filter(item => !removingIds.has(item.id)),
    [itens, removingIds]
  )

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)

  const empresa = catalogQuery.data?.pages[0]?.empresa ?? null
  const enderecoEmpresaTexto = formatEmpresaPublicaEndereco(empresa?.endereco ?? null)
  const { localizacaoEmpresa } = useLocalizacaoEmpresaPublica(
    slug,
    empresa?.endereco ?? null,
    Boolean(empresa?.endereco || empresa?.localizacao),
    empresa?.localizacao
  )

  const grupos = useMemo(
    () => (catalogQuery.data?.pages ? flattenCatalogoGrupos(catalogQuery.data.pages) : []),
    [catalogQuery.data?.pages]
  )

  const produtoEdicao = useMemo(() => {
    if (!itemEditando) return null
    return findCatalogoProdutoById(grupos, itemEditando.produtoId)
  }, [itemEditando, grupos])

  const enderecoClienteSelecionado = useMemo(() => {
    if (form.modoEndereco !== 'existente') return null
    const id = form.enderecoIdSelecionado.trim()
    if (!id) return null
    return clienteLookup.cliente?.enderecos.find(e => e.id === id) ?? null
  }, [form.modoEndereco, form.enderecoIdSelecionado, clienteLookup.cliente?.enderecos])

  const quantidadeEnderecosCliente = clienteLookup.cliente?.enderecos?.length ?? 0
  const novoEnderecoBloqueado = clienteAtingiuMaxEnderecosDelivery(quantidadeEnderecosCliente)

  const enderecoParaRevisao =
    form.tipoEntrega === 'entrega' ? enderecoClienteSelecionado : null

  const pagamentosRevisao = useMemo(
    () =>
      form.pagamentos.map(p => ({
        ...p,
        meio: meiosPagamento.find(m => m.id === p.meioPagamentoId) ?? null,
      })),
    [form.pagamentos, meiosPagamento]
  )

  const nomeClienteExibicao =
    form.nome.trim() || clienteLookup.cliente?.nome?.trim() || ''

  const totalCheckout = totalOficial ?? total

  const prevCheckoutStepForCotacaoRef = useRef<DeliveryCheckoutStep>(null)
  const cotacaoAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recotarPedidoRef = useRef(recotarPedido)
  recotarPedidoRef.current = recotarPedido

  const COTACAO_AUTO_DEBOUNCE_MS = 800

  const cotacaoValidaParaPagamento = useMemo(() => {
    if (!cotacaoPronta || !cotacao?.tokenCotacao) return false
    return !isTokenCotacaoExpirado(cotacao.expiresAt)
  }, [cotacao, cotacaoPronta])

  const flow = useDeliveryCheckoutFlow({
    tipoEntrega: form.tipoEntrega,
    enderecoSelecionado: enderecoClienteSelecionado
      ? {
          id: enderecoClienteSelecionado.id,
          temGeolocalizacao: enderecoTemGeolocalizacao(enderecoClienteSelecionado),
        }
      : null,
    quantidadeEnderecos: quantidadeEnderecosCliente,
    lookupStatus: clienteLookup.status,
    nomeCadastro: clienteLookup.cliente?.nome ?? null,
    nomeDigitado: form.nome,
    cotacaoValidaParaPagamento,
    recotarPedido,
    restaurarEnderecoSelecaoCancelada,
    enderecoIdSelecionado: form.enderecoIdSelecionado,
    podeCriarNovoEndereco,
    usarNovoEndereco,
    selecionarEnderecoExistente,
    limparCotacao,
  })

  const {
    checkoutStep,
    checkoutDirection,
    checkoutProgress,
    currentCheckoutProgress,
    bumpProgressFromCurrent,
    setOrigemFormEndereco,
    goToCheckoutStep,
    fecharCheckout,
    fecharOuRevisao,
    voltarDoPagamento,
    abrirStepDaRevisao,
    irParaProximoPassoAposEndereco,
    avancarAposIdentificacao,
    handleSelecionarEndereco: handleSelecionarEnderecoFlow,
    handleUsarNovoEndereco,
    handleTrocarEndereco,
    handleNovoEnderecoDesdeIdentificacao,
    handleContinuarCheckout: handleContinuarCheckoutFlow,
    handlePagamentoContinuar,
    handleCancelarEnderecoForm,
    handleCancelarGeoEndereco,
    marcarSucesso,
  } = flow

  useEffect(() => {
    bumpProgressFromCurrent()
  }, [currentCheckoutProgress, checkoutStep, bumpProgressFromCurrent])

  useEffect(() => {
    return () => {
      if (cotacaoAutoTimerRef.current) clearTimeout(cotacaoAutoTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const stepComCotacao =
      checkoutStep === 'telefone' || checkoutStep === 'pagamento' || checkoutStep === 'revisao'

    if (!stepComCotacao) {
      prevCheckoutStepForCotacaoRef.current = checkoutStep
      return
    }

    if (checkoutStep === 'telefone') {
      if (form.tipoEntrega !== 'entrega' || !form.enderecoIdSelecionado.trim()) return
    }

    if (itens.length === 0 || cotacaoLoading || cotacaoValidaParaPagamento) return

    const chaveAuto = [
      checkoutStep,
      form.tipoEntrega,
      form.enderecoIdSelecionado.trim(),
      clienteLookup.telefoneConsultado ?? '',
      fingerprintItensCotacao(itens),
    ].join('|')

    if (cotacaoAutoTimerRef.current) clearTimeout(cotacaoAutoTimerRef.current)

    cotacaoAutoTimerRef.current = setTimeout(() => {
      prevCheckoutStepForCotacaoRef.current = checkoutStep
      void recotarPedidoRef.current({
        silencioso: checkoutStep === 'telefone',
        chaveAuto,
      })
    }, COTACAO_AUTO_DEBOUNCE_MS)

    return () => {
      if (cotacaoAutoTimerRef.current) clearTimeout(cotacaoAutoTimerRef.current)
    }
  }, [
    checkoutStep,
    form.tipoEntrega,
    form.enderecoIdSelecionado,
    clienteLookup.telefoneConsultado,
    cotacaoLoading,
    cotacaoValidaParaPagamento,
    itens,
  ])

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

  const concluirAposSucesso = () => {
    setPedidoConfirmado(null)
    fecharCheckout()
    requestClose()
  }

  const handleEnviarPedido = async () => {
    if (!lojaAberta) {
      showToast.error('A loja está fechada no momento. Não é possível finalizar pedidos.')
      return
    }

    const fallback = {
      tipoEntrega: form.tipoEntrega,
      modoTempo: form.modoTempo,
      nome: nomeClienteExibicao,
      telefone: form.telefone,
      telefonePaisIso2: form.telefonePaisIso2 || DELIVERY_PAIS_TELEFONE_PADRAO,
      enderecoCliente: enderecoParaRevisao,
      enderecoEmpresaTexto,
      itensCarrinho: itens.map(item => ({
        ...item,
        complementos: [...item.complementos],
      })),
      total: totalCheckout,
      pagamentos: pagamentosRevisao.map(p => ({ ...p })),
      observacaoPedido: form.observacaoPedido,
      cpfNotaFiscal: form.cpfNotaFiscal,
      meiosPagamento,
    }

    const resultado = await enviarPedido()
    if (!resultado.ok) {
      if ('reason' in resultado && resultado.reason === 'cotacao_desatualizada') {
        setCotacaoDesatualizada({
          message: resultado.message,
          cotacao: resultado.cotacao,
        })
      }
      return
    }

    setPedidoConfirmado(mapPedidoPublicoCriadoParaConfirmado(resultado.pedido, fallback))
    marcarSucesso()
    limparCarrinhoAposPedido()
  }

  const handleConfirmarCotacaoDesatualizada = async () => {
    if (!cotacaoDesatualizada) return
    aplicarCotacaoAtualizada(cotacaoDesatualizada.cotacao)
    setCotacaoDesatualizada(null)
    await handleEnviarPedido()
  }

  const voltar = () => requestClose()
  const carregandoEdicao = Boolean(itemEditando) && !produtoEdicao
  useDeliveryBodyScrollLock(aberto)

  const handleSelecionarEndereco = (enderecoId: string) => {
    const e = clienteLookup.cliente?.enderecos.find(end => end.id === enderecoId)
    handleSelecionarEnderecoFlow(
      enderecoId,
      e ? { id: e.id, temGeolocalizacao: enderecoTemGeolocalizacao(e) } : null
    )
  }

  const handleRemoverEnderecoDaLista = async (enderecoId: string) => {
    try {
      await removerEnderecoCliente(enderecoId)
      showToast.success('Endereço removido')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao remover endereço')
    }
  }

  const handleContinuarCheckout = () => {
    if (!lojaAberta) {
      showToast.error('A loja está fechada no momento. Não é possível finalizar pedidos.')
      return
    }
    handleContinuarCheckoutFlow()
  }

  const handleChangeOpcaoEntrega = (opcao: ModoEntregaOpcao) => {
    updateForm('tipoEntrega', opcao.tipoEntrega)
    updateForm('modoTempo', opcao.modoTempo)
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

  const handleConfirmarEnderecoForm = async (geo: EnderecoGeoCheckoutInput) => {
    const editandoExistente =
      form.modoEndereco === 'existente' && Boolean(form.enderecoIdSelecionado.trim())

    if (editandoExistente) {
      await confirmarGeoEnderecoExistente(geo)
    } else {
      await confirmarNovoEndereco(geo)
    }

    setOrigemFormEndereco(null)
    const passo = await irParaProximoPassoAposEndereco()
    if (passo === true) {
      showToast.success(editandoExistente ? 'Endereço atualizado!' : 'Endereço salvo!')
    }
  }

  const handleConfirmarGeoEndereco = async (
    geo: EnderecoGeoCheckoutInput
  ): Promise<boolean | 'fora_cobertura'> => {
    await confirmarGeoEnderecoExistente(geo)
    const passo = await irParaProximoPassoAposEndereco()
    if (passo === true) showToast.success('Localização salva!')
    return passo
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
              {!lojaAberta ? (
                <div
                  role="status"
                  className="rounded-xl border px-3 py-2 text-sm font-medium"
                  style={{
                    borderColor: 'var(--delivery-border)',
                    backgroundColor: 'var(--delivery-surface-muted)',
                    color: 'var(--delivery-text-primary)',
                  }}
                >
                  Loja fechada no momento. Você pode navegar pelo cardápio, mas pedidos estão
                  indisponíveis.
                </div>
              ) : null}

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
                  continuarDisabled={!lojaAberta}
                  continuarLabel={lojaAberta ? 'Continuar' : 'Loja fechada'}
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
                itemEdicao={itemEditando}
                onClose={() => setItemEditando(null)}
              />
            ) : null}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <DeliveryCheckoutShell
        open={checkoutStep != null}
        stepKey={checkoutStep ?? 'telefone'}
        direction={checkoutDirection}
        onClose={
          checkoutStep === 'sucesso'
            ? concluirAposSucesso
            : checkoutStep === 'pedidoDetalhe'
              ? () => goToCheckoutStep('sucesso')
              : checkoutStep === 'revisao'
                ? fecharCheckout
                : fecharOuRevisao
        }
      >
        {checkoutStep === 'telefone' ? (
          <DeliveryCheckoutIdentifiqueSeModal
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
            temEnderecosCadastrados={quantidadeEnderecosCliente > 0}
            quantidadeEnderecos={quantidadeEnderecosCliente}
            enderecoEmpresaTexto={enderecoEmpresaTexto}
            localizacaoEmpresa={localizacaoEmpresa}
            onChangeTelefone={value => updateForm('telefone', value)}
            onChangeTelefonePais={iso2 => updateForm('telefonePaisIso2', iso2)}
            onConsultarTelefone={consultarTelefoneAtual}
            onChangeNome={value => updateForm('nome', value)}
            onChangeOpcaoEntrega={handleChangeOpcaoEntrega}
            onTrocarEndereco={() => handleTrocarEndereco('identificacao')}
            onCadastrarEndereco={() => handleNovoEnderecoDesdeIdentificacao('identificacao')}
            novoEnderecoBloqueado={novoEnderecoBloqueado}
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
            localizacaoEmpresa={localizacaoEmpresa}
            onClose={fecharOuRevisao}
            onSelecionar={handleSelecionarEndereco}
            onUsarNovoEndereco={handleUsarNovoEndereco}
            onRemover={handleRemoverEnderecoDaLista}
            novoEnderecoBloqueado={novoEnderecoBloqueado}
          />
        ) : null}

        {checkoutStep === 'enderecoForm' ? (
          <DeliveryCheckoutEnderecoFormModal
            form={form}
            enderecoSalvo={null}
            enderecosCadastrados={clienteLookup.cliente?.enderecos ?? []}
            localizacaoEmpresa={localizacaoEmpresa}
            onSelecionarEnderecoCadastrado={handleSelecionarEndereco}
            onRemoverEnderecoCadastrado={handleRemoverEnderecoDaLista}
            onChange={updateForm}
            onClose={fecharOuRevisao}
            onCancelar={handleCancelarEnderecoForm}
            onConfirmar={handleConfirmarEnderecoForm}
          />
        ) : null}

        {checkoutStep === 'enderecoGeo' && enderecoClienteSelecionado ? (
          <DeliveryCheckoutEnderecoGeoModal
            endereco={enderecoClienteSelecionado}
            enderecoFallback={{
              cidade: empresa?.endereco?.cidade ?? null,
              estado: empresa?.endereco?.estado ?? null,
            }}
            onCancelar={handleCancelarGeoEndereco}
            onConfirmar={handleConfirmarGeoEndereco}
          />
        ) : null}

        {checkoutStep === 'pagamento' ? (
          <DeliveryCheckoutPagamentoModal
            tipoEntrega={form.tipoEntrega}
            subtotal={total}
            subtotalOficial={subtotalOficial}
            taxaEntregaOficial={taxaEntregaOficial}
            total={totalCheckout}
            cotacaoLoading={cotacaoLoading}
            cotacaoPronta={cotacaoPronta}
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
            localizacaoEmpresa={localizacaoEmpresa}
            itens={itens}
            total={total}
            subtotalOficial={subtotalOficial}
            taxaEntregaOficial={taxaEntregaOficial}
            totalOficial={totalOficial}
            cotacaoLoading={cotacaoLoading}
            cotacaoPronta={cotacaoPronta}
            pagamentos={pagamentosRevisao}
            observacaoPedido={form.observacaoPedido}
            cpfNotaFiscal={form.cpfNotaFiscal}
            enviando={enviando}
            onClose={fecharCheckout}
            onVoltar={() => {
              goToCheckoutStep('pagamento')
            }}
            onEditarTipoEntrega={() => abrirStepDaRevisao('telefone')}
            onEditarCliente={() => abrirStepDaRevisao('telefone')}
            onEditarEndereco={() => handleTrocarEndereco('revisao')}
            onEditarPedido={() => {
              fecharCheckout()
            }}
            onEditarPagamento={() => abrirStepDaRevisao('pagamento')}
            onChangeObservacaoPedido={value => updateForm('observacaoPedido', value)}
            onChangeCpfNotaFiscal={value => updateForm('cpfNotaFiscal', value)}
            onEnviar={() => void handleEnviarPedido()}
          />
        ) : null}

        {checkoutStep === 'sucesso' && pedidoConfirmado ? (
          <DeliveryCheckoutSucessoModal
            nomeCliente={pedidoConfirmado.nome}
            tipoEntrega={pedidoConfirmado.tipoEntrega}
            modoTempo={pedidoConfirmado.modoTempo}
            enderecoCliente={pedidoConfirmado.enderecoCliente}
            enderecoEmpresaTexto={pedidoConfirmado.enderecoEmpresaTexto}
            localizacaoEmpresa={localizacaoEmpresa}
            telefoneEmpresa={empresa?.telefone ?? null}
            nomeEmpresa={empresa?.nomeFantasia ?? null}
            codigoVenda={pedidoConfirmado.codigoVenda}
            onVerPedido={() => goToCheckoutStep('pedidoDetalhe')}
            onVoltarAoCardapio={concluirAposSucesso}
          />
        ) : null}

        {checkoutStep === 'pedidoDetalhe' && pedidoConfirmado ? (
          <DeliveryCheckoutRevisaoModal
            modo="somenteLeitura"
            tipoEntrega={pedidoConfirmado.tipoEntrega}
            nome={pedidoConfirmado.nome}
            telefone={pedidoConfirmado.telefone}
            telefonePaisIso2={pedidoConfirmado.telefonePaisIso2}
            enderecoCliente={pedidoConfirmado.enderecoCliente}
            enderecoEmpresaTexto={pedidoConfirmado.enderecoEmpresaTexto}
            localizacaoEmpresa={localizacaoEmpresa}
            itens={pedidoConfirmado.itens}
            total={pedidoConfirmado.total}
            pagamentos={pedidoConfirmado.pagamentos}
            observacaoPedido={pedidoConfirmado.observacaoPedido}
            cpfNotaFiscal={pedidoConfirmado.cpfNotaFiscal}
            codigoVenda={pedidoConfirmado.codigoVenda}
            onVoltar={() => goToCheckoutStep('sucesso')}
          />
        ) : null}
      </DeliveryCheckoutShell>

      {cotacaoDesatualizada ? (
        <DeliveryCotacaoDesatualizadaDialog
          message={cotacaoDesatualizada.message}
          cotacao={cotacaoDesatualizada.cotacao}
          onConfirmar={() => void handleConfirmarCotacaoDesatualizada()}
        />
      ) : null}

      <DeliveryCheckoutForaCoberturaDialog
        open={foraCoberturaDialogAberto}
        onFechar={fecharForaCoberturaDialog}
        onEscolherRetirada={() => {
          updateForm('tipoEntrega', 'retirada')
          fecharForaCoberturaDialog()
          handleContinuarCheckoutFlow()
        }}
      />
    </DeliveryCheckoutProgressProvider>
  )
}
