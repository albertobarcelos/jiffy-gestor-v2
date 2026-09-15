'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryCheckoutRevisaoModal } from '../components/checkout/DeliveryCheckoutRevisaoModal'
import { DeliveryCheckoutShell } from '../components/checkout/DeliveryCheckoutShell'
import { DeliveryCheckoutSucessoModal } from '../components/checkout/DeliveryCheckoutSucessoModal'
import { DeliveryPublicoShell } from '../components/DeliveryPublicoShell'
import { DeliveryThemeScope } from '../../shared/components/DeliveryThemeScope'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { deliveryPublicoHomePath } from '../../shared/utils/deliveryPublicoRoutes'
import {
  lerPedidoPublicoConfirmado,
  type PedidoPublicoConfirmadoPersistido,
} from '../../shared/utils/pedidoConfirmadoStorage'

type View = 'sucesso' | 'pedidoDetalhe'

type DeliveryPublicoPedidoConfirmadoScreenProps = {
  slug: string
  codigo: string
}

export function DeliveryPublicoPedidoConfirmadoScreen({
  slug,
  codigo,
}: DeliveryPublicoPedidoConfirmadoScreenProps) {
  const router = useRouter()
  const [persistido, setPersistido] = useState<PedidoPublicoConfirmadoPersistido | null | undefined>(
    undefined
  )
  const [view, setView] = useState<View>('sucesso')
  const [direction, setDirection] = useState<1 | -1>(1)
  const interacaoLiberadaRef = useRef(false)

  useEffect(() => {
    setPersistido(lerPedidoPublicoConfirmado(slug, codigo))
  }, [slug, codigo])

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
  }, [slug, codigo])

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

  if (persistido === undefined) {
    return (
      <DeliveryThemeScope slug={slug}>
        <DeliveryPublicoShell>
          <div className="flex min-h-screen items-center justify-center">
            <div
              className="h-12 w-12 animate-spin rounded-full border-b-2"
              style={{ borderColor: 'var(--delivery-primary, #333)' }}
              aria-hidden
            />
          </div>
        </DeliveryPublicoShell>
      </DeliveryThemeScope>
    )
  }

  if (!persistido) {
    return (
      <DeliveryThemeScope slug={slug}>
        <DeliveryPublicoShell>
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
            <h1 className="delivery-font-title text-xl font-semibold delivery-text-primary">
              Pedido não encontrado
            </h1>
            <p className="text-sm delivery-text-secondary">
              Não há dados deste pedido neste dispositivo. A confirmação fica disponível após
              finalizar o pedido neste navegador.
            </p>
            <DeliveryButton type="button" onClick={irParaCardapio}>
              Voltar ao cardápio
            </DeliveryButton>
          </div>
        </DeliveryPublicoShell>
      </DeliveryThemeScope>
    )
  }

  const { snapshot, meta } = persistido

  return (
    <DeliveryThemeScope slug={slug} nomeExibicaoFallback={meta.nomeEmpresa ?? ''}>
      <DeliveryPublicoShell>
        <div
          className="min-h-screen"
          style={{ backgroundColor: 'var(--delivery-bg)' }}
        >
          <DeliveryCheckoutShell
            open
            stepKey={view}
            direction={direction}
            onClose={view === 'pedidoDetalhe' ? voltarSucesso : irParaCardapio}
          >
            {view === 'sucesso' ? (
              <DeliveryCheckoutSucessoModal
                nomeCliente={snapshot.nome}
                tipoEntrega={snapshot.tipoEntrega}
                modoTempo={snapshot.modoTempo}
                enderecoCliente={snapshot.enderecoCliente}
                enderecoEmpresaTexto={snapshot.enderecoEmpresaTexto}
                localizacaoEmpresa={meta.localizacaoEmpresa}
                telefoneEmpresa={meta.telefoneEmpresa}
                nomeEmpresa={meta.nomeEmpresa}
                codigoVenda={snapshot.codigoVenda}
                onVerPedido={irParaDetalhe}
                onVoltarAoCardapio={irParaCardapio}
              />
            ) : (
              <DeliveryCheckoutRevisaoModal
                modo="somenteLeitura"
                tipoEntrega={snapshot.tipoEntrega}
                nome={snapshot.nome}
                telefone={snapshot.telefone}
                telefonePaisIso2={snapshot.telefonePaisIso2}
                enderecoCliente={snapshot.enderecoCliente}
                enderecoEmpresaTexto={snapshot.enderecoEmpresaTexto}
                localizacaoEmpresa={meta.localizacaoEmpresa}
                itens={snapshot.itens}
                total={snapshot.total}
                pagamentos={snapshot.pagamentos}
                observacaoPedido={snapshot.observacaoPedido}
                cpfNotaFiscal={snapshot.cpfNotaFiscal}
                codigoVenda={snapshot.codigoVenda}
                onVoltar={voltarSucesso}
              />
            )}
          </DeliveryCheckoutShell>
        </div>
      </DeliveryPublicoShell>
    </DeliveryThemeScope>
  )
}
