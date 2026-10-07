'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryCheckoutRevisaoModal } from '../components/checkout/DeliveryCheckoutRevisaoModal'
import { DeliveryCheckoutShell } from '../components/checkout/DeliveryCheckoutShell'
import { DeliveryCheckoutSucessoModal } from '../components/checkout/DeliveryCheckoutSucessoModal'
import { DeliveryThemeScope } from '../../shared/components/DeliveryThemeScope'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { usePedidoDeliveryPublico } from '@/src/presentation/hooks/usePedidoDeliveryPublico'
import { usePublicDeliveryCatalogInfinite } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import {
  DeliveryWhatsAppFab,
  telefoneWhatsAppCanalConectado,
} from '../../shared/components/DeliveryWhatsAppFab'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '@/src/shared/constants/deliveryPaisesTelefone'
import {
  deliveryPublicoHomePath,
  deliveryPublicoPedidoPath,
} from '../../shared/utils/deliveryPublicoRoutes'

type View = 'sucesso' | 'pedidoDetalhe'

type DeliveryPublicoPedidoConfirmadoScreenProps = {
  slug: string
  pedidoId: string
}

export function DeliveryPublicoPedidoConfirmadoScreen({
  slug,
  pedidoId,
}: DeliveryPublicoPedidoConfirmadoScreenProps) {
  const router = useRouter()
  const { pedido, status, mensagemErro } = usePedidoDeliveryPublico(pedidoId)
  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  const telefoneWhatsApp = telefoneWhatsAppCanalConectado(
    catalogQuery.data?.pages[0]?.canalWhatsApp
  )
  const [view, setView] = useState<View>('sucesso')
  const [direction, setDirection] = useState<1 | -1>(1)
  const interacaoLiberadaRef = useRef(false)

  useEffect(() => {
    interacaoLiberadaRef.current = false
    const unlockTimer = window.setTimeout(() => {
      interacaoLiberadaRef.current = true
    }, 500)

    const bloquearCliqueFantasma = (event: MouseEvent) => {
      if (interacaoLiberadaRef.current) return
      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('click', bloquearCliqueFantasma, true)
    return () => {
      window.clearTimeout(unlockTimer)
      document.removeEventListener('click', bloquearCliqueFantasma, true)
    }
  }, [slug, pedidoId])

  useEffect(() => {
    if (status !== 'ready' || !pedido) return
    const slugPedido = pedido.slug.trim().toLowerCase()
    const slugRota = slug.trim().toLowerCase()
    if (!slugPedido || slugPedido === slugRota) return
    router.replace(deliveryPublicoPedidoPath(pedido.slug, pedido.id))
  }, [pedido, router, slug, status])

  const irParaCardapio = useCallback(() => {
    if (!interacaoLiberadaRef.current) return
    router.push(deliveryPublicoHomePath(slug))
  }, [router, slug])

  const irParaDetalhe = () => {
    setDirection(1)
    setView('pedidoDetalhe')
  }

  const voltarSucesso = () => {
    setDirection(-1)
    setView('sucesso')
  }

  if (status === 'loading') {
    return (
      <DeliveryThemeScope slug={slug}>
        <div className="flex h-full items-center justify-center">
          <div
            className="h-12 w-12 animate-spin rounded-full border-b-2"
            style={{ borderColor: 'var(--delivery-primary, #333)' }}
            aria-hidden
          />
        </div>
      </DeliveryThemeScope>
    )
  }

  if (status !== 'ready' || !pedido) {
    const titulo = status === 'not_found' ? 'Pedido não encontrado' : 'Não foi possível abrir o pedido'
    const descricao =
      status === 'not_found'
        ? 'Este pedido não está disponível.'
        : mensagemErro || 'Tente novamente em instantes.'

    return (
      <DeliveryThemeScope slug={slug}>
        <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="delivery-font-title text-xl font-semibold delivery-text-primary">
            {titulo}
          </h1>
          <p className="text-sm delivery-text-secondary">{descricao}</p>
          <DeliveryButton type="button" onClick={irParaCardapio}>
            Voltar ao cardápio
          </DeliveryButton>
        </div>
      </DeliveryThemeScope>
    )
  }

  return (
    <DeliveryThemeScope slug={slug} nomeExibicaoFallback={pedido.nomeEmpresa ?? ''}>
      <DeliveryCheckoutShell
        open
        presentation="page"
        stepKey={view}
        direction={direction}
        onClose={view === 'pedidoDetalhe' ? voltarSucesso : irParaCardapio}
      >
        {view === 'sucesso' ? (
          <DeliveryCheckoutSucessoModal
            nomeCliente={pedido.nome}
            tipoEntrega={pedido.tipoEntrega}
            modoTempo="imediato"
            enderecoCliente={pedido.enderecoCliente}
            enderecoEmpresaTexto={pedido.enderecoEmpresaTexto}
            localizacaoEmpresa={pedido.localizacaoEmpresa}
            codigoVenda={pedido.codigoVenda}
            statusDelivery={pedido.statusDelivery}
            canalWhatsAppAtivo={catalogQuery.data?.pages[0]?.canalWhatsApp?.conectado === true}
            onVerPedido={irParaDetalhe}
            onVoltarAoCardapio={irParaCardapio}
          />
        ) : (
          <DeliveryCheckoutRevisaoModal
            modo="somenteLeitura"
            tipoEntrega={pedido.tipoEntrega}
            nome={pedido.nome}
            telefone={pedido.telefone}
            telefonePaisIso2={DELIVERY_PAIS_TELEFONE_PADRAO}
            enderecoCliente={pedido.enderecoCliente}
            enderecoEmpresaTexto={pedido.enderecoEmpresaTexto}
            localizacaoEmpresa={pedido.localizacaoEmpresa}
            itens={pedido.itens}
            total={pedido.total}
            subtotalOficial={pedido.subtotal}
            taxaEntregaOficial={pedido.taxaEntrega}
            totalOficial={pedido.total}
            trocoOficial={pedido.troco}
            pagamentos={pedido.pagamentos}
            observacaoPedido={pedido.observacaoPedido}
            cpfNotaFiscal={pedido.cpfNotaFiscal}
            codigoVenda={pedido.codigoVenda}
            onVoltar={voltarSucesso}
          />
        )}
      </DeliveryCheckoutShell>
      <DeliveryWhatsAppFab
        telefone={telefoneWhatsApp}
        nomeLoja={pedido.nomeEmpresa}
        visible={view === 'sucesso'}
        bottomOffset="8rem"
      />
    </DeliveryThemeScope>
  )
}
