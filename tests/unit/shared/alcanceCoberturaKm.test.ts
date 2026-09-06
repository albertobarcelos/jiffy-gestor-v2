import { describe, expect, it } from 'vitest'
import { faixasKmFaltantes, sincronizarFaixasAlcanceKm } from '@/src/shared/utils/alcanceCoberturaKm'
import { geoJsonPolygonDeCirculo, pathsDeCirculo, pathsDeAnelFaixa } from '@/src/shared/utils/geoJsonCircle'

describe('alcanceCoberturaKm', () => {
  it('lista faixas 1..N que ainda não existem', () => {
    expect(faixasKmFaltantes([{ distanciaMaximaEmMetros: 1000 }], 3)).toEqual([2, 3])
    expect(faixasKmFaltantes([], 2)).toEqual([1, 2])
    expect(faixasKmFaltantes([{ distanciaMaximaEmMetros: 1500 }], 1)).toEqual([1])
  })

  it('ao reduzir 10 km para 4 km, remove as faixas acima e não recria 1..4', () => {
    const raios = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(km => ({
      id: `r${km}`,
      distanciaMaximaEmMetros: km * 1000,
    }))
    expect(sincronizarFaixasAlcanceKm(raios, 4)).toEqual({
      criarKm: [],
      excluirIds: ['r5', 'r6', 'r7', 'r8', 'r9', 'r10'],
    })
  })

  it('ao ampliar 4 km para 7 km, cria só as faixas que faltam', () => {
    const raios = [1, 2, 3, 4].map(km => ({
      id: `r${km}`,
      distanciaMaximaEmMetros: km * 1000,
    }))
    expect(sincronizarFaixasAlcanceKm(raios, 7)).toEqual({
      criarKm: [5, 6, 7],
      excluirIds: [],
    })
  })

  it('alcance 4 km sem raios cria 1..4 km', () => {
    expect(sincronizarFaixasAlcanceKm([], 4)).toEqual({
      criarKm: [1, 2, 3, 4],
      excluirIds: [],
    })
  })
})

describe('geoJsonCircle', () => {
  it('gera polígono fechado com vértices suficientes', () => {
    const paths = pathsDeCirculo({ lat: -13.83, lng: -56.08 }, 1000)
    expect(paths.length).toBe(64)
    const polygon = geoJsonPolygonDeCirculo({ lat: -13.83, lng: -56.08 }, 500)
    expect(polygon.type).toBe('Polygon')
    expect(polygon.coordinates[0].length).toBeGreaterThanOrEqual(4)
  })

  it('a faixa de 2 para 3 km vira anel com furo', () => {
    const anel = pathsDeAnelFaixa({ lat: -13.83, lng: -56.08 }, 2000, 3000)
    expect(anel).toHaveLength(2)
    expect(anel[0].length).toBe(64)
    expect(anel[1].length).toBe(64)
  })
})
