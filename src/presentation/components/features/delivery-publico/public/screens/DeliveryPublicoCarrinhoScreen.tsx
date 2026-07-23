'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
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
import { DeliveryCarrinhoEnderecoTopo } from '../components/checkout/DeliveryCarrinhoEnderecoTopo'
import { DeliveryCheckoutIdentifiqueSeModal } from '../components/checkout/DeliveryCheckoutIdentifiqueSeModal'
import { DeliveryCheckoutEnderecosModal } from '../components/checkout/DeliveryCheckoutEnderecosModal'
import { DeliveryCheckoutEnderecoFormModal } from '../components/checkout/DeliveryCheckoutEnderecoFormModal'
import {
  DeliveryCheckoutTipoEntregaModal,
  type ModoEntregaOpcao,
} from '../components/checkout/DeliveryCheckoutTipoEntregaModal'
import { DeliveryCheckoutPagamentoModal } from '../components/checkout/DeliveryCheckoutPagamentoModal'
import { DeliveryCheckoutRevisaoModal } from '../components/checkout/DeliveryCheckoutRevisaoModal'

type DeliveryPublicoCarrinhoScreenProps = {
  slug: string
  /** Chamado após a animação de fechamento (overlay sobre a home). */
  onClose: () => void
}

type CheckoutStep =
  | 'telefone'
  | 'enderecos'
  | 'enderecoForm'
  | 'tipoEntrega'
  | 'pagamento'
  | 'revisao'
  | null

export function DeliveryPublicoCarrinhoScreen({
  slug,
  onClose,
}: DeliveryPublicoCarrinhoScreenProps) {
  const atualizarQuantidade = useDeliveryCarrinhoStore(s => s.atualizarQuantidade)
  const removerItem = useDeliveryCarrinhoStore(s => s.removerItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const [itemEditando, setItemEditando] = useState<DeliveryCarrinhoItem | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(null)
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

  const meioPagamentoSelecionado = useMemo(
    () => meiosPagamento.find(m => m.id === form.meioPagamentoId) ?? null,
    [meiosPagamento, form.meioPagamentoId]
  )

  const nomeClienteExibicao =
    form.nome.trim() || clienteLookup.cliente?.nome?.trim() || ''

  const fecharCheckout = () => {
    setVoltarParaRevisao(false)
    setVoltarParaTipoEntrega(false)
    setCheckoutStep(null)
  }

  const fecharOuRevisao = () => {
    if (voltarParaRevisao) {
      setCheckoutStep('revisao')
      return
    }
    if (voltarParaTipoEntrega) {
      setCheckoutStep('tipoEntrega')
      return
    }
    setCheckoutStep(null)
  }

  const irParaTipoEntrega = () => {
    setVoltarParaRevisao(false)
    setVoltarParaTipoEntrega(false)
    setCheckoutStep('tipoEntrega')
  }

  const abrirStepDaRevisao = (step: CheckoutStep) => {
    setVoltarParaRevisao(true)
    setVoltarParaTipoEntrega(false)
    setCheckoutStep(step)
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

  const voltar = () => requestClose()
  const carregandoEdicao = Boolean(itemEditando) && !produtoEdicao
  useDeliveryBodyScrollLock(aberto)

  const handleSelecionarEndereco = (enderecoId: string) => {
    selecionarEnderecoExistente(enderecoId)
    if (voltarParaRevisao) {
      setCheckoutStep('revisao')
      return
    }
    if (voltarParaTipoEntrega) {
      setVoltarParaTipoEntrega(false)
      setCheckoutStep('tipoEntrega')
      return
    }
    setCheckoutStep('pagamento')
  }

  const handleUsarNovoEndereco = () => {
    usarNovoEndereco()
    setCheckoutStep('enderecoForm')
  }

  const handleContinuarCheckout = () => {
    setVoltarParaRevisao(false)
    setVoltarParaTipoEntrega(false)
    setCheckoutStep('telefone')
  }

  const abrirFluxoEndereco = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      setCheckoutStep('enderecos')
      return
    }
    usarNovoEndereco()
    setCheckoutStep('enderecoForm')
  }

  const handleTipoEntregaContinuar = () => {
    if (form.tipoEntrega === 'entrega' && !enderecoClienteSelecionado) {
      setVoltarParaTipoEntrega(false)
      setVoltarParaRevisao(false)
      abrirFluxoEndereco()
      return
    }
    if (voltarParaRevisao) {
      setCheckoutStep('revisao')
      return
    }
    setCheckoutStep('pagamento')
  }

  const handlePagamentoContinuar = () => {
    setVoltarParaRevisao(false)
    setCheckoutStep('revisao')
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
      setCheckoutStep('revisao')
      return
    }

    irParaTipoEntrega()
  }

  const handleConfirmarEnderecoForm = async () => {
    await confirmarNovoEndereco()
    showToast.success('Endereço salvo!')
    if (voltarParaRevisao) {
      setCheckoutStep('revisao')
      return
    }
    if (voltarParaTipoEntrega) {
      setVoltarParaTipoEntrega(false)
      setCheckoutStep('tipoEntrega')
      return
    }
    setCheckoutStep('pagamento')
  }

  const handleCancelarEnderecoForm = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      setCheckoutStep('enderecos')
      return
    }
    setVoltarParaTipoEntrega(false)
    setCheckoutStep('tipoEntrega')
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {aberto ? (
        <motion.div
          key="delivery-carrinho"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--delivery-bg)',
            originX: 0.5,
            originY: 0.5,
          }}
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.55 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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

        <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-3 pb-36 max-sm:scrollbar-hide sm:space-y-5 sm:p-4">
          {itens.length === 0 ? (
            <div className="py-16 text-center">
              <p className="delivery-text-muted">Carrinho vazio</p>
              <DeliveryButton onClick={voltar} className="mt-4 px-6 py-2">
                Ver cardápio
              </DeliveryButton>
            </div>
          ) : (
            <>
              <DeliveryCarrinhoEnderecoTopo
                nomeEmpresaFallback={empresa?.nomeFantasia ?? ''}
                logoUrlFallback={empresa?.logoUrl ?? null}
                capaUrlFallback={empresa?.bannerUrl ?? null}
              />

              <div className="overflow-x-hidden divide-y divide-[var(--delivery-border)]">
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
          <div
            className="fixed bottom-0 left-0 right-0 z-20 border-t border-neutral-200 bg-white"
            style={{
              paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
            }}
          >
            <p className="px-5 pt-3 pb-2 text-base leading-tight text-neutral-900 @sm:text-lg">
              <span className="font-semibold">Total da compra:</span>{' '}
              {formatDeliveryCurrency(total)}
              <span className="text-neutral-400">
                {' '}
                / {quantidadeItens === 1 ? '1 item' : `${quantidadeItens} itens`}
              </span>
            </p>

            <div className="flex min-h-[3.5rem] w-full items-stretch">
              <button
                type="button"
                onClick={voltar}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-neutral-300 bg-white px-5 text-base font-semibold text-black"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
                Voltar
              </button>
              <button
                type="button"
                onClick={handleContinuarCheckout}
                className="flex min-w-0 flex-1 items-center justify-center border-0 bg-black px-5 text-base font-semibold text-white"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : null}

        {checkoutStep === 'telefone' ? (
          <DeliveryCheckoutIdentifiqueSeModal
            telefone={form.telefone}
            telefonePaisIso2={form.telefonePaisIso2}
            nome={form.nome}
            nomeCadastro={clienteLookup.cliente?.nome ?? null}
            lookupStatus={clienteLookup.status}
            onChangeTelefone={value => updateForm('telefone', value)}
            onChangeTelefonePais={iso2 => updateForm('telefonePaisIso2', iso2)}
            onChangeNome={value => updateForm('nome', value)}
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
            onContinuar={handleTipoEntregaContinuar}
          />
        ) : null}

        {checkoutStep === 'pagamento' ? (
          <DeliveryCheckoutPagamentoModal
            total={total}
            meiosPagamento={meiosPagamento}
            loadingMeios={loadingMeios}
            meioPagamentoId={form.meioPagamentoId}
            trocoPara={form.trocoPara}
            onChangeMeioPagamentoId={value => updateForm('meioPagamentoId', value)}
            onChangeTrocoPara={value => updateForm('trocoPara', value)}
            onClose={fecharOuRevisao}
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
            nomeEmpresaFallback={empresa?.nomeFantasia ?? ''}
            logoUrlFallback={empresa?.logoUrl ?? null}
            capaUrlFallback={empresa?.bannerUrl ?? null}
            itens={itens}
            total={total}
            meioPagamento={meioPagamentoSelecionado}
            trocoPara={form.trocoPara}
            observacaoPedido={form.observacaoPedido}
            enviando={enviando}
            onClose={fecharCheckout}
            onVoltar={() => {
              setVoltarParaRevisao(false)
              setCheckoutStep('pagamento')
            }}
            onEditarCliente={() => abrirStepDaRevisao('telefone')}
            onEditarEndereco={() => handleAlterarEndereco('revisao')}
            onEditarPedido={() => {
              setVoltarParaRevisao(false)
              setVoltarParaTipoEntrega(false)
              setCheckoutStep(null)
            }}
            onEditarPagamento={() => abrirStepDaRevisao('pagamento')}
            onChangeObservacaoPedido={value => updateForm('observacaoPedido', value)}
            onEnviar={() => void enviarPedido()}
          />
        ) : null}

        {carregandoEdicao ? (
          <div className="fixed inset-0 z-50 flex overscroll-none items-center justify-center">
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
