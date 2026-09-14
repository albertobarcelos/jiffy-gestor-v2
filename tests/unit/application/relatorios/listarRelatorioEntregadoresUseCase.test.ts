import { describe, expect, it } from 'vitest'
import { ListarRelatorioEntregadoresUseCase } from '@/src/application/use-cases/relatorios/ListarRelatorioEntregadoresUseCase'
import { RelatorioEntregadoresFiltroError } from '@/src/application/dto/RelatorioEntregadoresDTO'
import type { IRelatorioEntregadoresFonteRepository } from '@/src/domain/repositories/IRelatorioEntregadoresFonteRepository'
import { idCoberturaRelatorio } from '@/src/domain/relatorio-entregadores/tipos'

describe('ListarRelatorioEntregadoresUseCase', () => {
  it('rejeita período invertido', async () => {
    const fonte: IRelatorioEntregadoresFonteRepository = {
      carregar: async () => ({ coberturas: [], entregadores: [], pedidos: [], truncado: false }),
    }
    const useCase = new ListarRelatorioEntregadoresUseCase(fonte)

    await expect(
      useCase.execute({
        token: 't',
        filtro: {
          dataFinalizacaoInicio: '2026-09-30T00:00:00.000Z',
          dataFinalizacaoFim: '2026-09-01T00:00:00.000Z',
        },
      })
    ).rejects.toBeInstanceOf(RelatorioEntregadoresFiltroError)
  })

  it('agrega a fonte e pagina o resultado', async () => {
    const coberturaId = idCoberturaRelatorio('area', 'centro')
    const fonte: IRelatorioEntregadoresFonteRepository = {
      carregar: async () => ({
        coberturas: [
          {
            id: coberturaId,
            tipo: 'area',
            origemId: 'centro',
            nome: 'Centro',
            valorTaxa: 8,
          },
        ],
        entregadores: [{ id: 'ana', nome: 'Ana', telefone: null }],
        pedidos: [
          {
            id: '1',
            statusDelivery: 'FINALIZADO',
            tipoEntrega: 'entrega',
            entregadorId: 'ana',
            dataCriacao: new Date('2026-09-10T11:00:00.000Z'),
            dataFinalizacao: new Date('2026-09-10T12:00:00.000Z'),
            cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
          },
        ],
        truncado: false,
      }),
    }

    const useCase = new ListarRelatorioEntregadoresUseCase(fonte)
    const result = await useCase.execute({
      token: 't',
      filtro: {
        dataFinalizacaoInicio: '2026-09-01T00:00:00.000Z',
        dataFinalizacaoFim: '2026-09-30T23:59:59.999Z',
      },
    })

    expect(result.items).toHaveLength(1)
    expect(result.totais.valorAReceber).toBe(8)
    expect(result.coberturas[0]?.nome).toBe('Centro')
    expect(result.entregadores).toEqual([{ id: 'ana', nome: 'Ana' }])
  })

  it('filtra por entregador e mantém a lista completa de opções', async () => {
    const coberturaId = idCoberturaRelatorio('area', 'centro')
    const fonte: IRelatorioEntregadoresFonteRepository = {
      carregar: async () => ({
        coberturas: [
          {
            id: coberturaId,
            tipo: 'area',
            origemId: 'centro',
            nome: 'Centro',
            valorTaxa: 8,
          },
        ],
        entregadores: [
          { id: 'ana', nome: 'Ana', telefone: null },
          { id: 'bruno', nome: 'Bruno', telefone: null },
        ],
        pedidos: [
          {
            id: '1',
            statusDelivery: 'FINALIZADO',
            tipoEntrega: 'entrega',
            entregadorId: 'ana',
            dataCriacao: new Date('2026-09-10T11:00:00.000Z'),
            dataFinalizacao: new Date('2026-09-10T12:00:00.000Z'),
            cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
          },
          {
            id: '2',
            statusDelivery: 'FINALIZADO',
            tipoEntrega: 'entrega',
            entregadorId: 'bruno',
            dataCriacao: new Date('2026-09-11T11:00:00.000Z'),
            dataFinalizacao: new Date('2026-09-11T12:00:00.000Z'),
            cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
          },
        ],
        truncado: false,
      }),
    }

    const useCase = new ListarRelatorioEntregadoresUseCase(fonte)
    const result = await useCase.execute({
      token: 't',
      filtro: {
        dataFinalizacaoInicio: '2026-09-01T00:00:00.000Z',
        dataFinalizacaoFim: '2026-09-30T23:59:59.999Z',
        entregadorId: 'bruno',
      },
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.entregadorId).toBe('bruno')
    expect(result.entregadores.map(e => e.id)).toEqual(['ana', 'bruno'])
  })
})
