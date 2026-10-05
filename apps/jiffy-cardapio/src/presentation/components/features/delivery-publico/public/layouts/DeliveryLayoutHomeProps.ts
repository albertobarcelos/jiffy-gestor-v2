import type { ComponentType, Ref } from 'react'
import type { DeliveryCarrinhoThumb } from '../../shared/components/DeliveryPedidoFooter'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoViewModel } from '../../shared/types/deliveryPublicoViewModel'

export type DeliveryLayoutHomeProps = {
  config: DeliveryPublicoDesignConfig
  viewModel: DeliveryPublicoViewModel
  /** Endereço formatado da loja (footer). */
  enderecoTexto?: string | null
  /** Telefone da loja (footer). */
  telefoneTexto?: string | null
  /** CNPJ da loja quando disponível (footer). */
  cnpjTexto?: string | null
  interactive?: boolean
  onBuscaChange?: (termo: string) => void
  onGrupoClick?: (grupoId: string) => void
  onProdutoClick?: (produtoId: string) => void
  /** Atalho "+" na lista: add direto (produtos sem complemento). */
  onProdutoAddRapido?: (produtoId: string) => void
  onPedidoClick?: () => void
  /** Abre a confirmação do último pedido deste dispositivo. */
  onMeuPedidoClick?: () => void
  /** Abre modal com dados gerais da loja (botão i). */
  onInformacoesClick?: () => void
  /** Quantidade total no carrinho por produtoId. */
  quantidadePorProduto?: Record<string, number>
  /** Miniaturas recentes do fly-to-cart (somente UI, uma por produto). */
  carrinhoThumbs?: DeliveryCarrinhoThumb[]
  carrinhoThumbsBounceKey?: number
  carrinhoThumbsTargetRef?: Ref<HTMLDivElement>
}

export type DeliveryLayoutHomeComponent = ComponentType<DeliveryLayoutHomeProps>
