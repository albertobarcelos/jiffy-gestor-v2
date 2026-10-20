import type { IConsultaImagemProduto } from '@/src/application/ports/IConsultaImagemProduto'
import type { Produto } from '@/src/domain/entities/Produto'

export class BuscarImagemProdutoUseCase {
  constructor(private readonly consulta: IConsultaImagemProduto) {}

  execute(input: { produtoId: string; token: string }): Promise<Produto> {
    const produtoId = input.produtoId.trim()
    const token = input.token.trim()
    if (!produtoId) {
      throw new Error('Produto não identificado.')
    }
    if (!token) {
      throw new Error('Token não encontrado')
    }
    return this.consulta.buscar(produtoId, token)
  }
}
