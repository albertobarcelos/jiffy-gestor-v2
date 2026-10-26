export type ResultadoRemocaoImagem = 'removida' | 'ja-ausente'

/**
 * Remove uma imagem já confirmada.
 * 401/403 sobem como erro para a tela manter a foto.
 */
export interface IRemocaoImagem {
  remover(imageId: string, token: string): Promise<ResultadoRemocaoImagem>
}
