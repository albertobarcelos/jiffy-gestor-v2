import { CatalogoProdutoIndexRepository } from '@/src/infrastructure/api/repositories/CatalogoProdutoIndexRepository'
import type { CatalogoProdutoListaIndex } from '@/src/shared/utils/menuProdutoPermissoes'

export class BuscarCatalogoProdutoIndexUseCase {
  constructor(private readonly repository = new CatalogoProdutoIndexRepository()) {}

  execute(token: string): Promise<CatalogoProdutoListaIndex> {
    return this.repository.carregarIndex(token)
  }
}

export const buscarCatalogoProdutoIndexUseCase = new BuscarCatalogoProdutoIndexUseCase()
