import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { distanciaMetrosEntrePontos } from '@/src/shared/utils/calcularTaxaCoberturaPonto'

/** Ajuste fino do pin da loja — não é mudança de endereço. */
export const RAIO_AJUSTE_PIN_METROS = 1000

export function pinDentroDoRaioPermitido(
  centroEndereco: GeoJsonPoint,
  pin: GeoJsonPoint,
  raioMetros = RAIO_AJUSTE_PIN_METROS
): boolean {
  return distanciaMetrosEntrePontos(centroEndereco, pin) <= raioMetros
}

/**
 * Se o ponto passar do raio, projeta na borda (interpolação linear em lat/lng).
 * Em 1 km o erro vs geodésica é desprezível para o ajuste do pin.
 */
export function limitarPontoAoRaio(
  centroEndereco: GeoJsonPoint,
  ponto: GeoJsonPoint,
  raioMetros = RAIO_AJUSTE_PIN_METROS
): { ponto: GeoJsonPoint; limitado: boolean; metros: number } {
  const metros = distanciaMetrosEntrePontos(centroEndereco, ponto)
  if (metros <= raioMetros) {
    return { ponto, limitado: false, metros }
  }
  const [lng0, lat0] = centroEndereco.coordinates
  const [lng1, lat1] = ponto.coordinates
  const interpolar = (t: number): GeoJsonPoint => ({
    type: 'Point',
    coordinates: [lng0 + (lng1 - lng0) * t, lat0 + (lat1 - lat0) * t],
  })

  let t = raioMetros / metros
  let candidato = interpolar(t)
  for (let i = 0; i < 12 && distanciaMetrosEntrePontos(centroEndereco, candidato) > raioMetros; i++) {
    t *= 0.99
    candidato = interpolar(t)
  }
  return { ponto: candidato, limitado: true, metros }
}
