import { describe, expect, it } from 'vitest'
import {
  isTermoBuscaValorKanban,
  normalizarTermoBuscaKanban,
  parseValorBuscaKanban,
  vendaAtendeBuscaKanban,
} from '@/src/presentation/components/features/kanban/rules/vendasKanban.rules'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'

function criarVendaBusca(partial: Partial<VendaUnificadaDTO> = {}): VendaUnificadaDTO {
  const base = new VendaUnificadaDTO(
    'venda-1',
    1196,
    'ULUGSBYD',
    'balcao',
    'PDV',
    'venda',
    44,
    0,
    0,
    '2026-07-10T21:00:00.000Z',
    '2026-07-10T21:57:00.000Z',
    null,
    null,
    false,
    'EMITIDA',
    'doc-1',
    { id: '', nome: '—' }
  )
  return Object.assign(base, partial)
}

describe('busca Kanban — número e código do card', () => {
  it('normaliza # do código exibido no card', () => {
    expect(normalizarTermoBuscaKanban('#ULUGSBYD')).toBe('ulugsbyd')
    expect(normalizarTermoBuscaKanban('  1196  ')).toBe('1196')
  })

  it('encontra por numeroVenda (1196) e codigoVenda (ULUGSBYD)', () => {
    const venda = criarVendaBusca()

    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('1196'))).toBe(true)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('ULUGSBYD'))).toBe(true)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('#ULUGSBYD'))).toBe(true)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('ulu'))).toBe(true)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('9999'))).toBe(false)
  })

  it('encontra por nome do cliente', () => {
    const venda = criarVendaBusca({
      cliente: { id: 'c1', nome: 'Maria Silva' },
    } as Partial<VendaUnificadaDTO>)

    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('maria'))).toBe(true)
  })

  it('encontra por valor monetário (4,00)', () => {
    const venda = criarVendaBusca({ valorFinal: 4 } as Partial<VendaUnificadaDTO>)

    expect(parseValorBuscaKanban('4,00')).toBe(4)
    expect(parseValorBuscaKanban('R$ 4,00')).toBe(4)
    expect(isTermoBuscaValorKanban('4,00')).toBe(true)
    expect(isTermoBuscaValorKanban('maria')).toBe(false)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('4,00'), '4,00')).toBe(true)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('5,00'), '5,00')).toBe(false)
  })
})
