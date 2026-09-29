import { describe, expect, it, vi } from 'vitest'
import {
  BuscarNcmCestFiscalProdutoUseCase,
  ListarNcmCestFiscalPorProdutoIdsUseCase,
} from '@/src/application/use-cases/produtos/BuscarNcmCestFiscalProdutoUseCase'
import type { IProdutoFiscalReadRepository } from '@/src/domain/repositories/IProdutoFiscalReadRepository'

describe('ListarNcmCestFiscalPorProdutoIdsUseCase', () => {
  it('agrega a leitura fiscal por id via repositório', async () => {
    const repo: IProdutoFiscalReadRepository = {
      buscarNcmCestFiscal: vi.fn(async (id: string) =>
        id === 'p1'
          ? { ncm: '21069090', cest: '0301300', indisponivel: false }
          : { ncm: '', cest: '', indisponivel: true }
      ),
    }
    const useCase = new ListarNcmCestFiscalPorProdutoIdsUseCase(
      new BuscarNcmCestFiscalProdutoUseCase(repo)
    )

    const mapa = await useCase.execute(['p1', 'p2'], 'token')

    expect(mapa).toEqual({
      p1: { ncm: '21069090', cest: '0301300', indisponivel: false },
      p2: { ncm: '', cest: '', indisponivel: true },
    })
    expect(repo.buscarNcmCestFiscal).toHaveBeenCalledTimes(2)
  })
})
