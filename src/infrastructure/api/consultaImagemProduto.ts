import type { IConsultaImagemProduto } from '@/src/application/ports/IConsultaImagemProduto'
import { Produto } from '@/src/domain/entities/Produto'
import { fetchProdutoImagemGerenciada } from '@/src/infrastructure/api/deliveryMediaApi'

export const consultaImagemProduto: IConsultaImagemProduto = {
  async buscar(produtoId, token) {
    const imagem = await fetchProdutoImagemGerenciada(produtoId, token)
    return Produto.fromJSON({
      id: produtoId,
      nome: 'Produto',
      valor: 0,
      ativo: true,
      imagemUrl: imagem.imageUrl,
      imageId: imagem.imageId,
      image:
        imagem.imageId || imagem.imageUrl
          ? { imageId: imagem.imageId, imageUrl: imagem.imageUrl }
          : null,
    })
  },
}
