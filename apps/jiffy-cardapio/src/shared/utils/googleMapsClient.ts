/** Chave pública para Google Maps JavaScript API (mapa interativo no browser). */
export function getGoogleMapsApiKeyClient(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''
}
