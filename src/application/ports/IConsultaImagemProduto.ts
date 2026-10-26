import type { Produto } from '@/src/domain/entities/Produto'

/** Lê a foto gerenciada do produto de cadastro. */
export interface IConsultaImagemProduto {
  buscar(produtoId: string, token: string): Promise<Produto>
}
