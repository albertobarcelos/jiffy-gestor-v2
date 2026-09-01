import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

/** Geo capturada no checkout: localização do endereço + ponto de entrega opcional. */
export type EnderecoGeoCheckoutInput = {
  enderecoLocalizacao: GeoJsonPoint
  providerEnderecoId?: string | null
  /** Ponto onde o cliente recebe o pedido (portaria, bloco etc.), sem alterar o texto do endereço. */
  preferenciaEntrega?: GeoJsonPoint | null
}

export function geoCheckoutProntaParaConfirmar(input: {
  enderecoLocalizacao: GeoJsonPoint | null
  usarPontoPreferencia?: boolean
  preferenciaEntrega?: GeoJsonPoint | null
}): boolean {
  if (!input.enderecoLocalizacao) return false
  if (input.usarPontoPreferencia && !input.preferenciaEntrega) return false
  return true
}

export function montarGeoCheckoutInputFromState(input: {
  enderecoLocalizacao: GeoJsonPoint | null
  providerEnderecoId?: string | null
  usarPontoPreferencia?: boolean
  preferenciaEntrega?: GeoJsonPoint | null
}): EnderecoGeoCheckoutInput | null {
  if (!geoCheckoutProntaParaConfirmar(input)) return null
  return {
    enderecoLocalizacao: input.enderecoLocalizacao!,
    providerEnderecoId: input.providerEnderecoId ?? null,
    ...(input.usarPontoPreferencia && input.preferenciaEntrega
      ? { preferenciaEntrega: input.preferenciaEntrega }
      : {}),
  }
}
