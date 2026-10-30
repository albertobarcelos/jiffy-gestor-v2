import { describe, expect, it, vi } from 'vitest'
import { CarregarEdicaoCategoriaPizzaUseCase } from '@/src/application/use-cases/pizza/CarregarEdicaoCategoriaPizzaUseCase'
import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import type { CategoriaPizza, PizzaTamanho } from '@/src/shared/types/pizza'

const categoria: CategoriaPizza = {
  id: 'cat-1',
  nome: 'PIZZAS',
  ordem: 1,
  corHex: '#530CA3',
  iconName: 'pizza',
  regraPrecoMultiplosSabores: 'proporcional',
  ativoDelivery: true,
  ativoLocal: true,
  ativo: true,
  impressorasIds: ['imp-1'],
  dataCriacao: '2026-01-01T00:00:00.000Z',
  dataAtualizacao: '2026-01-01T00:00:00.000Z',
}

const tamanho: PizzaTamanho = {
  id: 'tam-1',
  grupoPizzaConfigId: 'cfg-1',
  nome: 'MEDIA',
  quantidadePedacos: 6,
  quantidadeMaximaDivisoes: 2,
  ativo: true,
  dataCriacao: '2026-01-01T00:00:00.000Z',
  dataAtualizacao: '2026-01-01T00:00:00.000Z',
}

describe('CarregarEdicaoCategoriaPizzaUseCase', () => {
  it('monta draft com tamanhos e impressoras da categoria', async () => {
    const gateway = {
      buscarCategoria: vi.fn().mockResolvedValue(categoria),
      listarTamanhos: vi.fn().mockResolvedValue({ items: [tamanho], count: 1 }),
      listarGruposMassas: vi.fn().mockResolvedValue({ items: [], count: 0 }),
      listarGruposBordas: vi.fn().mockResolvedValue({ items: [], count: 0 }),
      listarSabores: vi.fn().mockResolvedValue({ items: [], count: 0 }),
      listarComplementos: vi.fn().mockResolvedValue([]),
    } as unknown as IPizzaCadastroGateway

    const useCase = new CarregarEdicaoCategoriaPizzaUseCase(gateway)
    const draft = await useCase.execute({ token: 't', categoriaId: 'cat-1' })

    expect(draft.categoriaId).toBe('cat-1')
    expect(draft.grupoPizzaConfigId).toBe('cfg-1')
    expect(draft.impressorasIds).toEqual(['imp-1'])
    expect(draft.tamanhos).toHaveLength(1)
    expect(draft.tamanhos[0]?.id).toBe('tam-1')
    expect(draft.tamanhos[0]?.nome).toBe('MEDIA')
    expect(draft.sabores).toEqual([])
    expect(draft.adicionais).toEqual([])
  })
})
