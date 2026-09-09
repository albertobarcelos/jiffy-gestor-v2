import { describe, expect, it } from 'vitest'
import {
  alcanceKmDaCobertura,
  formatAlcanceAteKm,
  formatDistanciaRaio,
  kmParaMetrosRaio,
  metrosParaKmRaio,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'

describe('cobertura raio em km', () => {
  it('converte km para metros na API', () => {
    expect(kmParaMetrosRaio(1)).toBe(1000)
    expect(kmParaMetrosRaio(4)).toBe(4000)
    expect(kmParaMetrosRaio(1.5)).toBe(1500)
  })

  it('exibe alcance em km, não em metros', () => {
    expect(formatDistanciaRaio(1000)).toBe('1 km')
    expect(formatDistanciaRaio(4000)).toBe('4 km')
    expect(formatDistanciaRaio(1500)).toBe('1,5 km')
    expect(metrosParaKmRaio(2000)).toBe(2)
  })

  it('formata faixa como Até N km', () => {
    expect(formatAlcanceAteKm(1000)).toBe('Até 1 km')
  })

  it('calcula o alcance pelo maior raio', () => {
    expect(alcanceKmDaCobertura([])).toBe(0)
    expect(
      alcanceKmDaCobertura([
        { distanciaMaximaEmMetros: 1000 },
        { distanciaMaximaEmMetros: 3500 },
      ])
    ).toBe(4)
  })
})
