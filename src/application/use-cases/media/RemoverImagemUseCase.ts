import type {
  IRemocaoImagem,
  ResultadoRemocaoImagem,
} from '@/src/application/ports/IRemocaoImagem'

export type RemoverImagemInput = {
  imageId: string
  token: string
}

export class RemoverImagemUseCase {
  constructor(private readonly remocao: IRemocaoImagem) {}

  async execute(input: RemoverImagemInput): Promise<ResultadoRemocaoImagem> {
    const imageId = input.imageId.trim()
    const token = input.token.trim()
    if (!imageId) {
      throw new Error('Não foi possível identificar a imagem para remover.')
    }
    if (!token) {
      throw new Error('Token não encontrado')
    }
    return this.remocao.remover(imageId, token)
  }
}
