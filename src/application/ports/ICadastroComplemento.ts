export type DadosCadastroComplemento = {
  nome?: string
  descricao?: string
  valor?: number
  ativo?: boolean
  tipoImpactoPreco?: string
}

/**
 * Cadastro do complemento (modelo). Não grava override de cardápio.
 */
export interface ICadastroComplemento {
  buscar(id: string, token: string): Promise<unknown>
  criar(dados: DadosCadastroComplemento, token: string): Promise<unknown>
  atualizar(id: string, dados: DadosCadastroComplemento, token: string): Promise<unknown>
}
