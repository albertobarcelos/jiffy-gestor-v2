import type { NcmCestFiscalLeitura } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'
import type { IProdutoFiscalReadRepository } from '@/src/domain/repositories/IProdutoFiscalReadRepository'

export class BuscarNcmCestFiscalProdutoUseCase {
  constructor(private readonly repo: IProdutoFiscalReadRepository) {}

  execute(produtoId: string, token: string): Promise<NcmCestFiscalLeitura> {
    return this.repo.buscarNcmCestFiscal(produtoId, token)
  }
}

export class ListarNcmCestFiscalPorProdutoIdsUseCase {
  constructor(private readonly buscar: BuscarNcmCestFiscalProdutoUseCase) {}

  async execute(
    produtoIds: readonly string[],
    token: string
  ): Promise<Record<string, NcmCestFiscalLeitura>> {
    const pares = await Promise.all(
      produtoIds.map(async id => [id, await this.buscar.execute(id, token)] as const)
    )
    return Object.fromEntries(pares)
  }
}
