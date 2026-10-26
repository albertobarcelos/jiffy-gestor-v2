import { describe, expect, it } from 'vitest'
import {
  montarQueryListagemMeiosPagamento,
  parseFiltroListagemMeiosPagamento,
} from '@/src/application/meios-pagamentos/listagemMeiosPagamentoQuery'

describe('parseFiltroListagemMeiosPagamento', () => {
  it('lê entrega e retirada do GET do BFF', () => {
    const filtro = parseFiltroListagemMeiosPagamento(
      new URLSearchParams(
        'limit=50&offset=10&q=pix&ativoEntregaDelivery=true&ativoRetiradaDelivery=false'
      )
    )
    expect(filtro).toEqual({
      limit: 50,
      offset: 10,
      q: 'pix',
      ativo: null,
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
      ativoDelivery: null,
    })
  })

  it('ausente não vira false — o use case não restringe o canal', () => {
    expect(parseFiltroListagemMeiosPagamento(new URLSearchParams('limit=10&offset=0'))).toMatchObject({
      ativoEntregaDelivery: null,
      ativoRetiradaDelivery: null,
      ativoDelivery: null,
    })
  })
})

describe('montarQueryListagemMeiosPagamento', () => {
  it('repete o filtro do novo pedido no BFF e na API externa', () => {
    const query = montarQueryListagemMeiosPagamento({
      limit: 100,
      offset: 0,
      ativoEntregaDelivery: true,
      ativoDelivery: true,
    })
    expect(query.get('ativoEntregaDelivery')).toBe('true')
    expect(query.get('ativoDelivery')).toBe('true')
    expect(query.get('ativoRetiradaDelivery')).toBeNull()
  })

  it('ativoDelivery legado preenche só a entrega e segue na URL', () => {
    const query = montarQueryListagemMeiosPagamento({
      limit: 10,
      offset: 0,
      ativoDelivery: true,
    })
    expect(query.get('ativoEntregaDelivery')).toBe('true')
    expect(query.get('ativoDelivery')).toBe('true')
    expect(query.get('ativoRetiradaDelivery')).toBeNull()
  })

  it('retirada com legado não inventa filtro de entrega', () => {
    const query = montarQueryListagemMeiosPagamento({
      limit: 10,
      offset: 0,
      ativoRetiradaDelivery: true,
      ativoDelivery: true,
    })
    expect(query.get('ativoEntregaDelivery')).toBeNull()
    expect(query.get('ativoRetiradaDelivery')).toBe('true')
    expect(query.get('ativoDelivery')).toBe('true')
  })

  it('flag nova de entrega ganha do legado', () => {
    const query = montarQueryListagemMeiosPagamento({
      limit: 10,
      offset: 0,
      ativoDelivery: true,
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: true,
    })
    expect(query.get('ativoEntregaDelivery')).toBe('false')
    expect(query.get('ativoRetiradaDelivery')).toBe('true')
    expect(query.get('ativoDelivery')).toBe('true')
  })
})
