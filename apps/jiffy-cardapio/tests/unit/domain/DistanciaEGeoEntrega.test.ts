import { describe, expect, it } from 'vitest'
import { calcularDistanciaMetrosEntrePontos } from '@/src/domain/services/DistanciaEntrePontos'
import {
  enderecoEntregaTemGeolocalizacao,
  entregaRequerGeolocalizacaoDoEndereco,
} from '@/src/domain/policies/EnderecoEntregaRequerGeolocalizacao'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

const ponto = (lng: number, lat: number): GeoJsonPoint => ({
  type: 'Point',
  coordinates: [lng, lat],
})

describe('DistanciaEntrePontos', () => {
  it('retorna null se faltar ponto', () => {
    expect(calcularDistanciaMetrosEntrePontos(null, ponto(-57, -15))).toBeNull()
  })

  it('calcula distância aproximada entre pontos próximos', () => {
    const a = ponto(-57.0, -15.0)
    const b = ponto(-57.01, -15.0)
    const metros = calcularDistanciaMetrosEntrePontos(a, b)
    expect(metros).not.toBeNull()
    expect(metros!).toBeGreaterThan(900)
    expect(metros!).toBeLessThan(1200)
  })
})

describe('EnderecoEntregaRequerGeolocalizacao', () => {
  it('detecta presença de geo', () => {
    expect(enderecoEntregaTemGeolocalizacao({})).toBe(false)
    expect(
      enderecoEntregaTemGeolocalizacao({ enderecoLocalizacao: ponto(-57, -15) })
    ).toBe(true)
  })

  it('entrega requer geo só no tipo entrega sem localização', () => {
    expect(
      entregaRequerGeolocalizacaoDoEndereco({
        tipoEntrega: 'retirada',
        endereco: {},
      })
    ).toBe(false)
    expect(
      entregaRequerGeolocalizacaoDoEndereco({
        tipoEntrega: 'entrega',
        endereco: { enderecoLocalizacao: ponto(-57, -15) },
      })
    ).toBe(false)
    expect(
      entregaRequerGeolocalizacaoDoEndereco({
        tipoEntrega: 'entrega',
        endereco: {},
      })
    ).toBe(true)
  })
})
