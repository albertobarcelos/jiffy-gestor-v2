import { describe, expect, it } from 'vitest'
import {
  montarCodigoBarrasEntregador,
  montarCodigoBarrasPedido,
  parseCodigoBarrasExpedicao,
} from '@/src/application/expedicao/parseCodigoBarrasExpedicao'

describe('parseCodigoBarrasExpedicao', () => {
  it('lê senha de 4 dígitos e crachá com prefixo M', () => {
    expect(parseCodigoBarrasExpedicao('1842')).toEqual({ tipo: 'entregador', senha: '1842' })
    expect(parseCodigoBarrasExpedicao('M1842')).toEqual({ tipo: 'entregador', senha: '1842' })
  })

  it('lê pedido com e sem prefixo P', () => {
    expect(parseCodigoBarrasExpedicao('PTBIMLFJA')).toEqual({
      tipo: 'pedido',
      codigoVenda: 'TBIMLFJA',
    })
    expect(parseCodigoBarrasExpedicao('tbimlfja')).toEqual({
      tipo: 'pedido',
      codigoVenda: 'TBIMLFJA',
    })
  })

  it('ignora lixo', () => {
    expect(parseCodigoBarrasExpedicao('')).toBeNull()
    expect(parseCodigoBarrasExpedicao('***')).toBeNull()
  })

  it('aceita prefixo e sufixo do leitor HID', () => {
    expect(parseCodigoBarrasExpedicao('\u001bPABC123\r')).toEqual({
      tipo: 'pedido',
      codigoVenda: 'ABC123',
    })
  })

  it('monta o código impresso', () => {
    expect(montarCodigoBarrasPedido('tbimlfja')).toBe('PTBIMLFJA')
    expect(montarCodigoBarrasEntregador('1842')).toBe('M1842')
  })
})
