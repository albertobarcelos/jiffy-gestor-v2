import { describe, expect, it, vi } from 'vitest'
import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'
import { BuscarComplementoCompletoGestorUseCase } from '@/src/application/use-cases/complementos/BuscarComplementoCompletoGestorUseCase'
import { GravarOverridesComplementoGestorUseCase } from '@/src/application/use-cases/complementos/GravarOverridesComplementoGestorUseCase'
import { ListarUsosParaPropagarComplementoUseCase } from '@/src/application/use-cases/complementos/ListarUsosParaPropagarComplementoUseCase'
import type { ComplementoCompleto, ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'

function uso(parcial: {
  menuProdutoId: string
  menuId: string
  produtoId: string
  grupoId: string
}): ComplementoUsoNoMenu {
  return {
    menuProdutoId: parcial.menuProdutoId,
    menu: { id: parcial.menuId, nome: parcial.menuId, ativo: true },
    produto: { id: parcial.produtoId, nome: parcial.produtoId, ativo: true },
    grupoProduto: { id: 'gp', nome: 'Lanches' },
    grupoComplementos: { id: parcial.grupoId, nome: parcial.grupoId },
    complementoConfig: { ordem: 1, valor: 2, ativo: true },
  }
}

function completo(vinculos: ComplementoUsoNoMenu[]): ComplementoCompleto {
  return { id: 'comp-1', nome: 'Bacon', vinculos, grupos: [] }
}

function porta(overrides: Partial<IPropagacaoComplemento> = {}): IPropagacaoComplemento {
  return {
    buscarCompleto: vi.fn(),
    gravarOverrides: vi.fn().mockResolvedValue({ message: 'ok', atualizados: 1 }),
    ...overrides,
  }
}

describe('BuscarComplementoCompletoGestorUseCase', () => {
  it('valida e normaliza id e token antes de consultar a porta', async () => {
    const buscarCompleto = vi.fn(async () => completo([]))
    const useCase = new BuscarComplementoCompletoGestorUseCase(porta({ buscarCompleto }))

    await expect(
      useCase.execute({ complementoId: ' comp-1 ', token: ' token ' })
    ).resolves.toEqual(completo([]))
    expect(buscarCompleto).toHaveBeenCalledWith('comp-1', 'token')
  })

  it('rejeita id ou token vazios antes de consultar a porta', async () => {
    const buscarCompleto = vi.fn()
    const useCase = new BuscarComplementoCompletoGestorUseCase(porta({ buscarCompleto }))

    await expect(useCase.execute({ complementoId: ' ', token: 'token' })).rejects.toThrow(
      'ID do complemento é obrigatório'
    )
    await expect(useCase.execute({ complementoId: 'comp-1', token: ' ' })).rejects.toThrow(
      'Token não encontrado'
    )
    expect(buscarCompleto).not.toHaveBeenCalled()
  })
})

describe('ListarUsosParaPropagarComplementoUseCase', () => {
  it('lista todos os usos na edição base e exclui apenas a origem no menu', async () => {
    const vinculos = [
      uso({ menuProdutoId: 'mp1', menuId: 'menu-a', produtoId: 'prod', grupoId: 'grupo-1' }),
      uso({ menuProdutoId: 'mp2', menuId: 'menu-b', produtoId: 'prod', grupoId: 'grupo-1' }),
    ]
    const buscarCompleto = vi.fn(async () => completo(vinculos))
    const buscar = new BuscarComplementoCompletoGestorUseCase(porta({ buscarCompleto }))
    const useCase = new ListarUsosParaPropagarComplementoUseCase(buscar)

    await expect(
      useCase.execute({
        complementoId: ' comp-1 ',
        token: ' token ',
      })
    ).resolves.toHaveLength(2)

    const destinos = await useCase.execute({
      complementoId: 'comp-1',
      token: 'token',
      origem: { menuId: 'menu-a', produtoId: 'prod', grupoComplementoId: 'grupo-1' },
    })
    expect(destinos.map(item => item.menu.id)).toEqual(['menu-b'])
    expect(buscarCompleto).toHaveBeenCalledWith('comp-1', 'token')
  })

  it('propaga o erro de busca em vez de retornar uma lista como se tivesse sido carregada', async () => {
    const buscarCompleto = vi.fn().mockRejectedValue(new Error('Falha de rede'))
    const buscar = new BuscarComplementoCompletoGestorUseCase(porta({ buscarCompleto }))
    const useCase = new ListarUsosParaPropagarComplementoUseCase(buscar)

    await expect(useCase.execute({ complementoId: 'comp-1', token: 'token' })).rejects.toThrow(
      'Falha de rede'
    )
  })
})

describe('GravarOverridesComplementoGestorUseCase', () => {
  it('grava vínculos e grupos num único PATCH', async () => {
    const gravarOverrides = vi.fn().mockResolvedValue({ message: 'ok', atualizados: 2 })
    const useCase = new GravarOverridesComplementoGestorUseCase(porta({ gravarOverrides }))

    await useCase.execute({
      token: ' token ',
      vinculos: [{
        menuId: ' menu-a ',
        produtoId: 'prod',
        complementoId: 'comp-1',
        grupoComplementoId: 'grupo-1',
        valor: 4,
      }],
      grupos: [{
        grupoComplementoId: 'grupo-1',
        complementoId: 'comp-1',
        tipoImpactoPreco: 'aumenta',
      }],
    })

    expect(gravarOverrides).toHaveBeenCalledWith(
      {
        vinculos: [{
          menuId: 'menu-a',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 4,
        }],
        grupos: [{
          grupoComplementoId: 'grupo-1',
          complementoId: 'comp-1',
          tipoImpactoPreco: 'aumenta',
        }],
      },
      'token'
    )
  })

  it('rejeita vínculos inválidos e não os descarta silenciosamente', async () => {
    const gravarOverrides = vi.fn()
    const useCase = new GravarOverridesComplementoGestorUseCase(porta({ gravarOverrides }))

    await expect(
      useCase.execute({
        token: 'token',
        vinculos: [{
          menuId: 'menu-a',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
        }],
      })
    ).rejects.toThrow()
    expect(gravarOverrides).not.toHaveBeenCalled()
  })

  it('retorna resultado explícito sem chamar a porta quando não há alterações', async () => {
    const gravarOverrides = vi.fn()
    const useCase = new GravarOverridesComplementoGestorUseCase(porta({ gravarOverrides }))

    await expect(useCase.execute({ token: 'token', vinculos: [], grupos: [] })).resolves.toEqual({
      message: 'Nada para gravar',
      atualizados: 0,
    })
    expect(gravarOverrides).not.toHaveBeenCalled()
  })

  it('ignora listas vazias e ainda grava os grupos informados', async () => {
    const gravarOverrides = vi.fn().mockResolvedValue({ message: 'ok', atualizados: 1 })
    const useCase = new GravarOverridesComplementoGestorUseCase(porta({ gravarOverrides }))

    await useCase.execute({
      token: 'token',
      vinculos: [],
      grupos: [{
        grupoComplementoId: 'grupo-1',
        complementoId: 'comp-1',
        tipoImpactoPreco: 'aumenta',
      }],
    })

    expect(gravarOverrides).toHaveBeenCalledWith(
      {
        grupos: [{
          grupoComplementoId: 'grupo-1',
          complementoId: 'comp-1',
          tipoImpactoPreco: 'aumenta',
        }],
      },
      'token'
    )
  })

  it('propaga erro de vínculo malformado em vez de responder como operação concluída', async () => {
    const gravarOverrides = vi.fn()
    const useCase = new GravarOverridesComplementoGestorUseCase(porta({ gravarOverrides }))
    await expect(
      useCase.execute({
        token: 'token',
        vinculos: [{
          menuId: 'menu-a',
          produtoId: '',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 2,
        }],
      })
    ).rejects.toThrow()
    expect(gravarOverrides).not.toHaveBeenCalled()
  })
})
