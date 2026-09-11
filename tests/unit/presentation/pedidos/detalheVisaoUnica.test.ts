import { describe, expect, it } from 'vitest'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import {
  aplicarHintKanbanNoDtoDetalhe,
  colunaKanbanDeStatusEtapa,
  colunaKanbanDeTimestampsEntrega,
  resolverColunaDetalhePedido,
  rotuloEtapaDetalhePedido,
  rotuloTipoAtendimento,
} from '@/src/presentation/components/features/pedidos/utils/detalheVisaoUnica'

function dtoDetalhe(
  overrides: Partial<VendaDetalheCarregadaDTO> = {}
): VendaDetalheCarregadaDTO {
  return {
    origem: 'GESTOR',
    status: 'ABERTA',
    statusFiscal: null,
    clienteId: null,
    clienteNome: 'Alberto',
    produtos: [],
    pagamentos: [],
    fluxoPagamentoEntrega: 'cobrar_entregador',
    detalhesPedidoMeta: {
      statusEtapaOperacional: 'EM_PREPARO',
      tipoVenda: 'entrega',
    },
    resumoFiscal: null,
    resumoFinanceiroDetalhes: null,
    detalhesEntregaPedido: {},
    nomesUsuariosPedido: {},
    nomesMeiosPagamentoPedido: {},
    dataVenda: null,
    valorFinalVenda: 50,
    dataFinalizacaoCarregada: null,
    vendaGestorJaCancelada: false,
    observacaoPedido: null,
    irParaStep4: true,
    ...overrides,
  }
}

describe('colunaKanbanDeStatusEtapa', () => {
  it('mapeia etapas operacionais', () => {
    expect(colunaKanbanDeStatusEtapa('PENDENTE')).toBe('NOVOS_PEDIDOS')
    expect(colunaKanbanDeStatusEtapa('EM_PREPARO')).toBe('EM_PREPARO')
    expect(colunaKanbanDeStatusEtapa('PRONTO')).toBe('PRONTO_ENTREGA')
    expect(colunaKanbanDeStatusEtapa('EM_ROTA')).toBe('EM_ROTA')
    expect(colunaKanbanDeStatusEtapa('DESPACHADO')).toBe('EM_ROTA')
    expect(colunaKanbanDeStatusEtapa('FINALIZADAS')).toBe('FINALIZADAS')
    expect(colunaKanbanDeStatusEtapa('ENTREGUE')).toBe('FINALIZADAS')
  })
})

describe('resolverColunaDetalhePedido', () => {
  it('avança pela etapa do card quando o GET fica em preparo', () => {
    expect(
      resolverColunaDetalhePedido({
        statusEtapaOperacional: 'EM_PREPARO',
        statusEtapaOperacionalHint: 'EM_ROTA',
      })
    ).toBe('EM_ROTA')
  })

  it('avança pelos timestamps da saída para entrega', () => {
    expect(
      colunaKanbanDeTimestampsEntrega({ dataSaidaEntrega: '2026-09-10T21:00:00.000Z' })
    ).toBe('EM_ROTA')
    expect(
      resolverColunaDetalhePedido({
        statusEtapaOperacional: 'EM_PREPARO',
        detalhesEntrega: { dataSaidaEntrega: '2026-09-10T21:00:00.000Z' },
      })
    ).toBe('EM_ROTA')
  })

  it('não recua se o GET já está mais avançado que o hint', () => {
    expect(
      resolverColunaDetalhePedido({
        statusEtapaOperacional: 'EM_ROTA',
        statusEtapaOperacionalHint: 'EM_PREPARO',
      })
    ).toBe('EM_ROTA')
  })
})

describe('aplicarHintKanbanNoDtoDetalhe', () => {
  it('usa a etapa do Kanban quando o detalhe gestor atrasou', () => {
    const merged = aplicarHintKanbanNoDtoDetalhe(dtoDetalhe(), {
      statusEtapaOperacional: 'EM_ROTA',
      entregador: { id: 'ent-1', nome: 'João Motoboy', telefone: '65999998888' },
    })
    expect(merged.detalhesPedidoMeta?.statusEtapaOperacional).toBe('EM_ROTA')
    expect(merged.detalhesEntregaPedido?.entregadorNome).toBe('João Motoboy')
    expect(merged.detalhesEntregaPedido?.entregadorTelefone).toBe('65999998888')
  })

  it('não sobrescreve entregador já resolvido no GET', () => {
    const merged = aplicarHintKanbanNoDtoDetalhe(
      dtoDetalhe({
        detalhesEntregaPedido: {
          entregadorNome: 'Maria',
          entregadorTelefone: '65911112222',
        },
      }),
      { entregador: { id: 'ent-1', nome: 'João', telefone: '65999998888' } }
    )
    expect(merged.detalhesEntregaPedido?.entregadorNome).toBe('Maria')
    expect(merged.detalhesEntregaPedido?.entregadorTelefone).toBe('65911112222')
  })
})

describe('rotuloEtapaDetalhePedido', () => {
  it('humaniza entrega e retirada em rota', () => {
    expect(rotuloEtapaDetalhePedido('EM_ROTA', 'entrega')).toBe('Em rota')
    expect(rotuloEtapaDetalhePedido('EM_ROTA', 'retirada')).toBe('Aguardando retirada')
  })
})

describe('rotuloTipoAtendimento', () => {
  it('nomeia entrega, retirada e balcão', () => {
    expect(rotuloTipoAtendimento('entrega')).toBe('Entrega')
    expect(rotuloTipoAtendimento('retirada')).toBe('Retirada')
    expect(rotuloTipoAtendimento('balcao')).toBe('Balcão')
  })
})
