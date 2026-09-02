/** Chave Google Maps (Maps JS no browser + proxies BFF de geocode/Places). */
export function getGoogleMapsApiKeyClient(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''
}
