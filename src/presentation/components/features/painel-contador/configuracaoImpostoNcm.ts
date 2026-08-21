export interface ConfiguracaoImpostoNcm {
  ncm?: {
    codigo: string
    descricao?: string
  }
  cfop?: string
  csosn?: string
  codigoBeneficioFiscal?: string
  icms?: {
    origem?: number
    cst?: string
    aliquota?: number
    reducaoBase?: number
  }
  pis?: {
    cst?: string
    aliquota?: number
  }
  cofins?: {
    cst?: string
    aliquota?: number
  }
}
