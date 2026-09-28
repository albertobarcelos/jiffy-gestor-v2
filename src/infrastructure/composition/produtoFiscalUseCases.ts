import {
  BuscarNcmCestFiscalProdutoUseCase,
  ListarNcmCestFiscalPorProdutoIdsUseCase,
} from '@/src/application/use-cases/produtos/BuscarNcmCestFiscalProdutoUseCase'
import { produtoFiscalReadRepository } from '@/src/infrastructure/api/repositories/ProdutoFiscalReadRepository'

export const buscarNcmCestFiscalProdutoUseCase = new BuscarNcmCestFiscalProdutoUseCase(
  produtoFiscalReadRepository
)

export const listarNcmCestFiscalPorProdutoIdsUseCase =
  new ListarNcmCestFiscalPorProdutoIdsUseCase(buscarNcmCestFiscalProdutoUseCase)
