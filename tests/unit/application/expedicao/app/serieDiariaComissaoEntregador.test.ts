import { describe, expect, it } from 'vitest'
import {
  recortarComissaoNoDia,
  serieDiariaComissaoEntregador,
} from '@/src/application/expedicao/app/serieDiariaComissaoEntregador'

const itens = [
  {
    id: '1',
    codigoVenda: 'A',
    numeroVenda: 1,
    clienteNome: 'Ana',
    taxaEntrega: 5,
    valorFinal: 40,
    dataFinalizacao: new Date(2026, 9, 20, 18, 0).toISOString(),
  },
  {
    id: '2',
    codigoVenda: 'B',
    numeroVenda: 2,
    clienteNome: 'Bia',
    taxaEntrega: 7,
    valorFinal: 50,
    dataFinalizacao: new Date(2026, 9, 22, 12, 0).toISOString(),
  },
  {
    id: '3',
    codigoVenda: 'C',
    numeroVenda: 3,
    clienteNome: 'Caio',
    taxaEntrega: 3,
    valorFinal: 20,
    dataFinalizacao: new Date(2026, 9, 22, 21, 0).toISOString(),
  },
]

describe('serieDiariaComissaoEntregador', () => {
  it('preenche os dias vazios e soma o dia com duas entregas', () => {
    const serie = serieDiariaComissaoEntregador({
      itens,
      intervalo: {
        inicio: new Date(2026, 9, 20, 0, 0, 0, 0),
        fim: new Date(2026, 9, 22, 23, 59, 59, 999),
      },
      destaqueDia: '2026-10-22',
    })
    expect(serie).toHaveLength(3)
    expect(serie[0]).toMatchObject({ dia: '2026-10-20', total: 5, quantidade: 1, destaque: false })
    expect(serie[1]).toMatchObject({ dia: '2026-10-21', total: 0, quantidade: 0, destaque: false })
    expect(serie[2]).toMatchObject({ dia: '2026-10-22', total: 10, quantidade: 2, destaque: true })
  })
})

describe('recortarComissaoNoDia', () => {
  it('filtra total e lista pelo dia local', () => {
    const recorte = recortarComissaoNoDia(
      { totalTaxas: 15, quantidade: 3, itens },
      '2026-10-22'
    )
    expect(recorte.quantidade).toBe(2)
    expect(recorte.totalTaxas).toBe(10)
    expect(recorte.itens.map(item => item.id)).toEqual(['2', '3'])
  })
})
