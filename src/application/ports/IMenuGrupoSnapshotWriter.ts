export interface IMenuGrupoSnapshotWriter {
  atualizarAtivo(input: {
    token: string
    menuId: string
    grupoProdutoId: string
    ativo: boolean
  }): Promise<void>
}
