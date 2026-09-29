import { describe, expect, it } from 'vitest'
import {
  ancoraInicioPreparoKanban,
  deveExibirCronometroPreparoKanban,
  escolherIsoMaisRecente,
  formatarCronometroMmSs,
  minutosPreparoConcluido,
  relogioPedidoKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanPedidoTempo'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'
import { cloneVendaUnificadaDTO } from '@/src/presentation/components/features/kanban/utils/kanbanVendaCacheUpdate'

function criarVenda(partial: Partial<VendaUnificadaDTO> = {}): VendaUnificadaDTO {
  const base = new VendaUnificadaDTO(
    'ped-1',
    10,
    'V0010',
    'delivery',
    'GESTOR',
    'venda_gestor',
    80,
    0,
    0,
    '2026-06-15T10:00:00.000Z',
    null,
    null,
    { id: 'c1', nome: 'Cliente' },
    false,
    null,
    null,
    { id: '', nome: '—' }
  )
  return Object.assign(base, partial)
}

const INICIO = Date.parse('2026-06-15T10:00:00.000Z')

describe('relogioPedidoKanban — cronômetro de preparo', () => {
  it('em Em preparo conta para cima a partir do início persistido', () => {
    const venda = criarVenda({ dataInicioPreparo: '2026-06-15T10:00:00.000Z' })
    const agoraMs = INICIO + 8 * 60_000
    const relogio = relogioPedidoKanban(venda, agoraMs, {
      colunaId: 'EM_PREPARO',
      slaPreparoMinutos: 20,
    })
    expect(relogio.rotuloDecorrido).toBe('08:00')
    expect(relogio.rotuloHa).toBe('08:00')
    expect(relogio.rotuloAtraso).toBeNull()
    expect(relogio.tom).toBe('ok')
  })

  it('alerta quando o cronômetro chega perto do prazo da loja', () => {
    const venda = criarVenda({ dataInicioPreparo: '2026-06-15T10:00:00.000Z' })
    const agoraMs = INICIO + 16 * 60_000
    const relogio = relogioPedidoKanban(venda, agoraMs, {
      colunaId: 'EM_PREPARO',
      slaPreparoMinutos: 20,
    })
    expect(relogio.rotuloDecorrido).toBe('16:00')
    expect(relogio.tom).toBe('alerta')
  })

  it('em Pronto congela o tempo entre início e fim do preparo', () => {
    const venda = criarVenda({
      dataInicioPreparo: '2026-06-15T10:00:00.000Z',
      dataFinalizacaoPreparo: '2026-06-15T10:12:00.000Z',
      dataUltimaModificacao: '2026-06-15T10:40:00.000Z',
    })
    const agoraMs = INICIO + 50 * 60_000
    const relogio = relogioPedidoKanban(venda, agoraMs, {
      colunaId: 'PRONTO_ENTREGA',
      slaPreparoMinutos: 20,
    })
    expect(relogio.rotuloDecorrido).toBe('12:00')
    expect(relogio.rotuloHa).toBe('12:00')
    expect(minutosPreparoConcluido(venda)).toBe(12)
  })

  it('mostra minutos e segundos no cronômetro', () => {
    const venda = criarVenda({ dataInicioPreparo: '2026-06-15T10:00:00.000Z' })
    const agoraMs = INICIO + 6 * 60_000 + 14_000
    const relogio = relogioPedidoKanban(venda, agoraMs, {
      colunaId: 'EM_PREPARO',
      slaPreparoMinutos: 20,
    })
    expect(relogio.rotuloDecorrido).toBe('06:14')
    expect(formatarCronometroMmSs(3661)).toBe('1:01:01')
  })

  it('prefere dataInicioPreparo à âncora local', () => {
    const venda = criarVenda({ dataInicioPreparo: '2026-06-15T10:00:00.000Z' })
    expect(ancoraInicioPreparoKanban(venda, '2026-06-15T10:30:00.000Z')).toBe(
      '2026-06-15T10:00:00.000Z'
    )
  })

  it('em Pronto sem o par início+fim não congela — cai no tempo da última mudança', () => {
    const venda = criarVenda({
      dataInicioPreparo: '2026-06-15T10:00:00.000Z',
      dataUltimaModificacao: '2026-06-15T10:40:00.000Z',
    })
    const agoraMs = INICIO + 50 * 60_000
    const relogio = relogioPedidoKanban(venda, agoraMs, {
      colunaId: 'PRONTO_ENTREGA',
      slaPreparoMinutos: 20,
    })
    expect(relogio.rotuloDecorrido).toBe('10min')
    expect(deveExibirCronometroPreparoKanban('PRONTO_ENTREGA', venda)).toBe(false)
  })

  it('esconde o cronômetro congelado nas três superfícies sem o par de datas', () => {
    const semPar = criarVenda({ dataInicioPreparo: '2026-06-15T10:00:00.000Z' })
    const comPar = criarVenda({
      dataInicioPreparo: '2026-06-15T10:00:00.000Z',
      dataFinalizacaoPreparo: '2026-06-15T10:12:00.000Z',
    })
    expect(deveExibirCronometroPreparoKanban('EM_PREPARO', semPar)).toBe(true)
    expect(deveExibirCronometroPreparoKanban('PRONTO_ENTREGA', semPar)).toBe(false)
    expect(deveExibirCronometroPreparoKanban('EM_ROTA', semPar)).toBe(false)
    expect(deveExibirCronometroPreparoKanban('FINALIZADAS', semPar)).toBe(false)
    expect(deveExibirCronometroPreparoKanban('PRONTO_ENTREGA', comPar)).toBe(true)
    expect(deveExibirCronometroPreparoKanban('NOVOS_PEDIDOS', comPar)).toBe(false)
  })

  it('escolhe o instante mais recente por Date.parse, não pela string', () => {
    expect(
      escolherIsoMaisRecente('2026-06-15T10:00:00.000Z', '2026-06-15T07:30:00-03:00')
    ).toBe('2026-06-15T07:30:00-03:00')
  })

  it('clone não apaga dataInicioPreparo quando o patch manda null', () => {
    const venda = criarVenda({ dataInicioPreparo: '2026-06-15T10:00:00.000Z' })
    const clonada = cloneVendaUnificadaDTO(venda, { dataInicioPreparo: null })
    expect(clonada.dataInicioPreparo).toBe('2026-06-15T10:00:00.000Z')
  })
})
