import { describe, expect, it } from 'vitest'
import {
  detectarCirculoEmPaths,
  pathsDeCirculo,
} from '@/src/shared/utils/geoJsonCircle'

describe('detectarCirculoEmPaths', () => {
  it('reconhece polígono gerado pela ferramenta círculo', () => {
    const centro = { lat: -23.55, lng: -46.63 }
    const paths = pathsDeCirculo(centro, 500)
    const detectado = detectarCirculoEmPaths(paths)
    expect(detectado).not.toBeNull()
    expect(detectado!.raioMetros).toBeGreaterThan(480)
    expect(detectado!.raioMetros).toBeLessThan(520)
    expect(detectado!.centro.lat).toBeCloseTo(centro.lat, 3)
    expect(detectado!.centro.lng).toBeCloseTo(centro.lng, 3)
  })

  it('rejeita polígono irregular', () => {
    const paths = [
      { lat: -23.55, lng: -46.63 },
      { lat: -23.56, lng: -46.62 },
      { lat: -23.57, lng: -46.64 },
      { lat: -23.55, lng: -46.65 },
      { lat: -23.54, lng: -46.63 },
      { lat: -23.55, lng: -46.61 },
      { lat: -23.56, lng: -46.66 },
      { lat: -23.58, lng: -46.62 },
      { lat: -23.53, lng: -46.64 },
      { lat: -23.57, lng: -46.61 },
      { lat: -23.54, lng: -46.66 },
      { lat: -23.56, lng: -46.63 },
    ]
    expect(detectarCirculoEmPaths(paths)).toBeNull()
  })
})
