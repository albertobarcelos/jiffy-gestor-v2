/**
 * Campos mutáveis de um Produto que podem ser enviados via PATCH para a API.
 */
export type ProdutoPatch = Partial<{
  valor: number
  ativo: boolean
  favorito: boolean
  permiteAcrescimo: boolean
  permiteDesconto: boolean
  abreComplementos: boolean
  permiteAlterarPreco: boolean
  incideTaxa: boolean
}>

/**
 * Campos booleanos do produto que têm toggle na lista.
 */
export type ToggleField =
  | 'favorito'
  | 'permiteAcrescimo'
  | 'permiteDesconto'
  | 'abreComplementos'
  | 'permiteAlterarPreco'
  | 'incideTaxa'
