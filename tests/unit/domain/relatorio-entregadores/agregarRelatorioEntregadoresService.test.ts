import { describe, expect, it } from 'vitest'
import { AgregarRelatorioEntregadoresService } from '@/src/domain/services/AgregarRelatorioEntregadoresService'
import { idCoberturaRelatorio } from '@/src/domain/relatorio-entregadores/tipos'
import type {
  CoberturaRelatorio,
  EntregadorRelatorio,
  PedidoRelatorioEntregadores,
} from '@/src/domain/relatorio-entregadores/tipos'

const periodo = {
  inicio: new Date(2026, 8, 1),
  fim: new Date(2026, 8, 30, 23, 59, 59, 999),
}

const coberturas: CoberturaRelatorio[] = [
  {
    id: idCoberturaRelatorio('area', 'centro'),
    tipo: 'area',
    origemId: 'centro',
    nome: 'Centro',
    valorTaxa: 8,
  },
  {
    id: idCoberturaRelatorio('area', 'bairro'),
    tipo: 'area',
    origemId: 'bairro',
    nome: 'Bairro',
    valorTaxa: 12,
  },
]

const entregadores: EntregadorRelatorio[] = [
  { id: 'ana', nome: 'Ana Souza', telefone: '11999990001' },
  { id: 'bruno', nome: 'Bruno Lima', telefone: null },
]

function pedido(partial: Partial<PedidoRelatorioEntregadores>): PedidoRelatorioEntregadores {
  return {
    id: partial.id ?? 'p',
    statusDelivery: partial.statusDelivery ?? 'FINALIZADO',
    tipoEntrega: partial.tipoEntrega ?? 'entrega',
    entregadorId: partial.entregadorId ?? 'ana',
    dataCriacao: partial.dataCriacao ?? new Date(2026, 8, 10),
    dataFinalizacao: partial.dataFinalizacao ?? new Date(2026, 8, 10),
    cobertura: partial.cobertura === undefined
      ? { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 }
      : partial.cobertura,
  }
}

describe('AgregarRelatorioEntregadoresService', () => {
  it('soma taxas da cobertura por entregador e ignora EM_ROTA', () => {
    const { linhas, totais } = AgregarRelatorioEntregadoresService.agregar({
      periodo,
      coberturas,
      entregadores,
      pedidos: [
        pedido({ id: '1', cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 } }),
        pedido({
          id: '2',
          cobertura: { areaId: 'bairro', raioId: null, valorCalculadoSistema: 12 },
        }),
        pedido({ id: '3', statusDelivery: 'EM_ROTA' }),
        pedido({
          id: '4',
          statusDelivery: 'PENDENTE',
          dataFinalizacao: null,
          cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
        }),
      ],
    })

    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      entregadorId: 'ana',
      quantidadeEntregasFinalizadas: 2,
      quantidadeEntregasPendentes: 1,
      valorAReceberFinalizadas: 20,
      valorAReceberPendentes: 8,
      valorAReceber: 28,
    })
    expect(totais).toEqual({
      quantidadeEntregasFinalizadas: 2,
      quantidadeEntregasPendentes: 1,
      valorAReceberFinalizadas: 20,
      valorAReceberPendentes: 8,
      valorAReceber: 28,
      quantidadeSemCobertura: 0,
    })
  })

  it('filtra por cobertura e busca por nome', () => {
    const { linhas } = AgregarRelatorioEntregadoresService.agregar({
      periodo,
      coberturas,
      entregadores,
      coberturaId: idCoberturaRelatorio('area', 'centro'),
      q: 'bru',
      pedidos: [
        pedido({
          id: '1',
          entregadorId: 'bruno',
          cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
        }),
        pedido({
          id: '2',
          entregadorId: 'ana',
          cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
        }),
      ],
    })

    expect(linhas).toHaveLength(1)
    expect(linhas[0].entregadorId).toBe('bruno')
  })

  it('filtra por entregadorId sem alterar o recorte das demais linhas', () => {
    const { linhas, totais } = AgregarRelatorioEntregadoresService.agregar({
      periodo,
      coberturas,
      entregadores,
      entregadorId: 'bruno',
      pedidos: [
        pedido({
          id: '1',
          entregadorId: 'bruno',
          cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
        }),
        pedido({
          id: '2',
          entregadorId: 'ana',
          cobertura: { areaId: 'centro', raioId: null, valorCalculadoSistema: 8 },
        }),
      ],
    })

    expect(linhas).toHaveLength(1)
    expect(linhas[0].entregadorId).toBe('bruno')
    expect(totais.quantidadeEntregasFinalizadas).toBe(1)
    expect(totais.valorAReceber).toBe(8)
  })
})
