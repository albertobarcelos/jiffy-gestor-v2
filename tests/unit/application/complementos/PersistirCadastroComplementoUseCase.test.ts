import { describe, expect, it, vi } from 'vitest'
import type { ICadastroComplemento } from '@/src/application/ports/ICadastroComplemento'
import type { ICadastroImagemMedia } from '@/src/application/ports/ICadastroImagemMedia'
import { PersistirCadastroComplementoUseCase } from '@/src/application/use-cases/complementos/PersistirCadastroComplementoUseCase'

function porta(overrides: Partial<ICadastroComplemento> = {}): ICadastroComplemento {
  return {
    listar: vi.fn(),
    buscar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    ...overrides,
  }
}

function media(conhecida: Record<string, string> = {}): ICadastroImagemMedia {
  return {
    resolverLote: vi.fn(async () => ({})),
    resolverUma: vi.fn(async () => null),
    resolverDoCadastro: vi.fn(async () => ({})),
    enviar: vi.fn(async () => null),
    lembrar: vi.fn((id, url) => url ?? null),
    conhecida: vi.fn(id => conhecida[id] ?? null),
  }
}

describe('PersistirCadastroComplementoUseCase', () => {
  it('hidrata o cadastro buscado', async () => {
    const buscar = vi.fn(async () => ({
      id: 'comp-1',
      nome: 'Bacon',
      valor: 4,
      ativo: true,
    }))
    const useCase = new PersistirCadastroComplementoUseCase(porta({ buscar }), media())

    const complemento = await useCase.buscar({ id: ' comp-1 ', token: ' token ' })

    expect(complemento.getId()).toBe('comp-1')
    expect(complemento.getNome()).toBe('Bacon')
    expect(buscar).toHaveBeenCalledWith('comp-1', 'token')
  })

  it('cria e atualiza sem HTTP na tela', async () => {
    const criar = vi.fn(async () => ({ id: 'novo', nome: 'QUEIJO', valor: 2, ativo: true }))
    const atualizar = vi.fn(async () => ({ id: 'comp-1', nome: 'BACON', valor: 5, ativo: false }))
    const useCase = new PersistirCadastroComplementoUseCase(porta({ criar, atualizar }), media())

    const criado = await useCase.criar({
      token: 'token',
      dados: { nome: 'QUEIJO', valor: 2, ativo: true },
    })
    const atualizado = await useCase.atualizar({
      token: 'token',
      id: 'comp-1',
      dados: { valor: 5, ativo: false },
    })

    expect(criado.getId()).toBe('novo')
    expect(atualizado.getValor()).toBe(5)
    expect(atualizado.isAtivo()).toBe(false)
  })

  it('não chama a porta sem token ou id', async () => {
    const buscar = vi.fn()
    const useCase = new PersistirCadastroComplementoUseCase(porta({ buscar }), media())

    await expect(useCase.buscar({ id: 'comp-1', token: '  ' })).rejects.toThrow(
      'Token não encontrado'
    )
    await expect(useCase.buscar({ id: '  ', token: 'token' })).rejects.toThrow(
      'ID do complemento é obrigatório'
    )
    expect(buscar).not.toHaveBeenCalled()
  })

  it('lista cadastro com limite e sem item sem id', async () => {
    const listar = vi.fn(async () => ({
      items: [
        { id: 'comp-1', nome: 'Bacon', valor: 4, ativo: true },
        { nome: 'sem-id', valor: 1, ativo: true },
      ],
      count: 2,
    }))
    const useCase = new PersistirCadastroComplementoUseCase(porta({ listar }), media())

    const resultado = await useCase.listar({
      token: ' token ',
      q: ' bac ',
      ativo: true,
      limit: 5000,
      offset: -3,
    })

    expect(resultado.total).toBe(2)
    expect(resultado.complementos.map(item => item.getId())).toEqual(['comp-1'])
    expect(listar).toHaveBeenCalledWith(
      { q: 'bac', ativo: true, limit: 2000, offset: 0 },
      'token'
    )
  })

  it('reaplica foto conhecida quando o cadastro vem sem URL', async () => {
    const listar = vi.fn(async () => ({
      items: [{ id: 'comp-1', nome: 'Bacon', valor: 4, ativo: true }],
      count: 1,
    }))
    const useCase = new PersistirCadastroComplementoUseCase(
      porta({ listar }),
      media({ 'comp-1': 'https://cdn.example/bacon.jpg' })
    )

    const { complementos } = await useCase.listar({ token: 'token' })

    expect(complementos[0]?.getImagemUrl()).toBe('https://cdn.example/bacon.jpg')
  })
})
