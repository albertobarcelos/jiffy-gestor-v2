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
