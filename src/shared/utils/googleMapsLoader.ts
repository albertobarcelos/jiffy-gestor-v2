import type { Libraries } from '@react-google-maps/api'
import { registrarCallbackAuthGoogleMaps } from '@/src/shared/utils/googleMapsFalhaCliente'

/** Referência estável — obrigatório para `useJsApiLoader`. */
export const GOOGLE_MAPS_LIBRARIES: Libraries = []

export const GOOGLE_MAPS_LOADER_ID = 'jiffy-google-maps'

export function googleMapsLoaderConfig(apiKey: string) {
  registrarCallbackAuthGoogleMaps()
  return {
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: apiKey,
    language: 'pt-BR' as const,
    region: 'BR' as const,
    libraries: GOOGLE_MAPS_LIBRARIES,
  }
}
