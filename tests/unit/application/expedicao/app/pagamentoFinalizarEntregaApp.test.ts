import { describe, expect, it } from 'vitest'
import type { CobrancaAppEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import {
  alternarMeioNasLinhasFinalizarApp,
  atualizarValorLinhaFinalizarApp,
  filtrarMeiosPagamentoNaPortaApp,
  idMeioPagamentoPadraoFinalizarApp,
  montarLinhasIniciaisFinalizarApp,
  montarOpcoesMeioPagamentoFinalizarApp,
  montarPagamentosAoTrocarMeioFinalizarApp,
  montarPagamentosDasLinhasFinalizarApp,
  parseValorDigitadoFinalizarApp,
  valorACobrirFinalizarApp,
  valorJaPagoFinalizarApp,
  sanitizarTextoValorFinalizarApp,
  textoValorLinhaFinalizarApp,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'

const dinheiro: CobrancaAppEntregador = {
  id: 'cob-din',
  meioPagamentoId: 'mp-din',
  valor: 49.4,
  pendente: true,
  nome: 'Dinheiro',
}

const pixPago: CobrancaAppEntregador = {
  id: 'cob-pix',
  meioPagamentoId: 'mp-pix',
  valor: 20,
  pendente: false,
  nome: 'Pix',
}

describe('pagamentoFinalizarEntregaApp', () => {
  it('prefere o meio pendente na porta', () => {
    expect(idMeioPagamentoPadraoFinalizarApp([pixPago, dinheiro])).toBe('mp-din')
    expect(idMeioPagamentoPadraoFinalizarApp([pixPago])).toBe('mp-pix')
    expect(idMeioPagamentoPadraoFinalizarApp([])).toBeNull()
  })

  it('coloca o meio do pedido na frente das opções', () => {
    const opcoes = montarOpcoesMeioPagamentoFinalizarApp({
      cobrancas: [dinheiro],
      meios: [
        { id: 'mp-cartao', nome: 'Cartão' },
        { id: 'mp-din', nome: 'Dinheiro' },
        { id: 'mp-pix', nome: 'Pix' },
      ],
    })
    expect(opcoes[0]).toEqual({ id: 'mp-din', nome: 'Dinheiro', noPedido: true, jaPago: false })
    expect(opcoes.map(opcao => opcao.id)).toEqual(['mp-din', 'mp-cartao', 'mp-pix'])
  })

  it('não mexe nas cobranças se o entregador mantém o meio do pedido', () => {
    expect(
      montarPagamentosAoTrocarMeioFinalizarApp({
        cobrancas: [dinheiro],
        meioPagamentoId: 'mp-din',
        valorFinal: 49.4,
        faltaPagar: 49.4,
      })
    ).toBeNull()
  })

  it('troca só o que falta pagar e mantém o que já foi pago', () => {
    expect(
      montarPagamentosAoTrocarMeioFinalizarApp({
        cobrancas: [pixPago, dinheiro],
        meioPagamentoId: 'mp-cartao',
        valorFinal: 69.4,
        faltaPagar: 49.4,
      })
    ).toEqual([
      { id: 'cob-pix', meioPagamentoId: 'mp-pix', valor: 20 },
      { meioPagamentoId: 'mp-cartao', valor: 49.4 },
    ])
  })

  it('substitui pagamento já quitado quando o cliente pagou de outro jeito', () => {
    expect(
      montarPagamentosAoTrocarMeioFinalizarApp({
        cobrancas: [pixPago],
        meioPagamentoId: 'mp-din',
        valorFinal: 20,
        faltaPagar: 0,
      })
    ).toEqual([{ meioPagamentoId: 'mp-din', valor: 20 }])
  })

  it('na porta cobra o pedido, não a cédula, quando há troco', () => {
    const dinheiro: CobrancaAppEntregador = {
      id: 'cob-din',
      meioPagamentoId: 'mp-din',
      valor: 500,
      pendente: true,
      nome: 'Dinheiro',
    }
    expect(
      valorACobrirFinalizarApp({
        cobrancas: [dinheiro],
        valorFinal: 300,
        faltaPagar: 300,
      })
    ).toBe(300)
    expect(
      montarLinhasIniciaisFinalizarApp({
        cobrancas: [dinheiro],
        valorFinal: 300,
        faltaPagar: 300,
      })
    ).toEqual([{ meioPagamentoId: 'mp-din', valor: 300 }])
  })

  it('ignora faltaPagar da API quando as cobranças já separam o restante', () => {
    const dinheiroPago: CobrancaAppEntregador = {
      id: 'cob-din-pago',
      meioPagamentoId: 'mp-din',
      valor: 15,
      pendente: false,
      nome: 'Dinheiro',
    }
    const pixPorta: CobrancaAppEntregador = {
      id: 'cob-pix-porta',
      meioPagamentoId: 'mp-pix',
      valor: 285,
      pendente: true,
      nome: 'Pix',
    }
    expect(
      valorACobrirFinalizarApp({
        cobrancas: [dinheiroPago, pixPorta],
        valorFinal: 300,
        faltaPagar: 300,
      })
    ).toBe(285)
    expect(
      montarLinhasIniciaisFinalizarApp({
        cobrancas: [dinheiroPago, pixPorta],
        valorFinal: 300,
        faltaPagar: 300,
      })
    ).toEqual([{ meioPagamentoId: 'mp-pix', valor: 285 }])
  })

  it('alvo da porta é o restante do pedido, não o pagamento já efetivado', () => {
    expect(
      valorACobrirFinalizarApp({
        cobrancas: [pixPago, dinheiro],
        valorFinal: 69.4,
        faltaPagar: 49.4,
      })
    ).toBe(49.4)
    expect(valorJaPagoFinalizarApp([pixPago, dinheiro])).toBe(20)
    expect(
      montarLinhasIniciaisFinalizarApp({
        cobrancas: [pixPago, dinheiro],
        valorFinal: 69.4,
        faltaPagar: 49.4,
      })
    ).toEqual([{ meioPagamentoId: 'mp-din', valor: 49.4 }])
    expect(
      valorACobrirFinalizarApp({
        cobrancas: [pixPago],
        valorFinal: 20,
        faltaPagar: 0,
      })
    ).toBe(0)
    expect(
      montarLinhasIniciaisFinalizarApp({
        cobrancas: [pixPago],
        valorFinal: 20,
        faltaPagar: 0,
      })
    ).toEqual([])
  })

  it('permite duas formas na porta e reparte o valor', () => {
    const inicial = montarLinhasIniciaisFinalizarApp({
      cobrancas: [dinheiro],
      valorFinal: 49.4,
      faltaPagar: 49.4,
    })
    expect(inicial).toEqual([{ meioPagamentoId: 'mp-din', valor: 49.4 }])
    const duas = alternarMeioNasLinhasFinalizarApp({
      linhas: inicial,
      meioPagamentoId: 'mp-pix',
      valorAlvo: 49.4,
    })
    expect(duas).toEqual([
      { meioPagamentoId: 'mp-din', valor: 24.7 },
      { meioPagamentoId: 'mp-pix', valor: 24.7 },
    ])
    const repartido = atualizarValorLinhaFinalizarApp({
      linhas: duas,
      indice: 0,
      valor: 20,
      valorAlvo: 49.4,
    })
    expect(repartido).toEqual([
      { meioPagamentoId: 'mp-din', valor: 20 },
      { meioPagamentoId: 'mp-pix', valor: 29.4 },
    ])
    expect(
      montarPagamentosDasLinhasFinalizarApp({
        cobrancas: [pixPago, dinheiro],
        linhas: [
          { meioPagamentoId: 'mp-din', valor: 20 },
          { meioPagamentoId: 'mp-cartao', valor: 29.4 },
        ],
        valorFinal: 69.4,
        faltaPagar: 49.4,
      })
    ).toEqual([
      { id: 'cob-pix', meioPagamentoId: 'mp-pix', valor: 20 },
      { meioPagamentoId: 'mp-din', valor: 20 },
      { meioPagamentoId: 'mp-cartao', valor: 29.4 },
    ])
  })

  it('campo de valor vazio não deixa zero preso no final', () => {
    expect(textoValorLinhaFinalizarApp(0)).toBe('')
    expect(textoValorLinhaFinalizarApp(64)).toBe('64')
    expect(textoValorLinhaFinalizarApp(24.7)).toBe('24,7')
    expect(parseValorDigitadoFinalizarApp('')).toBeNull()
    expect(parseValorDigitadoFinalizarApp('60')).toBe(60)
    expect(parseValorDigitadoFinalizarApp('060')).toBe(60)
    expect(sanitizarTextoValorFinalizarApp('')).toBe('')
    expect(sanitizarTextoValorFinalizarApp('060')).toBe('60')
    expect(sanitizarTextoValorFinalizarApp('0,50')).toBe('0,50')
  })

  it('lista meios da porta mesmo se a loja usa TEF no PDV', () => {
    expect(
      filtrarMeiosPagamentoNaPortaApp([
        { id: 'mp-pix', nome: 'PIX', ativo: true },
        { id: 'mp-din', nome: 'Dinheiro', ativo: true },
        { id: 'mp-off', nome: 'Inativo', ativo: false },
        { id: '', nome: 'Sem id' },
      ])
    ).toEqual([
      { id: 'mp-pix', nome: 'PIX' },
      { id: 'mp-din', nome: 'Dinheiro' },
    ])
  })
})
