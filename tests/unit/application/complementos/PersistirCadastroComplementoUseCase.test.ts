import { describe, expect, it, vi } from 'vitest'
import type { ICadastroComplemento } from '@/src/application/ports/ICadastroComplemento'
import { PersistirCadastroComplementoUseCase } from '@/src/application/use-cases/complementos/PersistirCadastroComplementoUseCase'

function porta(overrides: Partial<ICadastroComplemento> = {}): ICadastroComplemento {
  return {
    buscar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    ...overrides,
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
    const useCase = new PersistirCadastroComplementoUseCase(porta({ buscar }))

    const complemento = await useCase.buscar({ id: ' comp-1 ', token: ' token ' })

    expect(complemento.getId()).toBe('comp-1')
    expect(complemento.getNome()).toBe('Bacon')
    expect(buscar).toHaveBeenCalledWith('comp-1', 'token')
  })

  it('cria e atualiza sem HTTP na tela', async () => {
    const criar = vi.fn(async () => ({ id: 'novo', nome: 'QUEIJO', valor: 2, ativo: true }))
    const atualizar = vi.fn(async () => ({ id: 'comp-1', nome: 'BACON', valor: 5, ativo: false }))
    const useCase = new PersistirCadastroComplementoUseCase(porta({ criar, atualizar }))

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
    const useCase = new PersistirCadastroComplementoUseCase(porta({ buscar }))

    await expect(useCase.buscar({ id: 'comp-1', token: '  ' })).rejects.toThrow(
      'Token não encontrado'
    )
    await expect(useCase.buscar({ id: '  ', token: 'token' })).rejects.toThrow(
      'ID do complemento é obrigatório'
    )
    expect(buscar).not.toHaveBeenCalled()
  })
})
