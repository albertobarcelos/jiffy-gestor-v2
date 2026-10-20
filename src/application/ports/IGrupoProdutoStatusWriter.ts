export interface IGrupoProdutoStatusWriter {
  atualizarAtivo(input: {
    token: string
    grupoId: string
    ativo: boolean
  }): Promise<void>
}
