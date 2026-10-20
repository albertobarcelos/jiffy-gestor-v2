export type DadosCadastroComplemento = {
  nome?: string
  descricao?: string
  valor?: number
  ativo?: boolean
  tipoImpactoPreco?: string
}

export type FiltroListaComplemento = {
  q?: string
  ativo?: boolean | null
  limit: number
  offset: number
}

export type ListaCadastroComplemento = {
  items: unknown[]
  count: number
}

/**
 * Cadastro do complemento (modelo). Não grava override de cardápio.
 */
export interface ICadastroComplemento {
  listar(filtro: FiltroListaComplemento, token: string): Promise<ListaCadastroComplemento>
  buscar(id: string, token: string): Promise<unknown>
  criar(dados: DadosCadastroComplemento, token: string): Promise<unknown>
  atualizar(id: string, dados: DadosCadastroComplemento, token: string): Promise<unknown>
}
