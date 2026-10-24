import { describe, expect, it } from 'vitest'
import {
  digitosTelefoneApp,
  hrefLigarApp,
  hrefWhatsAppApp,
} from '@/src/application/expedicao/app/telefoneEntregadorApp'

describe('telefoneEntregadorApp', () => {
  it('normaliza celular com DDD', () => {
    expect(digitosTelefoneApp('(67) 99999-1234')).toBe('5567999991234')
    expect(hrefLigarApp('(67) 99999-1234')).toBe('tel:+5567999991234')
    expect(hrefWhatsAppApp('(67) 99999-1234')).toBe('https://wa.me/5567999991234')
  })

  it('ignora lixo curto', () => {
    expect(digitosTelefoneApp('123')).toBeNull()
    expect(hrefLigarApp(null)).toBeNull()
  })
})
