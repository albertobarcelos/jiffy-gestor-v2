import { BuscarImagemProdutoUseCase } from '@/src/application/use-cases/produtos/BuscarImagemProdutoUseCase'
import { RemoverImagemUseCase } from '@/src/application/use-cases/media/RemoverImagemUseCase'
import { consultaImagemProduto } from '@/src/infrastructure/api/consultaImagemProduto'
import { remocaoImagemMedia } from '@/src/infrastructure/api/remocaoImagemMedia'

export function removerImagemUseCase(): RemoverImagemUseCase {
  return new RemoverImagemUseCase(remocaoImagemMedia)
}

export function buscarImagemProdutoUseCase(): BuscarImagemProdutoUseCase {
  return new BuscarImagemProdutoUseCase(consultaImagemProduto)
}
