import { describe, expect, it } from 'vitest'
import {
  ancoraInicioPreparoKanban,
  formatarCronometroMmSs,
  minutosPreparoConcluido,
  relogioPedidoKanban,
} from '@/src/presentation/components/features/kanban/utils/kanbanPedidoTempo'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'

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
})
