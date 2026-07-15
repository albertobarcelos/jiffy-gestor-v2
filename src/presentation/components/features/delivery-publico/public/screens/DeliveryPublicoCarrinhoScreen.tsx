'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdClose } from 'react-icons/md'
import {
  flattenCatalogoGrupos,
  useAutoFetchCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryThemeScope } from '../../shared/components/DeliveryThemeScope'
import { DeliveryCarrinhoItemCard } from '../../shared/components/DeliveryCarrinhoItemCard'
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
import { telefoneNacionalValido } from '../../shared/utils/deliveryTelefonePais'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'
import { DeliveryCarrinhoEnderecoTopo } from '../components/checkout/DeliveryCarrinhoEnderecoTopo'
import { DeliveryCheckoutIdentifiqueSeModal } from '../components/checkout/DeliveryCheckoutIdentifiqueSeModal'
import { DeliveryCheckoutNomeModal } from '../components/checkout/DeliveryCheckoutNomeModal'
import { DeliveryCheckoutEnderecosModal } from '../components/checkout/DeliveryCheckoutEnderecosModal'
import { DeliveryCheckoutEnderecoFormModal } from '../components/checkout/DeliveryCheckoutEnderecoFormModal'
import { DeliveryCheckoutPagamentoModal } from '../components/checkout/DeliveryCheckoutPagamentoModal'
import { DeliveryCheckoutObservacoesModal } from '../components/checkout/DeliveryCheckoutObservacoesModal'
import { DeliveryCheckoutRevisaoModal } from '../components/checkout/DeliveryCheckoutRevisaoModal'

type DeliveryPublicoCarrinhoScreenProps = {
  slug: string
}

type CheckoutStep =
  | 'telefone'
  | 'nome'
  | 'enderecos'
  | 'enderecoForm'
  | 'pagamento'
  | 'observacoes'
  | 'revisao'
  | null

export function DeliveryPublicoCarrinhoScreen({ slug }: DeliveryPublicoCarrinhoScreenProps) {
  return (
    <DeliveryThemeScope slug={slug}>
      <DeliveryPublicoCarrinhoContent slug={slug} />
    </DeliveryThemeScope>
  )
}

function DeliveryPublicoCarrinhoContent({ slug }: { slug: string }) {
  const router = useRouter()
  const atualizarQuantidade = useDeliveryCarrinhoStore(s => s.atualizarQuantidade)
  const removerItem = useDeliveryCarrinhoStore(s => s.removerItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const [itemEditando, setItemEditando] = useState<DeliveryCarrinhoItem | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(null)
  /** Quando true, concluir um step intermediário volta para a revisão. */
  const [voltarParaRevisao, setVoltarParaRevisao] = useState(false)

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
    if (form.tipoEntrega !== 'entrega' || form.modoEndereco !== 'existente') return null
    const id = form.enderecoIdSelecionado.trim()
    if (!id) return null
    return clienteLookup.cliente?.enderecos.find(e => e.id === id) ?? null
  }, [
    form.tipoEntrega,
    form.modoEndereco,
    form.enderecoIdSelecionado,
    clienteLookup.cliente?.enderecos,
  ])

  const meioPagamentoSelecionado = useMemo(
    () => meiosPagamento.find(m => m.id === form.meioPagamentoId) ?? null,
    [meiosPagamento, form.meioPagamentoId]
  )

  const nomeClienteExibicao =
    form.nome.trim() || clienteLookup.cliente?.nome?.trim() || ''

  const podeContinuar =
    form.tipoEntrega === 'retirada' || Boolean(enderecoClienteSelecionado)

  const fecharOuRevisao = () => {
    if (voltarParaRevisao) {
      setCheckoutStep('revisao')
      return
    }
    setCheckoutStep(null)
  }

  const abrirStepDaRevisao = (step: CheckoutStep) => {
    setVoltarParaRevisao(true)
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

  const voltar = () => router.push(`/cardapio/${encodeURIComponent(slug)}`)
  const carregandoEdicao = Boolean(itemEditando) && !produtoEdicao
  useDeliveryBodyScrollLock(carregandoEdicao)

  const handleToggleTipoEntrega = () => {
    updateForm('tipoEntrega', form.tipoEntrega === 'entrega' ? 'retirada' : 'entrega')
  }

  const handleSelecionarEndereco = (enderecoId: string) => {
    selecionarEnderecoExistente(enderecoId)
    fecharOuRevisao()
  }

  const handleUsarNovoEndereco = () => {
    usarNovoEndereco()
    setCheckoutStep('enderecoForm')
  }

  const handleContinuarCheckout = () => {
    if (!podeContinuar) {
      showToast.error(
        form.tipoEntrega === 'entrega'
          ? 'Informe o endereço de entrega'
          : 'Selecione a retirada'
      )
      return
    }
    if (!telefoneNacionalValido(form.telefone, form.telefonePaisIso2)) {
      setVoltarParaRevisao(false)
      setCheckoutStep('telefone')
      return
    }
    setVoltarParaRevisao(false)
    setCheckoutStep('pagamento')
  }

  const handlePagamentoContinuar = () => {
    if (voltarParaRevisao) {
      setCheckoutStep('revisao')
      return
    }
    setCheckoutStep('observacoes')
  }

  const handleObservacoesContinuar = () => {
    setVoltarParaRevisao(false)
    setCheckoutStep('revisao')
  }

  const handleAlterarEndereco = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      setCheckoutStep('enderecos')
      return
    }
    setCheckoutStep('enderecoForm')
  }

  const handleTelefoneContinuar = async (digits: string) => {
    const { status, cliente } = await consultarClientePorTelefone(digits)
    if (status === 'invalido') {
      showToast.error('Informe um celular válido')
      return
    }
    if (status === 'erro' || status === 'idle') {
      showToast.error(clienteLookup.mensagemErro || 'Erro ao consultar cadastro')
      return
    }
    if (status === 'nao_encontrado') {
      setCheckoutStep('nome')
      return
    }

    if (form.tipoEntrega === 'retirada') {
      if (voltarParaRevisao) {
        setCheckoutStep('revisao')
      } else {
        setCheckoutStep('pagamento')
      }
      return
    }

    if (cliente && cliente.enderecos.length > 0) {
      if (voltarParaRevisao) {
        const idAtual = form.enderecoIdSelecionado.trim()
        const aindaValido = Boolean(idAtual && cliente.enderecos.some(e => e.id === idAtual))
        if (aindaValido) {
          setCheckoutStep('revisao')
          return
        }
      }
      setCheckoutStep('enderecos')
      return
    }
    usarNovoEndereco()
    setCheckoutStep('enderecoForm')
  }

  const handleNomeContinuar = () => {
    if (form.tipoEntrega === 'retirada') {
      if (voltarParaRevisao) {
        setCheckoutStep('revisao')
      } else {
        setCheckoutStep('pagamento')
      }
      return
    }
    if (voltarParaRevisao && form.enderecoIdSelecionado.trim()) {
      setCheckoutStep('revisao')
      return
    }
    usarNovoEndereco()
    setCheckoutStep('enderecoForm')
  }

  const handleConfirmarEnderecoForm = async () => {
    await confirmarNovoEndereco()
    fecharOuRevisao()
    if (!voltarParaRevisao) {
      showToast.success('Endereço salvo!')
    }
  }

  const handleCancelarEnderecoForm = () => {
    const enderecos = clienteLookup.cliente?.enderecos ?? []
    if (enderecos.length > 0) {
      setCheckoutStep('enderecos')
      return
    }
    fecharOuRevisao()
  }

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ backgroundColor: 'var(--delivery-bg)' }}>
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

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-3 pb-36 sm:space-y-5 sm:p-4">
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
              tipoEntrega={form.tipoEntrega}
              enderecoCliente={enderecoClienteSelecionado}
              enderecoEmpresaTexto={enderecoEmpresaTexto}
              onInformar={() => {
                setVoltarParaRevisao(false)
                setCheckoutStep('telefone')
              }}
              onAlterarEndereco={() => {
                setVoltarParaRevisao(false)
                handleAlterarEndereco()
              }}
              onToggleTipoEntrega={handleToggleTipoEntrega}
            />

            <div className="divide-y divide-[var(--delivery-border)]">
              {itens.map(item => (
                <DeliveryCarrinhoItemCard
                  key={item.id}
                  item={item}
                  onDecrease={() =>
                    item.quantidade <= 1
                      ? removerItem(slug, item.id)
                      : atualizarQuantidade(slug, item.id, item.quantidade - 1)
                  }
                  onIncrease={() => atualizarQuantidade(slug, item.id, item.quantidade + 1)}
                  onRemove={() => removerItem(slug, item.id)}
                  onEdit={() => setItemEditando(item)}
                  onRemoveComplemento={(complementoId, grupoComplementoId) =>
                    substituirItem(
                      slug,
                      item.id,
                      itemSemComplemento(item, complementoId, grupoComplementoId)
                    )
                  }
                />
              ))}
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
          className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t px-4 py-3"
          style={{
            backgroundColor: 'var(--delivery-surface)',
            borderColor: 'var(--delivery-border)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={voltar}
            className="flex min-h-[48px] shrink-0 items-center gap-1 rounded-xl border px-4 text-sm font-semibold uppercase"
            style={{ borderColor: 'var(--delivery-border)', color: 'var(--delivery-text-primary)' }}
          >
            ‹ Voltar
          </button>
          <button
            type="button"
            disabled={!podeContinuar}
            onClick={handleContinuarCheckout}
            className="min-h-[48px] flex-1 rounded-xl text-sm font-semibold uppercase tracking-wide disabled:opacity-50"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            Continuar
          </button>
        </div>
      ) : null}

      {checkoutStep === 'telefone' ? (
        <DeliveryCheckoutIdentifiqueSeModal
          telefone={form.telefone}
          telefonePaisIso2={form.telefonePaisIso2}
          onChangeTelefone={value => updateForm('telefone', value)}
          onChangeTelefonePais={iso2 => updateForm('telefonePaisIso2', iso2)}
          onClose={fecharOuRevisao}
          onContinuar={handleTelefoneContinuar}
        />
      ) : null}

      {checkoutStep === 'nome' ? (
        <DeliveryCheckoutNomeModal
          nome={form.nome}
          onChangeNome={value => updateForm('nome', value)}
          onClose={fecharOuRevisao}
          onVoltar={() => setCheckoutStep('telefone')}
          onContinuar={handleNomeContinuar}
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

      {checkoutStep === 'observacoes' ? (
        <DeliveryCheckoutObservacoesModal
          observacaoPedido={form.observacaoPedido}
          onChangeObservacao={value => updateForm('observacaoPedido', value)}
          onClose={fecharOuRevisao}
          onVoltar={() =>
            setCheckoutStep(voltarParaRevisao ? 'revisao' : 'pagamento')
          }
          onContinuar={handleObservacoesContinuar}
        />
      ) : null}

      {checkoutStep === 'revisao' ? (
        <DeliveryCheckoutRevisaoModal
          tipoEntrega={form.tipoEntrega}
          nome={nomeClienteExibicao}
          telefone={form.telefone}
          telefonePaisIso2={form.telefonePaisIso2}
          enderecoCliente={enderecoClienteSelecionado}
          enderecoEmpresaTexto={enderecoEmpresaTexto}
          itens={itens}
          total={total}
          meioPagamento={meioPagamentoSelecionado}
          trocoPara={form.trocoPara}
          observacaoPedido={form.observacaoPedido}
          enviando={enviando}
          onClose={() => {
            setVoltarParaRevisao(false)
            setCheckoutStep(null)
          }}
          onVoltar={() => {
            setVoltarParaRevisao(false)
            setCheckoutStep('observacoes')
          }}
          onEditarCliente={() => abrirStepDaRevisao('telefone')}
          onEditarEndereco={() => {
            setVoltarParaRevisao(true)
            handleAlterarEndereco()
          }}
          onEditarPedido={() => {
            setVoltarParaRevisao(false)
            setCheckoutStep(null)
          }}
          onEditarPagamento={() => abrirStepDaRevisao('pagamento')}
          onEditarObservacoes={() => abrirStepDaRevisao('observacoes')}
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
    </div>
  )
}
