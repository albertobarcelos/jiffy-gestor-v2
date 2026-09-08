import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { montarUrlQuadro } from './montarUrlQuadro.mjs'

describe('montarUrlQuadro', () => {
  it('origem sem path vira lista de empresas', () => {
    assert.equal(
      montarUrlQuadro('http://127.0.0.1:5000'),
      'http://127.0.0.1:5000/pedidos/empresas?gestor'
    )
  })

  it('quadro sem empresa vira lista', () => {
    assert.equal(
      montarUrlQuadro('http://127.0.0.1:5000/pedidos?gestor'),
      'http://127.0.0.1:5000/pedidos/empresas?gestor'
    )
  })

  it('não duplica ?gestor', () => {
    assert.equal(
      montarUrlQuadro('http://127.0.0.1:5000/pedidos/empresas?gestor'),
      'http://127.0.0.1:5000/pedidos/empresas?gestor'
    )
  })

  it('preserva outros params', () => {
    assert.equal(
      montarUrlQuadro('https://gestor.homolog.jiffy.run/pedidos?x=1'),
      'https://gestor.homolog.jiffy.run/pedidos/empresas?x=1&gestor'
    )
  })

  it('origem inválida cai no dev', () => {
    assert.equal(montarUrlQuadro(':::'), 'http://127.0.0.1:5000/pedidos/empresas?gestor')
  })
})
