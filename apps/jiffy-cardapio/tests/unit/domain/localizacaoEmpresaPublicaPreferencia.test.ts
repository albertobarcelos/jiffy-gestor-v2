import { describe, expect, it } from 'vitest'
import { parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

/**
 * Espelha a preferência do hook: API > geocode.
 * (Hook é client-only; a regra pura fica testável aqui.)
 */
function resolverLocalizacaoEmpresa(params: {
  localizacaoApi: unknown
  localizacaoGeocode: ReturnType<typeof parseGeoJsonPoint>
}) {
  return parseGeoJsonPoint(params.localizacaoApi) ?? params.localizacaoGeocode
}

describe('localizacao empresa pública (P3)', () => {
  const pontoApi = {
    type: 'Point' as const,
    coordinates: [-57.0, -15.0] as [number, number],
  }
  const pontoGeocode = {
    type: 'Point' as const,
    coordinates: [-56.9, -14.9] as [number, number],
  }

  it('prefere localizacao da API quando válida', () => {
    expect(
      resolverLocalizacaoEmpresa({
        localizacaoApi: pontoApi,
        localizacaoGeocode: pontoGeocode,
      })
    ).toEqual(pontoApi)
  })

  it('usa geocode quando API é null/inválida', () => {
    expect(
      resolverLocalizacaoEmpresa({
        localizacaoApi: null,
        localizacaoGeocode: pontoGeocode,
      })
    ).toEqual(pontoGeocode)

    expect(
      resolverLocalizacaoEmpresa({
        localizacaoApi: { type: 'Point', coordinates: ['x', 'y'] },
        localizacaoGeocode: pontoGeocode,
      })
    ).toEqual(pontoGeocode)
  })
})
