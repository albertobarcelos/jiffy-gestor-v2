import { describe, expect, it, vi } from 'vitest'
import { SalvarEdicaoCategoriaPizzaUseCase } from '@/src/application/use-cases/pizza/SalvarEdicaoCategoriaPizzaUseCase'
import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import type { PizzaCategoriaEditDraft } from '@/src/application/mappers/pizza/pizzaEditMappers'

function createDraft(overrides: Partial<PizzaCategoriaEditDraft> = {}): PizzaCategoriaEditDraft {
  return {
    categoriaId: 'cat-1',
    grupoPizzaConfigId: 'grupo-cfg-1',
    nome: 'PIZZAS',
    corHex: '#530CA3',
    iconName: 'pizza',
    ativo: true,
    regraPrecoMultiplosSabores: 'proporcional',
    permiteDesconto: true,
    permiteAcrescimo: true,
    impressorasIds: [],
    tamanhos: [
      {
        id: 'tam-1',
        localId: 'local-tam-1',
        nome: 'MEDIA',
        quantidadePedacos: 6,
        quantidadeMaximaDivisoes: 2,
        ativo: true,
      },
    ],
    sabores: [],
    adicionais: [],
    massas: [{ localId: 'm1', nome: 'TRADICIONAL', valor: 0, ativo: true }],
    bordas: [{ localId: 'b1', nome: 'CHEDDAR', valor: 8, ativo: true }],
    tamanhosRemovidosIds: [],
    massasRemovidasIds: [],
    bordasRemovidasIds: [],
    saboresRemovidosIds: [],
    adicionaisRemovidosVinculoIds: [],
    ...overrides,
  }
}

function createGatewayMock(
  partial: Partial<IPizzaCadastroGateway> = {}
): IPizzaCadastroGateway {
  return {
    listarCategorias: vi.fn(),
    buscarCategoria: vi.fn(),
    atualizarCategoria: vi.fn().mockResolvedValue({}),
    criarCategoriaCompleto: vi.fn(),
    reordenarCategoria: vi.fn(),
    listarSabores: vi.fn(),
    buscarSabor: vi.fn(),
    criarSabor: vi.fn(),
    atualizarSabor: vi.fn(),
    excluirSabor: vi.fn(),
    reordenarSabor: vi.fn(),
    listarTamanhos: vi.fn(),
    criarTamanho: vi.fn(),
    atualizarTamanho: vi.fn().mockResolvedValue({}),
    excluirTamanho: vi.fn(),
    listarGruposMassas: vi.fn(),
    buscarGrupoMassas: vi.fn(),
    criarGrupoMassas: vi.fn().mockResolvedValue({}),
    atualizarGrupoMassas: vi.fn().mockResolvedValue({}),
    listarGruposBordas: vi.fn(),
    buscarGrupoBordas: vi.fn(),
    criarGrupoBordas: vi.fn().mockResolvedValue({}),
    atualizarGrupoBordas: vi.fn().mockResolvedValue({}),
    listarComplementos: vi.fn(),
    criarComplemento: vi.fn(),
    substituirPrecosComplemento: vi.fn(),
    desvincularComplemento: vi.fn(),
    ...partial,
  } as IPizzaCadastroGateway
}

describe('SalvarEdicaoCategoriaPizzaUseCase', () => {
  it('rejeita draft sem nome', async () => {
    const useCase = new SalvarEdicaoCategoriaPizzaUseCase(createGatewayMock())
    await expect(
      useCase.execute({ token: 't', draft: createDraft({ nome: '   ' }) })
    ).rejects.toThrow(/nome/i)
  })

  it('atualiza tamanho existente e cria massa/borda com impacto conforme valor', async () => {
    const criarGrupoMassas = vi.fn().mockResolvedValue({})
    const criarGrupoBordas = vi.fn().mockResolvedValue({})
    const gateway = createGatewayMock({ criarGrupoMassas, criarGrupoBordas })
    const useCase = new SalvarEdicaoCategoriaPizzaUseCase(gateway)

    await useCase.execute({ token: 't', draft: createDraft() })

    expect(gateway.atualizarCategoria).toHaveBeenCalled()
    expect(gateway.atualizarTamanho).toHaveBeenCalledWith(
      't',
      'tam-1',
      expect.objectContaining({ nome: 'MEDIA' })
    )
    expect(criarGrupoMassas).toHaveBeenCalledWith(
      't',
      expect.objectContaining({
        massas: [expect.objectContaining({ nome: 'TRADICIONAL', valor: 0, tipoImpactoPreco: 'nenhum' })],
      })
    )
    expect(criarGrupoBordas).toHaveBeenCalledWith(
      't',
      expect.objectContaining({
        bordas: [expect.objectContaining({ nome: 'CHEDDAR', valor: 8, tipoImpactoPreco: 'aumenta' })],
      })
    )
  })

  it('cria sabor novo com preços mapeados pelo localId do tamanho', async () => {
    const criarSabor = vi.fn().mockResolvedValue({})
    const gateway = createGatewayMock({ criarSabor })
    const useCase = new SalvarEdicaoCategoriaPizzaUseCase(gateway)

    await useCase.execute({
      token: 't',
      draft: createDraft({
        massas: [],
        bordas: [],
        sabores: [
          {
            localId: 's1',
            nome: 'CALABRESA',
            descricao: '',
            ativo: true,
            precosPorTamanhoLocalId: {
              'local-tam-1': { enabled: true, valor: 45 },
            },
          },
        ],
      }),
    })

    expect(criarSabor).toHaveBeenCalledWith(
      't',
      expect.objectContaining({
        nome: 'CALABRESA',
        categoriaPizzaId: 'cat-1',
        precosTamanho: [{ pizzaTamanhoId: 'tam-1', precoCheio: 45 }],
      })
    )
  })
})
