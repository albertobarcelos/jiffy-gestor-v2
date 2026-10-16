import { describe, expect, it, vi } from 'vitest'
import type { IRemocaoImagem } from '@/src/application/ports/IRemocaoImagem'
import { RemoverImagemUseCase } from '@/src/application/use-cases/media/RemoverImagemUseCase'

function porta(remover: IRemocaoImagem['remover']): IRemocaoImagem {
  return { remover }
}

describe('RemoverImagemUseCase', () => {
  it('devolve removida quando a porta confirma o delete', async () => {
    const remover = vi.fn(async () => 'removida' as const)
    const resultado = await new RemoverImagemUseCase(porta(remover)).execute({
      imageId: ' img-1 ',
      token: ' token ',
    })

    expect(resultado).toBe('removida')
    expect(remover).toHaveBeenCalledWith('img-1', 'token')
  })

  it('devolve ja-ausente quando a imagem já não está ativa', async () => {
    const remover = vi.fn(async () => 'ja-ausente' as const)
    const resultado = await new RemoverImagemUseCase(porta(remover)).execute({
      imageId: 'img-2',
      token: 'token',
    })

    expect(resultado).toBe('ja-ausente')
  })

  it('propaga erro de permissão para a tela manter a foto', async () => {
    const remover = vi.fn(async () => {
      throw new Error('Você não tem permissão para remover esta imagem.')
    })

    await expect(
      new RemoverImagemUseCase(porta(remover)).execute({
        imageId: 'img-3',
        token: 'token',
      })
    ).rejects.toThrow('Você não tem permissão para remover esta imagem.')
  })

  it('não chama a porta sem imageId', async () => {
    const remover = vi.fn()
    await expect(
      new RemoverImagemUseCase(porta(remover)).execute({
        imageId: '  ',
        token: 'token',
      })
    ).rejects.toThrow('Não foi possível identificar a imagem para remover.')
    expect(remover).not.toHaveBeenCalled()
  })
})
