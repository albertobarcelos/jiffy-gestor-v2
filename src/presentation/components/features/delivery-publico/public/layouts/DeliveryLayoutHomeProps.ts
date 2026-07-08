import type { ComponentType } from 'react'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoViewModel } from '../../shared/types/deliveryPublicoViewModel'

export type DeliveryLayoutHomeProps = {
  config: DeliveryPublicoDesignConfig
  viewModel: DeliveryPublicoViewModel
  interactive?: boolean
  onTipoEntregaChange?: (tipo: 'entrega' | 'retirada') => void
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
  onProdutoClick?: (produtoId: string) => void
  onPedidoClick?: () => void
}

export type DeliveryLayoutHomeComponent = ComponentType<DeliveryLayoutHomeProps>
