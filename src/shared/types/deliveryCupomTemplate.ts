export type DeliveryCupomLargura = 58 | 80
export type DeliveryCupomDensidade = 'compacto' | 'normal' | 'espacoso'
export type DeliveryCupomModelo = 'producao' | 'expedicao'

export interface DeliveryCupomModeloFonteConfig {
  tamanhoFonteCabecalho: number | null
  tamanhoFontePedido: number | null
  tamanhoFonteClienteEndereco: number | null
  tamanhoFonteItens: number | null
  tamanhoFonteResumo: number | null
  tamanhoFontePagamento: number | null
  tamanhoFonteRodape: number | null
}

export interface DeliveryCupomTemplateConfig extends DeliveryCupomModeloFonteConfig {
  larguraMm: DeliveryCupomLargura
  /** Margem lateral (mm) aplicada nas duas laterais do cupom — ajuste fino para evitar corte na borda imprimível. */
  margemLateralMm: number
  densidade: DeliveryCupomDensidade
  tamanhoFonteBase: number
  fontesPorModelo: Record<DeliveryCupomModelo, DeliveryCupomModeloFonteConfig>
  destacarProdutos: boolean
  mostrarLogoTexto: boolean
  mostrarTelefoneCliente: boolean
  mostrarEnderecoEntrega: boolean
  mostrarValores: boolean
  mostrarObservacaoPedido: boolean
  mostrarDataHora: boolean
  cabecalhoExtra: string
  rodapeExtra: string
}

export const DELIVERY_CUPOM_MARGEM_LATERAL_MAX_MM = 10

export const DEFAULT_DELIVERY_CUPOM_TEMPLATE: DeliveryCupomTemplateConfig = {
  larguraMm: 80,
  margemLateralMm: 0,
  densidade: 'normal',
  tamanhoFonteBase: 13,
  tamanhoFonteCabecalho: null,
  tamanhoFontePedido: null,
  tamanhoFonteClienteEndereco: null,
  tamanhoFonteItens: null,
  tamanhoFonteResumo: null,
  tamanhoFontePagamento: null,
  tamanhoFonteRodape: null,
  fontesPorModelo: {
    producao: {
      tamanhoFonteCabecalho: null,
      tamanhoFontePedido: null,
      tamanhoFonteClienteEndereco: null,
      tamanhoFonteItens: null,
      tamanhoFonteResumo: null,
      tamanhoFontePagamento: null,
      tamanhoFonteRodape: null,
    },
    expedicao: {
      tamanhoFonteCabecalho: null,
      tamanhoFontePedido: null,
      tamanhoFonteClienteEndereco: null,
      tamanhoFonteItens: null,
      tamanhoFonteResumo: null,
      tamanhoFontePagamento: null,
      tamanhoFonteRodape: null,
    },
  },
  destacarProdutos: true,
  mostrarLogoTexto: true,
  mostrarTelefoneCliente: true,
  mostrarEnderecoEntrega: true,
  mostrarValores: true,
  mostrarObservacaoPedido: true,
  mostrarDataHora: true,
  cabecalhoExtra: '',
  rodapeExtra: '',
}

