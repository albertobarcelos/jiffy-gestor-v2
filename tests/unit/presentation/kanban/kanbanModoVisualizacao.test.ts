import { describe, expect, it } from 'vitest'
import {
  parseModoVisualizacaoKanban,
  resolverModoVisualizacaoKanban,
  ROTULO_MODO_VISUALIZACAO_KANBAN,
} from '@/src/presentation/components/features/kanban/utils/kanbanModoVisualizacao'
import { montarLayoutExpedicao } from '@/src/presentation/components/features/kanban/utils/kanbanExpedicaoLayout'
import {
  formatarMinutosCurto,
  formatarQuandoPedidoKanban,
  minutosAtrasoPrevisao,
  minutosDesdeIso,
  pedidoTemPendenciaExpedicao,
  tomTempoPedidoKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanPedidoTempo'
import {
  nomeClienteCurtoKanban,
  rotuloTipoAtendimentoKanban,
  tipoAtendimentoKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanPedidoIdentidade'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'
import type { KanbanColumn } from '@/src/presentation/components/features/kanban/types'

function col(id: string, title = id): KanbanColumn {
  return { id, title, color: '', borderColor: '', icon: null, placeholder: '' }
}

function criarVenda(partial: Partial<VendaUnificadaDTO> = {}): VendaUnificadaDTO {
  const base = new VendaUnificadaDTO(
    'ped-1',
    8360,
    'ABC',
    'entrega',
    'GESTOR',
    'venda_gestor',
    80,
    0,
    0,
    '2026-08-23T12:00:00.000Z',
    null,
    null,
    { id: 'c1', nome: 'Guilherme Rodrigues' },
    false,
    null,
    null,
    { id: '', nome: '—' }
  )
  return Object.assign(base, partial)
}

describe('parseModoVisualizacaoKanban', () => {
  it('aceita os três modos e cai no quadro', () => {
    expect(parseModoVisualizacaoKanban('expedicao')).toBe('expedicao')
    expect(parseModoVisualizacaoKanban('lista')).toBe('lista')
    expect(parseModoVisualizacaoKanban('quadro')).toBe('quadro')
    expect(parseModoVisualizacaoKanban('outro')).toBe('quadro')
    expect(ROTULO_MODO_VISUALIZACAO_KANBAN.expedicao).toBe('Operação')
    expect(ROTULO_MODO_VISUALIZACAO_KANBAN.quadro).toBe('Quadro')
    expect(ROTULO_MODO_VISUALIZACAO_KANBAN.lista).toBe('Lista')
  })
})

describe('resolverModoVisualizacaoKanban', () => {
  it('no Gestor web ignora o storage e fica no quadro', () => {
    expect(resolverModoVisualizacaoKanban(false, 'expedicao')).toBe('quadro')
    expect(resolverModoVisualizacaoKanban(false, 'lista')).toBe('quadro')
  })

  it('no Flow respeita o modo guardado', () => {
    expect(resolverModoVisualizacaoKanban(true, 'expedicao')).toBe('expedicao')
    expect(resolverModoVisualizacaoKanban(true, 'lista')).toBe('lista')
    expect(resolverModoVisualizacaoKanban(true, 'invalido')).toBe('quadro')
  })
})

describe('montarLayoutExpedicao', () => {
  it('produção à esquerda e o resto à direita, Finalizadas no arquivo', () => {
    const layout = montarLayoutExpedicao([
      col('NOVOS_PEDIDOS'),
      col('EM_PREPARO'),
      col('PRONTO_ENTREGA'),
      col('EM_ROTA'),
      col('FINALIZADAS'),
    ])
    expect(layout.primaria?.id).toBe('EM_PREPARO')
    expect(layout.laterais.map(c => c.id)).toEqual(['NOVOS_PEDIDOS', 'PRONTO_ENTREGA', 'EM_ROTA'])
    expect(layout.arquivo?.id).toBe('FINALIZADAS')
  })

  it('usa a primeira coluna se Em Preparo não estiver visível', () => {
    const layout = montarLayoutExpedicao([col('PRONTO_ENTREGA'), col('EM_ROTA')])
    expect(layout.primaria?.id).toBe('PRONTO_ENTREGA')
    expect(layout.laterais.map(c => c.id)).toEqual(['EM_ROTA'])
    expect(layout.arquivo).toBeNull()
  })
})

describe('kanbanPedidoIdentidade', () => {
  it('abrevia o sobrenome e classifica o tipo', () => {
    expect(nomeClienteCurtoKanban('Guilherme Rodrigues')).toBe('Guilherme R.')
    expect(nomeClienteCurtoKanban('Ana')).toBe('Ana')
    expect(nomeClienteCurtoKanban('')).toBe('—')
    expect(tipoAtendimentoKanban('retirada')).toBe('retirada')
    expect(rotuloTipoAtendimentoKanban('entrega')).toBe('Entrega')
  })
})

describe('kanbanPedidoTempo', () => {
  const agora = Date.parse('2026-08-23T12:30:00.000Z')

  it('calcula decorrido, atraso e tom', () => {
    expect(minutosDesdeIso('2026-08-23T12:00:00.000Z', agora)).toBe(30)
    expect(minutosAtrasoPrevisao('2026-08-23T12:20:00.000Z', agora)).toBe(10)
    expect(minutosAtrasoPrevisao('2026-08-23T12:40:00.000Z', agora)).toBe(0)
    expect(formatarMinutosCurto(9)).toBe('9min')
    expect(formatarMinutosCurto(75)).toBe('1h15min')
    expect(tomTempoPedidoKanban(10, 0)).toBe('ok')
    expect(tomTempoPedidoKanban(25, 0)).toBe('alerta')
    expect(tomTempoPedidoKanban(5, 3)).toBe('atraso')
    expect(formatarQuandoPedidoKanban('2026-08-23T12:00:00.000Z', agora)).toMatch(/\d{2}:\d{2}/)
    expect(formatarQuandoPedidoKanban('2026-08-21T12:00:00.000Z', agora)).toMatch(
      /^\d{2}\/\d{2} \d{2}:\d{2}$/
    )
  })

  it('marca pendência por atraso ou cobrança na entrega', () => {
    const atrasada = criarVenda({ previsaoEntregaEm: '2026-08-23T12:10:00.000Z' })
    expect(pedidoTemPendenciaExpedicao(atrasada, agora)).toBe(true)

    const noPrazo = criarVenda({ previsaoEntregaEm: '2026-08-23T13:00:00.000Z' })
    expect(pedidoTemPendenciaExpedicao(noPrazo, agora)).toBe(false)

    const cobrar = criarVenda({
      previsaoEntregaEm: '2026-08-23T13:00:00.000Z',
      statusFinanceiro: 'pendente',
      statusEtapaOperacional: 'EM_ROTA',
    })
    expect(pedidoTemPendenciaExpedicao(cobrar, agora)).toBe(true)
  })
})
