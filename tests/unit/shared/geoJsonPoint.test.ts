import { describe, expect, it } from 'vitest'
import { parseGeoJsonPoint, geoJsonPointFromLatLng, pontosGeoIguais } from '@/src/shared/types/geoJsonPoint'

describe('parseGeoJsonPoint', () => {
  it('aceita Point válido [lng, lat]', () => {
    const point = parseGeoJsonPoint({
      type: 'Point',
      coordinates: [-56.1, -15.6],
    })
    expect(point).toEqual({ type: 'Point', coordinates: [-56.1, -15.6] })
  })

  it('rejeita tipo inválido ou coordenadas ausentes', () => {
    expect(parseGeoJsonPoint(null)).toBeNull()
    expect(parseGeoJsonPoint({ type: 'LineString', coordinates: [1, 2] })).toBeNull()
    expect(parseGeoJsonPoint({ type: 'Point', coordinates: ['x', 1] })).toBeNull()
  })
})

describe('geoJsonPointFromLatLng', () => {
  it('monta GeoJSON na ordem longitude, latitude', () => {
    expect(geoJsonPointFromLatLng(-15.6, -56.1)).toEqual({
      type: 'Point',
      coordinates: [-56.1, -15.6],
    })
  })
})

describe('pontosGeoIguais', () => {
  it('trata null como iguais entre si e diferentes de um ponto', () => {
    expect(pontosGeoIguais(null, null)).toBe(true)
    expect(pontosGeoIguais(null, geoJsonPointFromLatLng(-15.6, -56.1))).toBe(false)
  })

  it('aceita diferença menor que o epsilon', () => {
    const a = geoJsonPointFromLatLng(-15.6, -56.1)
    const b = geoJsonPointFromLatLng(-15.6 + 1e-8, -56.1)
    expect(pontosGeoIguais(a, b)).toBe(true)
  })

  it('rejeita pontos distantes', () => {
    expect(
      pontosGeoIguais(geoJsonPointFromLatLng(-15.6, -56.1), geoJsonPointFromLatLng(-15.61, -56.1))
    ).toBe(false)
  })
})
