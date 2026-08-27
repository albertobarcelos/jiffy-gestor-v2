export type RegraPrecoMultiplosSabores = 'proporcional' | 'maior'

export type TipoImpactoPreco = 'nenhum' | 'aumenta' | 'diminui'

export interface PizzaPaginationParams {
  q?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
}

export interface PizzaPaginatedResponse<T> {
  items: T[]
  count: number
  page?: number
  limit?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export interface CategoriaPizza {
  id: string
  nome: string
  ordem: number
  corHex: string
  iconName: string
  ativoDelivery: boolean
  ativoLocal: boolean
  ativo: boolean
  imagemUrl?: string | null
  dataCriacao: string
  dataAtualizacao: string
}

export interface GrupoPizzaConfigInput {
  menuId?: string | null
  regraPrecoMultiplosSabores?: RegraPrecoMultiplosSabores
  imprimir?: boolean
  permiteDesconto?: boolean
  permiteAcrescimo?: boolean
  ativo?: boolean
}

export interface PizzaTamanho {
  id: string
  grupoPizzaConfigId: string
  nome: string
  quantidadePedacos: number
  quantidadeMaximaDivisoes: number
  ativo: boolean
  dataCriacao: string
  dataAtualizacao: string
}

export interface PizzaTamanhoInput {
  nome: string
  quantidadePedacos: number
  quantidadeMaximaDivisoes: number
  ativo?: boolean
}

export interface PrecoSaborTamanho {
  pizzaTamanhoId: string
  nome: string
  precoCheio: number
}

export interface PrecoSaborTamanhoInput {
  pizzaTamanhoId: string
  precoCheio: number
}

export interface SaborPizzaSummary {
  id: string
  nome: string
  descricao: string | null
  imagemUrl: string | null
  ativo: boolean
  ordem: number
  categoriaPizzaId: string
  dataCriacao: string
  dataAtualizacao: string
}

export interface SaborPizza extends SaborPizzaSummary {
  precosTamanho: PrecoSaborTamanho[]
}

export interface MassaPizzaInput {
  nome: string
  descricao?: string | null
  valor: number
  tipoImpactoPreco?: TipoImpactoPreco
  ativo?: boolean
}

export interface BordaPizzaInput {
  nome: string
  descricao?: string | null
  valor: number
  tipoImpactoPreco?: TipoImpactoPreco
  ativo?: boolean
}

export interface GrupoMassasPizzaNestedInput {
  nome: string
  massas: MassaPizzaInput[]
  obrigatorio?: boolean
  qtdMinima?: number
  qtdMaxima?: number
  ordem?: number
  ativo?: boolean
}

export interface GrupoBordasPizzaNestedInput {
  nome: string
  bordas: BordaPizzaInput[]
  obrigatorio?: boolean
  qtdMinima?: number
  qtdMaxima?: number
  ordem?: number
  ativo?: boolean
}

export interface CreateCategoriaPizzaInput {
  nome: string
  ativo?: boolean | null
  imagemUrl?: string | null
  corHex?: string
  iconName?: string
}

export interface CreateCategoriaPizzaCompletoInput {
  nome: string
  ativo?: boolean | null
  imagemUrl?: string | null
  corHex?: string
  iconName?: string
  config?: GrupoPizzaConfigInput
  tamanhos?: PizzaTamanhoInput[]
  sabores?: Array<{
    nome: string
    descricao?: string | null
    imagemUrl?: string | null
    ativo?: boolean
    precosTamanho?: Array<{ nome: string; precoCheio: number }>
  }>
  gruposBordas?: GrupoBordasPizzaNestedInput[]
  gruposMassas?: GrupoMassasPizzaNestedInput[]
}

export interface CategoriaPizzaCompletoResponse {
  categoria: CategoriaPizza
  tamanhos: PizzaTamanho[]
  sabores: SaborPizza[]
  gruposBordas: Array<{
    id: string
    nome: string
    bordas: Array<{
      id: string
      nome: string
      valor: number
      ativo: boolean
    }>
  }>
  gruposMassas: Array<{
    id: string
    nome: string
    massas: Array<{
      id: string
      nome: string
      valor: number
      ativo: boolean
    }>
  }>
}

export interface CreateSaborPizzaInput {
  nome: string
  descricao?: string | null
  imagemUrl?: string | null
  ativo?: boolean
  categoriaPizzaId: string
  precosTamanho?: PrecoSaborTamanhoInput[]
}

export interface UpdateSaborPizzaInput {
  nome?: string
  descricao?: string | null
  imagemUrl?: string | null
  ativo?: boolean
  precosTamanho?: PrecoSaborTamanhoInput[]
}
