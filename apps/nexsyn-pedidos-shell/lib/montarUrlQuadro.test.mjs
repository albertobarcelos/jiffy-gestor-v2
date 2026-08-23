import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { montarUrlQuadro } from './montarUrlQuadro.mjs'

describe('montarUrlQuadro', () => {
  it('origem sem path vira /pedidos?gestor', () => {
    assert.equal(montarUrlQuadro('http://localhost:5000'), 'http://localhost:5000/pedidos?gestor')
  })

  it('não duplica ?gestor', () => {
    assert.equal(
      montarUrlQuadro('http://localhost:5000/pedidos?gestor'),
      'http://localhost:5000/pedidos?gestor'
    )
  })

  it('preserva outros params', () => {
    assert.equal(
      montarUrlQuadro('https://gestor.homolog.jiffy.run/pedidos?x=1'),
      'https://gestor.homolog.jiffy.run/pedidos?x=1&gestor'
    )
  })

  it('origem inválida cai no dev', () => {
    assert.equal(montarUrlQuadro(':::'), 'http://localhost:5000/pedidos?gestor')
  })
})
