import { describe, expect, it } from 'vitest'
import { geoJsonPointFromLatLng } from '@/src/shared/types/geoJsonPoint'
import { distanciaMetrosEntrePontos } from '@/src/shared/utils/calcularTaxaCoberturaPonto'
import {
  limitarPontoAoRaio,
  pinDentroDoRaioPermitido,
  RAIO_AJUSTE_PIN_METROS,
} from '@/src/shared/utils/ajustePinEmpresa'

const CENTRO = geoJsonPointFromLatLng(-15.6, -56.1)

describe('ajustePinEmpresa', () => {
  it('aceita pin no centro e a menos de 1 km', () => {
    expect(pinDentroDoRaioPermitido(CENTRO, CENTRO)).toBe(true)
    const perto = geoJsonPointFromLatLng(-15.6 + 0.002, -56.1)
    expect(distanciaMetrosEntrePontos(CENTRO, perto)).toBeLessThan(RAIO_AJUSTE_PIN_METROS)
    expect(pinDentroDoRaioPermitido(CENTRO, perto)).toBe(true)
  })

  it('rejeita pin a mais de 1 km do endereço', () => {
    const longe = geoJsonPointFromLatLng(-15.6 + 0.03, -56.1)
    expect(distanciaMetrosEntrePontos(CENTRO, longe)).toBeGreaterThan(RAIO_AJUSTE_PIN_METROS)
    expect(pinDentroDoRaioPermitido(CENTRO, longe)).toBe(false)
  })

  it('projeta o pin na borda de 1 km quando o arraste passa do limite', () => {
    const longe = geoJsonPointFromLatLng(-15.6 + 0.03, -56.1)
    const { ponto, limitado, metros } = limitarPontoAoRaio(CENTRO, longe)
    expect(limitado).toBe(true)
    expect(metros).toBeGreaterThan(RAIO_AJUSTE_PIN_METROS)
    expect(pinDentroDoRaioPermitido(CENTRO, ponto)).toBe(true)
    expect(distanciaMetrosEntrePontos(CENTRO, ponto)).toBeGreaterThan(RAIO_AJUSTE_PIN_METROS * 0.95)
    expect(distanciaMetrosEntrePontos(CENTRO, ponto)).toBeLessThanOrEqual(RAIO_AJUSTE_PIN_METROS + 15)
  })

  it('não altera ponto que já está dentro do raio', () => {
    const { ponto, limitado } = limitarPontoAoRaio(CENTRO, CENTRO)
    expect(limitado).toBe(false)
    expect(ponto).toEqual(CENTRO)
  })
})
