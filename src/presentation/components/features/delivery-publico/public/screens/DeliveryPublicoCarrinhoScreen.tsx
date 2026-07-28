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
import { useDeliveryBodyScrollLock } from '../../shared/hooks/useDeliveryBodyScrollLock'
import { useDeliveryCheckout } from '../../shared/hooks/useDeliveryCheckout'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../shared/stores/deliveryCarrinhoStore'
import { findCatalogoProdutoById } from '../../shared/utils/findCatalogoProdutoById'
import { itemSemComplemento } from '../../shared/utils/deliveryCarrinhoItemUtils'
import { formatEmpresaPublicaEndereco } from '../../shared/utils/formatEmpresaPublicaEndereco'
import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'
import { DeliveryCheckoutFooterActions } from '../components/checkout/DeliveryCheckoutFooterActions'
import { DeliveryCheckoutIdentifiqueSeModal } from '../components/checkout/DeliveryCheckoutIdentifiqueSeModal'
import { DeliveryCheckoutEnderecosModal } from '../components/checkout/DeliveryCheckoutEnderecosModal'
import { DeliveryCheckoutEnderecoFormModal } from '../components/checkout/DeliveryCheckoutEnderecoFormModal'
import {
  DeliveryCheckoutTipoEntregaModal,
  type ModoEntregaOpcao,
} from '../components/checkout/DeliveryCheckoutTipoEntregaModal'
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
  const [itemEditando, setItemEditando] = useState<DeliveryCarrinhoItem | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<DeliveryCheckoutStep>(null)
  const [checkoutDirection, setCheckoutDirection] = useState<1 | -1>(1)
  const prevCheckoutStepRef = useRef<DeliveryCheckoutStep>(null)
  const [highestCheckoutPercentage, setHighestCheckoutPercentage] = useState(0)
  /** Quando true, concluir um step intermediário volta para a revisão. */
  const [voltarParaRevisao, setVoltarParaRevisao] = useState(false)
  /** Quando true, concluir endereço volta para a tela das 4 opções. */
  const [voltarParaTipoEntrega, setVoltarParaTipoEntrega] = useState(false)
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

  const enderecoClienteSelecionado = useMemo(() => {
    if (form.modoEndereco !== 'existente') return null
    const id = form.enderecoIdSelecionado.trim()
    if (!id) return null
    return clienteLookup.cliente?.enderecos.find(e => e.id === id) ?? null
  }, [form.modoEndereco, form.enderecoIdSelecionado, clienteLookup.cliente?.enderecos])

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
        preserveCompleted: voltarParaRevisao,
        identificacaoCompleta,
      }),
    [checkoutStep, form.tipoEntrega, voltarParaRevisao, identificacaoCompleta]
  )

  useEffect(() => {
    if (!currentCheckoutProgress) return
    if (checkoutStep === 'telefone') {
      // Na identificação a barra acompanha o estado atual (pode subir ou descer).
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
    setVoltarParaTipoEntrega(false)
    prevCheckoutStepRef.current = null
    setCheckoutStep(null)
  }

  const fecharOuRevisao = () => {
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    if (voltarParaTipoEntrega) {
      goToCheckoutStep('tipoEntrega')
      return
    }
    fecharCheckout()
  }

  const voltarDoTipoEntrega = () => {
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
    goToCheckoutStep('tipoEntrega')
  }

  const irParaTipoEntrega = () => {
    setVoltarParaRevisao(false)
    setVoltarParaTipoEntrega(false)
    goToCheckoutStep('tipoEntrega')
  }

  const abrirStepDaRevisao = (step: DeliveryCheckoutStep) => {
    setVoltarParaRevisao(true)
    setVoltarParaTipoEntrega(false)
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
    if (voltarParaTipoEntrega) {
      setVoltarParaTipoEntrega(false)
      goToCheckoutStep('tipoEntrega')
      return
    }
    goToCheckoutStep('pagamento')
  }

  const handleUsarNovoEndereco = () => {
    usarNovoEndereco()
    goToCheckoutStep('enderecoForm')
  }

  const handleContinuarCheckout = () => {
    setHighestCheckoutPercentage(0)
    setVoltarParaRevisao(false)
    setVoltarParaTipoEntrega(false)
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

  const handleTipoEntregaContinuar = () => {
    if (form.tipoEntrega === 'entrega' && !enderecoClienteSelecionado) {
      setVoltarParaTipoEntrega(false)
      setVoltarParaRevisao(false)
      abrirFluxoEndereco()
      return
    }
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

  const handleAlterarEndereco = (origem: 'tipoEntrega' | 'revisao' = 'tipoEntrega') => {
    if (origem === 'revisao') {
      setVoltarParaRevisao(true)
      setVoltarParaTipoEntrega(false)
    } else {
      setVoltarParaTipoEntrega(true)
      setVoltarParaRevisao(false)
    }
    abrirFluxoEndereco()
  }

  const handleChangeOpcaoEntrega = (opcao: ModoEntregaOpcao) => {
    updateForm('tipoEntrega', opcao.tipoEntrega)
    updateForm('modoTempo', opcao.modoTempo)
  }

  const handleTelefoneContinuar = async (digits: string) => {
    const { status } = await consultarClientePorTelefone(digits)
    if (status === 'invalido') {
      showToast.error('Informe um celular válido')
      return
    }
    if (status === 'erro' || status === 'idle') {
      showToast.error(clienteLookup.mensagemErro || 'Erro ao consultar cadastro')
      return
    }

    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }

    irParaTipoEntrega()
  }

  const handleConfirmarEnderecoForm = async () => {
    await confirmarNovoEndereco()
    showToast.success('Endereço salvo!')
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    if (voltarParaTipoEntrega) {
      setVoltarParaTipoEntrega(false)
      goToCheckoutStep('tipoEntrega')
      return
    }
    goToCheckoutStep('pagamento')
  }

  const handleCancelarEnderecoForm = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      goToCheckoutStep('enderecos')
      return
    }
    setVoltarParaTipoEntrega(false)
    goToCheckoutStep('tipoEntrega')
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
            className="fixed right-0 z-50 flex w-full flex-col overflow-hidden overscroll-none shadow-2xl lg:w-[40%]"
            style={{
              top: 'var(--delivery-vv-offset-top, 0px)',
              height: 'var(--delivery-vv-height, 100dvh)',
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
          checkoutStep === 'tipoEntrega' || checkoutStep === 'revisao'
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
              clienteLookup.status === 'encontrado'
                ? clienteLookup.telefoneConsultado
                : null
            }
            lookupStatus={clienteLookup.status}
            onChangeTelefone={value => updateForm('telefone', value)}
            onChangeTelefonePais={iso2 => updateForm('telefonePaisIso2', iso2)}
            onChangeNome={value => updateForm('nome', value)}
            onSalvarNome={salvarNomeCliente}
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

        {checkoutStep === 'tipoEntrega' ? (
          <DeliveryCheckoutTipoEntregaModal
            tipoEntrega={form.tipoEntrega}
            modoTempo={form.modoTempo}
            enderecoCliente={enderecoClienteSelecionado}
            temEnderecosCadastrados={(clienteLookup.cliente?.enderecos?.length ?? 0) > 0}
            enderecoEmpresaTexto={enderecoEmpresaTexto}
            onChangeOpcao={handleChangeOpcaoEntrega}
            onEditarEndereco={() => handleAlterarEndereco('tipoEntrega')}
            onCadastrarEndereco={() => handleAlterarEndereco('tipoEntrega')}
            onClose={fecharCheckout}
            onVoltar={voltarDoTipoEntrega}
            onContinuar={handleTipoEntregaContinuar}
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
            cpfNotaFiscal={form.cpfNotaFiscal}
            enviando={enviando}
            onClose={fecharCheckout}
            onVoltar={() => {
              setVoltarParaRevisao(false)
              goToCheckoutStep('pagamento')
            }}
            onEditarTipoEntrega={() => abrirStepDaRevisao('tipoEntrega')}
            onEditarCliente={() => abrirStepDaRevisao('telefone')}
            onEditarEndereco={() => handleAlterarEndereco('revisao')}
            onEditarPedido={() => {
              setVoltarParaRevisao(false)
              setVoltarParaTipoEntrega(false)
              fecharCheckout()
            }}
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
