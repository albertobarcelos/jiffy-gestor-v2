'use client'

import { useRouter } from 'next/navigation'
import { MdArrowBack } from 'react-icons/md'
import { DeliveryThemeScope } from '../../shared/components/DeliveryThemeScope'
import { DeliveryCarrinhoItemCard } from '../../shared/components/DeliveryCarrinhoItemCard'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { useDeliveryCheckout } from '../../shared/hooks/useDeliveryCheckout'
import { useDeliveryCarrinhoStore } from '../../shared/stores/deliveryCarrinhoStore'
import { DeliveryCheckoutForm } from '../components/DeliveryCheckoutForm'
import { DeliveryCheckoutFooter } from '../components/DeliveryCheckoutFooter'

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

  const {
    itens,
    total,
    form,
    updateForm,
    meiosPagamento,
    loadingMeios,
    enviando,
    enviarPedido,
  } = useDeliveryCheckout(slug)

  const voltar = () => router.push(`/cardapio/${encodeURIComponent(slug)}`)

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ backgroundColor: 'var(--delivery-bg)' }}>
      <header
        className="sticky top-0 z-10 flex flex-shrink-0 items-center gap-3 border-b px-3 py-2.5 sm:px-4 sm:py-3"
        style={{
          backgroundColor: 'var(--delivery-surface)',
          borderColor: 'var(--delivery-border)',
        }}
      >
        <button
          type="button"
          onClick={voltar}
          className="delivery-text-primary flex min-h-[44px] items-center gap-1 px-1 text-sm font-medium"
        >
          <MdArrowBack /> Voltar
        </button>
        <h1 className="delivery-font-title text-base font-bold delivery-text-primary sm:text-lg">
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
                />
              ))}
            </div>

            <DeliveryCheckoutForm
              form={form}
              meiosPagamento={meiosPagamento}
              loadingMeios={loadingMeios}
              onChange={updateForm}
            />

            <DeliveryCheckoutFooter total={total} enviando={enviando} onConfirm={enviarPedido} />
          </>
        )}
      </div>
    </div>
  )
}
