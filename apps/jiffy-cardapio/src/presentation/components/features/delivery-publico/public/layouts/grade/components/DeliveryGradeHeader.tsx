'use client'

import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import { DeliveryPublicoMidiaImagem } from '../../../../shared/media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../../../../shared/media/deliveryPublicoImageHosts'
import { DeliveryBasicoTopNav } from '../../basico/DeliveryBasicoTopNav'

type DeliveryGradeHeaderProps = {
  config: DeliveryPublicoDesignConfig
  disponivel: boolean
  statusMensagem: string
  /** Horário complementar do dia (ex.: "até as 22:45"), igual ao Básico. */
  statusDetalheHorario?: string | null
  carrinhoQuantidade?: number
  interactive?: boolean
  onInformacoesClick?: () => void
  onPedidoClick?: () => void
  onMeuPedidoClick?: () => void
}

/**
 * Topnav igual ao Básico/Vitrine (carrinho + hamburger com carrinho,
 * informações e último pedido) + capa abaixo, sem ícone de perfil.
 */
export function DeliveryGradeHeader({
  config,
  disponivel,
  statusMensagem,
  statusDetalheHorario = null,
  carrinhoQuantidade = 0,
  interactive = false,
  onInformacoesClick,
  onPedidoClick,
  onMeuPedidoClick,
}: DeliveryGradeHeaderProps) {
  return (
    <header className="relative">
      <DeliveryBasicoTopNav
        config={config}
        carrinhoQuantidade={carrinhoQuantidade}
        disponivel={disponivel}
        statusMensagem={statusMensagem}
        statusDetalheHorario={statusDetalheHorario}
        interactive={interactive}
        onPedidoClick={onPedidoClick}
        onMeuPedidoClick={onMeuPedidoClick}
        onInformacoesClick={onInformacoesClick}
      />

      <div
        className="delivery-loja-capa delivery-grade-capa relative mt-0 h-auto w-full overflow-hidden rounded-b-[2rem] @sm:rounded-b-[2.25rem]"
        style={{ backgroundColor: 'var(--delivery-hero-bg)' }}
        role="img"
        aria-label="Capa da loja"
      >
        {config.cabecalho.capaUrl ? (
          <DeliveryPublicoMidiaImagem
            src={config.cabecalho.capaUrl}
            sizes={DELIVERY_IMAGEM_SIZES.capa}
            priority
            className="object-cover object-center"
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55"
          aria-hidden
        />
      </div>
    </header>
  )
}
