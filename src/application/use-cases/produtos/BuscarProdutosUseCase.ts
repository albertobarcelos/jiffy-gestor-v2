import { IProdutoRepository } from '@/src/domain/repositories/IProdutoRepository'
import { Produto } from '@/src/domain/entities/Produto'

interface BuscarProdutosParams {
  name?: string
  limit: number
  offset: number
  ativo?: boolean | null
  ativoLocal?: boolean | null
  ativoDelivery?: boolean | null
  grupoProdutoId?: string
  grupoComplementosId?: string
}

/**
 * Caso de uso: Buscar produtos
 * Orquestra a lógica de busca de produtos
 */
export class BuscarProdutosUseCase {
  constructor(private readonly produtoRepository: IProdutoRepository) {}

  /**
   * Executa a busca de produtos
   * @param params - Parâmetros de busca
   * @returns Promise com lista de produtos e total
   */
  async execute(params: BuscarProdutosParams): Promise<{
    produtos: Produto[]
    total: number
  }> {
    return this.produtoRepository.buscarProdutos(params)
  }
}

