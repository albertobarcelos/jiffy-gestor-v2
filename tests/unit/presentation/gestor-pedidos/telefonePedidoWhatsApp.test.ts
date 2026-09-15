import { describe, expect, it } from 'vitest'
import {
  digitosTelefonePedidoWhatsApp,
  telefoneWhatsAppParaCampoPedido,
} from '@/src/presentation/gestor-pedidos/whatsapp/telefonePedidoWhatsApp'

describe('telefonePedidoWhatsApp', () => {
  it('tira o DDI 55 e mascara o celular', () => {
    expect(telefoneWhatsAppParaCampoPedido('5565992934536')).toBe('(65) 99293-4536')
    expect(digitosTelefonePedidoWhatsApp('5565992934536')).toBe('65992934536')
  })

  it('aceita numero ja nacional', () => {
    expect(telefoneWhatsAppParaCampoPedido('65992934536')).toBe('(65) 99293-4536')
  })

  it('le o numero no formato do painel Dados do contato', () => {
    expect(telefoneWhatsAppParaCampoPedido('+55 65 9813-8428')).toBe('(65) 9813-8428')
    expect(digitosTelefonePedidoWhatsApp('+55 65 9813-8428')).toBe('6598138428')
  })

  it('ignora valor curto', () => {
    expect(telefoneWhatsAppParaCampoPedido('123')).toBe('')
    expect(digitosTelefonePedidoWhatsApp('123')).toBe('')
  })
})
