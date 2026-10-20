import { describe, expect, it, vi } from 'vitest'
import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'
import { PropagarAlteracaoComplementoUseCase } from '@/src/application/use-cases/complementos/PropagarAlteracaoComplementoUseCase'
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
    gravarVinculos: vi.fn(),
    ...overrides,
  }
}

describe('PropagarAlteracaoComplementoUseCase', () => {
  it('lista todos os usos no cadastro e tira só a origem no menu', async () => {
    const vinculos = [
      uso({ menuProdutoId: 'mp1', menuId: 'menu-a', produtoId: 'prod', grupoId: 'grupo-1' }),
      uso({ menuProdutoId: 'mp2', menuId: 'menu-b', produtoId: 'prod', grupoId: 'grupo-1' }),
    ]
    const buscarCompleto = vi.fn(async () => completo(vinculos))
    const useCase = new PropagarAlteracaoComplementoUseCase(porta({ buscarCompleto }))

    await expect(
      useCase.listarUsosParaPropagar({
        complementoId: ' comp-1 ',
        token: ' token ',
      })
    ).resolves.toHaveLength(2)

    const destinos = await useCase.listarUsosParaPropagar({
      complementoId: 'comp-1',
      token: 'token',
      origem: { menuId: 'menu-a', produtoId: 'prod', grupoComplementoId: 'grupo-1' },
    })
    expect(destinos.map(item => item.menu.id)).toEqual(['menu-b'])
    expect(buscarCompleto).toHaveBeenCalledWith('comp-1', 'token')
  })

  it('grava origem e destinos num único PATCH', async () => {
    const gravarVinculos = vi.fn()
    const useCase = new PropagarAlteracaoComplementoUseCase(porta({ gravarVinculos }))

    await useCase.aplicarVinculos({
      token: ' token ',
      vinculos: [
        {
          menuId: ' menu-a ',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 4,
        },
        {
          menuId: 'menu-b',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 4,
        },
      ],
    })

    expect(gravarVinculos).toHaveBeenCalledTimes(1)
    expect(gravarVinculos).toHaveBeenCalledWith(
      [
        {
          menuId: 'menu-a',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 4,
        },
        {
          menuId: 'menu-b',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 4,
        },
      ],
      'token'
    )
  })

  it('não chama a porta sem vínculo válido', async () => {
    const gravarVinculos = vi.fn()
    const useCase = new PropagarAlteracaoComplementoUseCase(porta({ gravarVinculos }))

    await useCase.aplicarVinculos({
      token: 'token',
      vinculos: [
        {
          menuId: 'menu-a',
          produtoId: 'prod',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
        },
      ],
    })

    expect(gravarVinculos).not.toHaveBeenCalled()
  })

  it('não busca usos sem token ou id', async () => {
    const buscarCompleto = vi.fn()
    const useCase = new PropagarAlteracaoComplementoUseCase(porta({ buscarCompleto }))

    await expect(
      useCase.listarUsosParaPropagar({ complementoId: 'comp-1', token: '  ' })
    ).rejects.toThrow('Token não encontrado')
    await expect(
      useCase.listarUsosParaPropagar({ complementoId: '  ', token: 'token' })
    ).rejects.toThrow('ID do complemento é obrigatório')
    expect(buscarCompleto).not.toHaveBeenCalled()
  })
})
