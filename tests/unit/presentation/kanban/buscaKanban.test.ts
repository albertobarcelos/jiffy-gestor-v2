import { describe, expect, it } from 'vitest'
import {
  ehTermoBuscaTelefoneKanban,
  isTermoBuscaValorKanban,
  normalizarTermoBuscaKanban,
  parseValorBuscaKanban,
  termoBuscaKanbanParaApi,
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
    expect(parseValorBuscaKanban('5565992934536')).toBe(null)
    expect(isTermoBuscaValorKanban('4,00')).toBe(true)
    expect(isTermoBuscaValorKanban('maria')).toBe(false)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('4,00'), '4,00')).toBe(true)
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('5,00'), '5,00')).toBe(false)
  })

  it('encontra por telefone do cliente (WhatsApp com 55 ou DDD local)', () => {
    const venda = criarVendaBusca({
      cliente: { id: 'c1', nome: 'Maria Silva', telefone: '65992934536' },
    } as Partial<VendaUnificadaDTO>)

    expect(ehTermoBuscaTelefoneKanban('39')).toBe(false)
    expect(ehTermoBuscaTelefoneKanban('5565992934536')).toBe(true)
    expect(termoBuscaKanbanParaApi('5565992934536')).toBe('65992934536')
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('5565992934536'), '5565992934536')).toBe(
      true
    )
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('65992934536'), '65992934536')).toBe(
      true
    )
    expect(vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('11999999999'), '11999999999')).toBe(
      false
    )
  })

  it('encontra pelo telefone do destinatário na entrega', () => {
    const venda = criarVendaBusca({
      cliente: { id: 'c1', nome: 'Maria Silva' },
      contextoEntrega: {
        destinatarioTelefone: '11988887777',
      },
    } as Partial<VendaUnificadaDTO>)

    expect(
      vendaAtendeBuscaKanban(venda, normalizarTermoBuscaKanban('11988887777'), '11988887777')
    ).toBe(true)
  })
})
