export type DeliveryCupomLargura = 58 | 80
export type DeliveryCupomDensidade = 'compacto' | 'normal' | 'espacoso'
export type DeliveryCupomModelo = 'producao' | 'expedicao'
export type DeliveryCupomModoPapel = 'texto' | 'grafico'

export interface DeliveryCupomModeloFonteConfig {
  tamanhoFonteCabecalho: number | null
  tamanhoFontePedido: number | null
  tamanhoFonteClienteEndereco: number | null
  tamanhoFonteItens: number | null
  tamanhoFonteResumo: number | null
  tamanhoFontePagamento: number | null
  tamanhoFonteRodape: number | null
  negritoCabecalho: boolean
  negritoPedido: boolean
  negritoClienteEndereco: boolean
  negritoItens: boolean
  negritoResumo: boolean
  negritoPagamento: boolean
  negritoRodape: boolean
}

export interface DeliveryCupomTemplateConfig extends DeliveryCupomModeloFonteConfig {
  /** texto = ESC/POS nativo; grafico = foto do HTML (igual ao preview). */
  modoPapel: DeliveryCupomModoPapel
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

export const DEFAULT_FONTES_MODELO: DeliveryCupomModeloFonteConfig = {
  tamanhoFonteCabecalho: null,
  tamanhoFontePedido: null,
  tamanhoFonteClienteEndereco: null,
  tamanhoFonteItens: null,
  tamanhoFonteResumo: null,
  tamanhoFontePagamento: null,
  tamanhoFonteRodape: null,
  negritoCabecalho: true,
  negritoPedido: false,
  negritoClienteEndereco: true,
  negritoItens: true,
  negritoResumo: true,
  negritoPagamento: true,
  negritoRodape: false,
}

export const DEFAULT_FONTES_PRODUCAO: DeliveryCupomModeloFonteConfig = {
  ...DEFAULT_FONTES_MODELO,
  tamanhoFonteCabecalho: 11,
  tamanhoFonteItens: 18,
}

export const DEFAULT_FONTES_EXPEDICAO: DeliveryCupomModeloFonteConfig = {
  ...DEFAULT_FONTES_MODELO,
  tamanhoFonteCabecalho: 8,
  tamanhoFontePagamento: 17,
  tamanhoFonteRodape: 14,
}

export const DEFAULT_DELIVERY_CUPOM_TEMPLATE: DeliveryCupomTemplateConfig = {
  modoPapel: 'grafico',
  larguraMm: 80,
  margemLateralMm: 0,
  densidade: 'compacto',
  tamanhoFonteBase: 13,
  ...DEFAULT_FONTES_MODELO,
  fontesPorModelo: {
    producao: { ...DEFAULT_FONTES_PRODUCAO },
    expedicao: { ...DEFAULT_FONTES_EXPEDICAO },
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

