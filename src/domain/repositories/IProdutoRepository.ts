import { Produto } from '../entities/Produto'

/**
 * Interface do repositório de produtos
 * Seguindo o princípio de Dependency Inversion
 */
export interface IProdutoRepository {
  /**
   * Busca produtos com paginação, filtro e busca
   * @param params - Parâmetros de busca
   * @returns Promise com lista de produtos e total
   */
  buscarProdutos(params: {
    name?: string
    limit: number
    offset: number
    ativo?: boolean | null
  }): Promise<{ produtos: Produto[]; total: number }>

  /**
   * Busca um produto por ID
   * @param id - ID do produto
   * @returns Promise com o produto ou null
   */
  buscarProdutoPorId(id: string): Promise<Produto | null>

  /**
   * Atualiza o status (ativo/desativado) de um produto
   * @param id - ID do produto
   * @param ativo - Novo status
   * @returns Promise com o produto atualizado
   */
  atualizarStatus(id: string, ativo: boolean): Promise<Produto>
}

