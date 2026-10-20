import type { IRemocaoImagem } from '@/src/application/ports/IRemocaoImagem'
import { deleteImagem } from '@/src/infrastructure/api/deliveryMediaApi'

export const remocaoImagemMedia: IRemocaoImagem = {
  remover: deleteImagem,
}
