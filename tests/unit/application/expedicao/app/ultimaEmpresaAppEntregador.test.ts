import { describe, expect, it } from 'vitest'
import {
  decidirRestaurarSessaoEmpresaApp,
  parseUltimaEmpresaAppEntregador,
  ultimaEmpresaCompativelComUsuarioApp,
} from '@/src/application/expedicao/app/ultimaEmpresaAppEntregador'

const ultima = {
  userId: 'user-1',
  empresaId: 'emp-a',
  empresaNome: 'Loja A',
  empParam: 'loja-a-abcd1234',
}

describe('ultimaEmpresaAppEntregador', () => {
  it('parseia a última empresa gravada', () => {
    expect(parseUltimaEmpresaAppEntregador(JSON.stringify(ultima))).toEqual(ultima)
  })

  it('recusa JSON sem empresa', () => {
    expect(parseUltimaEmpresaAppEntregador('{"userId":"x"}')).toBeNull()
    expect(parseUltimaEmpresaAppEntregador('')).toBeNull()
  })

  it('não reutiliza a empresa de outro utilizador', () => {
    expect(ultimaEmpresaCompativelComUsuarioApp(ultima, 'user-2')).toBeNull()
    expect(ultimaEmpresaCompativelComUsuarioApp(ultima, 'user-1')).toEqual(ultima)
    expect(ultimaEmpresaCompativelComUsuarioApp(ultima, null)).toEqual(ultima)
  })

  it('com tenant válido não restaura', () => {
    expect(
      decidirRestaurarSessaoEmpresaApp({
        tenantValido: true,
        identityValida: false,
        ultima,
        userIdAtual: 'user-1',
      })
    ).toEqual({ tipo: 'ja-ativa' })
  })

  it('restaura a última loja deste utilizador', () => {
    expect(
      decidirRestaurarSessaoEmpresaApp({
        tenantValido: false,
        identityValida: false,
        ultima,
        userIdAtual: 'user-1',
      })
    ).toEqual({ tipo: 'restaurar', ultima })
  })

  it('sem última e com identidade vai escolher loja', () => {
    expect(
      decidirRestaurarSessaoEmpresaApp({
        tenantValido: false,
        identityValida: true,
        ultima: null,
        userIdAtual: 'user-1',
      })
    ).toEqual({ tipo: 'escolher' })
  })

  it('sem última e sem identidade vai ao login', () => {
    expect(
      decidirRestaurarSessaoEmpresaApp({
        tenantValido: false,
        identityValida: false,
        ultima: null,
        userIdAtual: null,
      })
    ).toEqual({ tipo: 'login' })
  })
})
