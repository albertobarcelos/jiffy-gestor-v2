import { describe, expect, it } from 'vitest'
import { parseGeoJsonPoint, geoJsonPointFromLatLng } from '@/src/shared/types/geoJsonPoint'

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
