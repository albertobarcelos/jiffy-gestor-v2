import { describe, expect, it, vi } from 'vitest'
import { SincronizarCardapioMarketplaceUseCase } from '@/src/application/use-cases/integracoes/SincronizarCardapioMarketplaceUseCase'
import type { ICardapioMarketplaceHub } from '@/src/domain/integracoes/ICardapioMarketplaceHub'

function hubVazio(): ICardapioMarketplaceHub {
  return {
    listarProdutos: vi.fn(),
    listarRemoto: vi.fn(),
    listarCategorias: vi.fn(),
    listarPagamentos: vi.fn(),
    aplicar: vi.fn(),
    aplicarCategorias: vi.fn(),
    aplicarPagamentos: vi.fn(),
    importar: vi.fn(),
  }
}

describe('SincronizarCardapioMarketplaceUseCase', () => {
  it('exige Bearer e VINCULAR com idItem', async () => {
    const hub = hubVazio()
    const useCase = new SincronizarCardapioMarketplaceUseCase(hub)
    await expect(
      useCase.listarProdutos({
        empresaId: 'emp-1',
        authorization: 'token-sem-bearer',
        menuId: 'menu-1',
      })
    ).rejects.toMatchObject({ code: 'INTEGRACAO_BEARER_MISSING' })
    await expect(
      useCase.aplicar({
        empresaId: 'emp-1',
        authorization: 'Bearer abcdefghijklmnop',
        menuId: 'menu-1',
        itens: [{ produtoId: 'p1', acao: 'VINCULAR' }],
      })
    ).rejects.toMatchObject({ code: 'INTEGRACAO_ID_ITEM_MISSING' })
    expect(hub.aplicar).not.toHaveBeenCalled()
  })

  it('encaminha aplicar e importar para o hub', async () => {
    const hub: ICardapioMarketplaceHub = {
      listarProdutos: vi.fn(),
      listarRemoto: vi.fn(),
      listarCategorias: vi.fn(),
      listarPagamentos: vi.fn(),
      aplicar: vi.fn(async () => ({
        resultados: [{ produtoId: 'p1', acao: 'CRIAR' as const, salvo: true }],
      })),
      aplicarCategorias: vi.fn(async () => ({
        resultados: [{ grupoId: 'g1', acao: 'CRIAR' as const, salvo: true, categoriaId: 'c1' }],
      })),
      aplicarPagamentos: vi.fn(async () => ({
        resultados: [{ meioId: 'mp1', acao: 'VINCULAR' as const, salvo: true, pagamentoId: '170' }],
      })),
      importar: vi.fn(async () => ({
        resultados: [{ idItem: 'i1', criado: false, produtoId: 'p9', motivo: 'JA_EXISTE' }],
      })),
    }
    const useCase = new SincronizarCardapioMarketplaceUseCase(hub)
    await useCase.aplicar({
      empresaId: 'emp-1',
      authorization: 'Bearer abcdefghijklmnop',
      menuId: 'menu-1',
      itens: [{ produtoId: 'p1', acao: 'CRIAR' }],
    })
    await useCase.aplicarCategorias({
      empresaId: 'emp-1',
      authorization: 'Bearer abcdefghijklmnop',
      menuId: 'menu-1',
      itens: [{ grupoId: 'g1', acao: 'CRIAR' }],
    })
    await expect(
      useCase.aplicarCategorias({
        empresaId: 'emp-1',
        authorization: 'Bearer abcdefghijklmnop',
        menuId: 'menu-1',
        itens: [{ grupoId: 'g1', acao: 'VINCULAR' }],
      })
    ).rejects.toMatchObject({ code: 'INTEGRACAO_CATEGORIA_MISSING' })
    await useCase.importar({
      empresaId: 'emp-1',
      authorization: 'Bearer abcdefghijklmnop',
      menuId: 'menu-1',
      itens: [{ idItem: 'i1', nome: 'Coxinha', preco: 12 }],
    })
    expect(hub.aplicar).toHaveBeenCalledTimes(1)
    expect(hub.importar).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: 'emp-1',
        menuId: 'menu-1',
        itens: [{ idItem: 'i1', nome: 'Coxinha', descricao: null, preco: 12, sku: null }],
      })
    )
  })
})
