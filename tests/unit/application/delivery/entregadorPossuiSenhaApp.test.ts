import { describe, expect, it } from 'vitest'
import { entregadorPossuiSenhaApp } from '@/src/application/delivery/entregadorPossuiSenhaApp'

describe('entregadorPossuiSenhaApp', () => {
  it('usa o booleano do backend quando vier', () => {
    expect(entregadorPossuiSenhaApp({ senhaCadastrada: true })).toBe(true)
    expect(entregadorPossuiSenhaApp({ temSenha: false })).toBe(false)
  })

  it('trata senha preenchida como cadastrada', () => {
    expect(entregadorPossuiSenhaApp({ senha: '1234' })).toBe(true)
    expect(entregadorPossuiSenhaApp({ senha: '' })).toBe(false)
  })

  it('devolve null no GET atual, que omite a senha', () => {
    expect(
      entregadorPossuiSenhaApp({
        id: '1',
        nome: 'Joana',
        cpf: '30424173875',
      })
    ).toBeNull()
  })
})
