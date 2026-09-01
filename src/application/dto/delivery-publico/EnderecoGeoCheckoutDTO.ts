import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { EnderecoGeocodeInput } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

/** Como persistir quando o pin diverge do geocode do endereço digitado. */
export type ModoAjustePinCheckout = 'preferencia_entrega' | 'atualizar_endereco'

/** Geo capturada no checkout (geocode base + pin ajustável). */
export type EnderecoGeoCheckoutInput = {
  enderecoLocalizacao: GeoJsonPoint
  pinPosition: GeoJsonPoint
  providerEnderecoId?: string | null
  /** Definido após o cliente mover o pin e escolher no diálogo. */
  modoAjustePin?: ModoAjustePinCheckout
  /** Reverse geocode do pin (modo `atualizar_endereco`). */
  enderecoRevertido?: EnderecoGeocodeInput
}

/** Pin no mapa é suficiente; geocode base pode ser inferido do pin. */
export function geoCheckoutProntaParaConfirmar(pinPosition: GeoJsonPoint | null): boolean {
  return Boolean(pinPosition)
}

export function montarGeoCheckoutInputFromState(input: {
  enderecoLocalizacao: GeoJsonPoint | null
  pinPosition: GeoJsonPoint | null
  providerEnderecoId?: string | null
  modoAjustePin?: ModoAjustePinCheckout | null
  enderecoRevertido?: EnderecoGeocodeInput | null
}): EnderecoGeoCheckoutInput | null {
  if (!input.pinPosition) return null
  return {
    enderecoLocalizacao: input.enderecoLocalizacao ?? input.pinPosition,
    pinPosition: input.pinPosition,
    providerEnderecoId: input.providerEnderecoId ?? null,
    ...(input.modoAjustePin ? { modoAjustePin: input.modoAjustePin } : {}),
    ...(input.enderecoRevertido ? { enderecoRevertido: input.enderecoRevertido } : {}),
  }
}

/** Ao mover o pin sem geocode prévio, usa o pin como base da localização. */
export function aplicarPinNoMapaCheckout(
  point: GeoJsonPoint,
  setPinPosition: (point: GeoJsonPoint) => void,
  setEnderecoLocalizacao: (value: GeoJsonPoint | null | ((prev: GeoJsonPoint | null) => GeoJsonPoint | null)) => void
): void {
  setPinPosition(point)
  setEnderecoLocalizacao(prev => prev ?? point)
}
