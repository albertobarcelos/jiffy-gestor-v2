import { describe, expect, it } from 'vitest'
import {
  chaveCacheBuscaComissao,
  chaveRecorteListaComissao,
  comissaoExibidaNaLista,
  diaDestaqueGraficoComissao,
  intervaloBuscaComissao,
  visaoComissaoEntregador,
} from '@/src/application/expedicao/app/visaoComissaoEntregador'

const agora = new Date(2026, 9, 23, 18, 0, 0)

describe('visaoComissaoEntregador', () => {
  it('intervalo escolhido ganha do período', () => {
    expect(
      visaoComissaoEntregador({
        periodo: 'semana',
        intervaloFiltro: { inicio: '2026-10-20', fim: '2026-10-22' },
      })
    ).toEqual({ tipo: 'intervalo', inicio: '2026-10-20', fim: '2026-10-22' })
    expect(visaoComissaoEntregador({ periodo: 'mes', intervaloFiltro: null })).toEqual({
      tipo: 'periodo',
      periodo: 'mes',
    })
  })
})

describe('intervaloBuscaComissao', () => {
  it('hoje busca a semana, não só o dia', () => {
    const { inicio, fim } = intervaloBuscaComissao({ tipo: 'periodo', periodo: 'hoje' }, agora)
    expect(inicio.getDate()).toBe(18)
    expect(fim.getDate()).toBe(23)
  })

  it('intervalo customizado busca exatamente o recorte', () => {
    const { inicio, fim } = intervaloBuscaComissao(
      { tipo: 'intervalo', inicio: '2026-10-20', fim: '2026-10-22' },
      agora
    )
    expect(inicio.getDate()).toBe(20)
    expect(fim.getDate()).toBe(22)
  })
})

describe('recorte e cache', () => {
  it('hoje e semana compartilham a mesma busca', () => {
    expect(chaveCacheBuscaComissao({ tipo: 'periodo', periodo: 'hoje' }, agora)).toBe(
      chaveCacheBuscaComissao({ tipo: 'periodo', periodo: 'semana' }, agora)
    )
  })

  it('lista de hoje recorta o dia; intervalo não recorta', () => {
    expect(chaveRecorteListaComissao({ tipo: 'periodo', periodo: 'hoje' }, agora)).toBe('2026-10-23')
    expect(chaveRecorteListaComissao({ tipo: 'periodo', periodo: 'semana' }, agora)).toBeNull()
    expect(
      chaveRecorteListaComissao(
        { tipo: 'intervalo', inicio: '2026-10-20', fim: '2026-10-22' },
        agora
      )
    ).toBeNull()
  })

  it('destaque do gráfico é o dia da visão', () => {
    expect(
      diaDestaqueGraficoComissao(
        { tipo: 'intervalo', inicio: '2026-10-18', fim: '2026-10-20' },
        agora
      )
    ).toBe('2026-10-20')
    expect(diaDestaqueGraficoComissao({ tipo: 'periodo', periodo: 'semana' }, agora)).toBe(
      '2026-10-23'
    )
  })

  it('lista recortada some taxas só do dia', () => {
    const bruto = {
      totalTaxas: 15,
      quantidade: 2,
      itens: [
        {
          id: '1',
          codigoVenda: 'A',
          numeroVenda: 1,
          clienteNome: 'A',
          taxaEntrega: 5,
          valorFinal: 10,
          dataFinalizacao: new Date(2026, 9, 23, 10, 0).toISOString(),
        },
        {
          id: '2',
          codigoVenda: 'B',
          numeroVenda: 2,
          clienteNome: 'B',
          taxaEntrega: 10,
          valorFinal: 20,
          dataFinalizacao: new Date(2026, 9, 22, 10, 0).toISOString(),
        },
      ],
    }
    const lista = comissaoExibidaNaLista(bruto, { tipo: 'periodo', periodo: 'hoje' }, agora)
    expect(lista?.quantidade).toBe(1)
    expect(lista?.totalTaxas).toBe(5)
  })
})
