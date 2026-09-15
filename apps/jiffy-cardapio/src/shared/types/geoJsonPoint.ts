/** GeoJSON Point — ordem `[longitude, latitude]` (contrato backend). */
export type GeoJsonPoint = {
  type: 'Point'
  coordinates: [number, number]
}

export function parseGeoJsonPoint(value: unknown): GeoJsonPoint | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (o.type !== 'Point') return null
  const coords = o.coordinates
  if (!Array.isArray(coords) || coords.length !== 2) return null
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null
  return { type: 'Point', coordinates: [lng, lat] }
}

export function geoJsonPointFromLatLng(lat: number, lng: number): GeoJsonPoint {
  return { type: 'Point', coordinates: [lng, lat] }
}

export function latLngFromGeoJsonPoint(point: GeoJsonPoint | null | undefined): { lat: number; lng: number } | null {
  if (!point) return null
  const [lng, lat] = point.coordinates
  return { lat, lng }
}

const EARTH_RADIUS_M = 6_371_000

/** Distância em linha reta (metros) entre dois GeoJSON Points. */
export function distanciaMetrosEntrePontos(
  a: GeoJsonPoint,
  b: GeoJsonPoint
): number {
  const [lng1, lat1] = a.coordinates
  const [lng2, lat2] = b.coordinates
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const lat1R = toRad(lat1)
  const lat2R = toRad(lat2)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1R) * Math.cos(lat2R) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Se `ponto` estiver além de `raioMetros` da `ancora`, devolve o ponto na borda
 * do círculo na mesma direção; caso contrário devolve o próprio ponto.
 */
export function limitarPontoAoRaioMetros(
  ancora: GeoJsonPoint,
  ponto: GeoJsonPoint,
  raioMetros: number
): GeoJsonPoint {
  if (!(raioMetros > 0)) return ponto
  const distancia = distanciaMetrosEntrePontos(ancora, ponto)
  if (distancia <= raioMetros) return ponto

  const [lngA, latA] = ancora.coordinates
  const [lngB, latB] = ponto.coordinates
  const fator = raioMetros / distancia
  return {
    type: 'Point',
    coordinates: [lngA + (lngB - lngA) * fator, latA + (latB - latA) * fator],
  }
}
