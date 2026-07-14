'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack } from 'react-icons/md'
import {
  flattenCatalogoGrupos,
  useAutoFetchCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryThemeScope } from '../../shared/components/DeliveryThemeScope'
import { DeliveryCarrinhoItemCard } from '../../shared/components/DeliveryCarrinhoItemCard'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { useDeliveryCheckout } from '../../shared/hooks/useDeliveryCheckout'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../shared/stores/deliveryCarrinhoStore'
import { findCatalogoProdutoById } from '../../shared/utils/findCatalogoProdutoById'
import { itemSemComplemento } from '../../shared/utils/deliveryCarrinhoItemUtils'
import { DeliveryCheckoutForm } from '../components/DeliveryCheckoutForm'
import { DeliveryCheckoutFooter } from '../components/DeliveryCheckoutFooter'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'

type DeliveryPublicoCarrinhoScreenProps = {
  slug: string
}

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

  const {
    itens,
    total,
    form,
    updateForm,
    clienteLookup,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    consultarTelefoneAtual,
    meiosPagamento,
    loadingMeios,
    enviando,
    enviarPedido,
  } = useDeliveryCheckout(slug)

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug, Boolean(itemEditando))
  useAutoFetchCatalogoGrupos(catalogQuery)

  const grupos = useMemo(
    () => (catalogQuery.data?.pages ? flattenCatalogoGrupos(catalogQuery.data.pages) : []),
    [catalogQuery.data?.pages]
  )

  const produtoEdicao = useMemo(() => {
    if (!itemEditando) return null
    return findCatalogoProdutoById(grupos, itemEditando.produtoId)
  }, [itemEditando, grupos])

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

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ backgroundColor: 'var(--delivery-bg)' }}>
      <header
        className="sticky top-0 z-10 flex flex-col flex-shrink-0 items-start px-3 py-2.5 sm:px-4 sm:py-3"
        style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
      >
        <button
          type="button"
          onClick={voltar}
          className="flex items-start gap-1 px-1 text-sm font-medium text-white"
        >
          <MdArrowBack /> Voltar
        </button>
        <h1 className="w-full delivery-font-title text-xl font-semibold text-white sm:text-2xl text-center">
          Seu pedido
        </h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-3 pb-32 sm:space-y-6 sm:p-4 sm:pb-6">
        {itens.length === 0 ? (
          <div className="py-16 text-center">
            <p className="delivery-text-muted">Carrinho vazio</p>
            <DeliveryButton onClick={voltar} className="mt-4 px-6 py-2">
              Ver cardápio
            </DeliveryButton>
          </div>
        ) : (
          <>
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

            <DeliveryCheckoutForm
              form={form}
              clienteLookup={clienteLookup}
              meiosPagamento={meiosPagamento}
              loadingMeios={loadingMeios}
              onChange={updateForm}
              onSelecionarEnderecoExistente={selecionarEnderecoExistente}
              onUsarNovoEndereco={usarNovoEndereco}
              onTelefoneBlur={consultarTelefoneAtual}
            />

            <DeliveryCheckoutFooter
              total={total}
              enviando={enviando}
              onConfirm={enviarPedido}
            />
          </>
        )}
      </div>

      {carregandoEdicao ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
