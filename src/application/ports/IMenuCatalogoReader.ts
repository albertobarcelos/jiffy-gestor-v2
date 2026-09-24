export interface IMenuCatalogoReader {
  listar(input: {
    token: string
    limit?: number
    offset?: number
  }): Promise<{ items: Array<{ id: string }> }>
}
