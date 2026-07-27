import type { ComponentType, Ref } from 'react'
import type { DeliveryCarrinhoThumb } from '../../shared/components/DeliveryPedidoFooter'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoViewModel } from '../../shared/types/deliveryPublicoViewModel'

export type DeliveryLayoutHomeProps = {
  config: DeliveryPublicoDesignConfig
  viewModel: DeliveryPublicoViewModel
  /** Endereço formatado da loja (footer do layout Vitrine). */
  enderecoTexto?: string | null
  interactive?: boolean
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
  onProdutoClick?: (produtoId: string) => void
  onPedidoClick?: () => void
  /** Miniaturas recentes do fly-to-cart (somente UI, uma por produto). */
  carrinhoThumbs?: DeliveryCarrinhoThumb[]
  carrinhoThumbsBounceKey?: number
  carrinhoThumbsTargetRef?: Ref<HTMLDivElement>
}

export type DeliveryLayoutHomeComponent = ComponentType<DeliveryLayoutHomeProps>
