import { describe, expect, it } from 'vitest'
import {
  hrefGoogleMapsNavegacaoApp,
  hrefWazeNavegacaoApp,
  montarEnderecoNavegacaoApp,
} from '@/src/application/expedicao/app/navegacaoEntregadorApp'

describe('navegacaoEntregadorApp', () => {
  it('monta o endereço que o backend já manda', () => {
    expect(
      montarEnderecoNavegacaoApp({
        rua: 'RUA SETE',
        numero: '40',
        bairro: 'COHAB JOÃO CRISTINI',
        cidade: 'BARRA DO BUGRES',
        estado: 'MT',
        cep: '78390000',
      })
    ).toBe('RUA SETE, 40 — COHAB JOÃO CRISTINI — BARRA DO BUGRES — MT — 78390-000')
  })

  it('abre o Waze pela busca quando não há pin', () => {
    const href = hrefWazeNavegacaoApp({
      endereco: 'RUA SETE, 40 — BARRA DO BUGRES — MT',
    })
    expect(href).toContain('https://waze.com/ul?q=')
    expect(href).toContain('navigate=yes')
    expect(href).toContain(encodeURIComponent('RUA SETE, 40 — BARRA DO BUGRES — MT'))
  })

  it('prefere coordenadas no Waze e no Maps', () => {
    expect(hrefWazeNavegacaoApp({ endereco: 'x', latitude: -15.1, longitude: -56.2 })).toBe(
      'https://waze.com/ul?ll=-15.1,-56.2&navigate=yes'
    )
    expect(hrefGoogleMapsNavegacaoApp({ endereco: 'x', latitude: -15.1, longitude: -56.2 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-15.1,-56.2'
    )
  })

  it('sem endereço e sem pin não gera link', () => {
    expect(hrefWazeNavegacaoApp({ endereco: null })).toBeNull()
    expect(hrefGoogleMapsNavegacaoApp({ endereco: '   ' })).toBeNull()
  })
})
