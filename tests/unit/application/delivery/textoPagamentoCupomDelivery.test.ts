import { describe, expect, it } from 'vitest'
import {
  avisoCobrancaEntregadorCupom,
  linhasResumoPagamentoCupom,
} from '@/src/application/delivery/textoPagamentoCupomDelivery'

const formatar = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`

describe('textoPagamentoCupomDelivery', () => {
  const pagamentoMisto = {
    cobrarCliente: true,
    valorCobrarNaEntrega: 15,
    valorRecebido: 30,
    meios: [
      { nome: 'Dinheiro', valor: 30, naEntrega: false },
      { nome: 'Crédito', valor: 15, naEntrega: true },
    ],
  }

  it('coloca o já pago só no resumo', () => {
    expect(linhasResumoPagamentoCupom(pagamentoMisto, formatar)).toEqual([
      { left: 'Pago em DINHEIRO', right: 'R$ 30,00' },
    ])
  })

  it('identifica a cobrança numa frase forma e valor', () => {
    expect(avisoCobrancaEntregadorCupom(pagamentoMisto, formatar)).toEqual({
      linhas: [{ left: 'COBRAR CRÉDITO', right: 'R$ 15,00' }],
    })
  })
})
