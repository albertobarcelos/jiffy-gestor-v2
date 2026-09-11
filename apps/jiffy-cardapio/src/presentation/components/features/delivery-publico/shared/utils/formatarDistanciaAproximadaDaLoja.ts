import {
  distanciaMetrosEntrePontos,
  parseGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'

/** Formata metros em texto curto para o cliente (linha reta aproximada). */
export function formatarDistanciaAproximadaMetros(metros: number): string {
  if (!(metros >= 0) || !Number.isFinite(metros)) return ''
  if (metros < 1000) {
    return `aprox. ${Math.round(metros)} m da loja`
  }
  const km = metros / 1000
  const texto =
    km >= 10
      ? km.toFixed(0)
      : km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `aprox. ${texto} km da loja`
}

export function calcularDistanciaAproximadaDaLoja(
  localizacaoEmpresa: GeoJsonPoint | null | undefined,
  localizacaoCliente: GeoJsonPoint | null | undefined
): string | null {
  const empresa = parseGeoJsonPoint(localizacaoEmpresa)
  const cliente = parseGeoJsonPoint(localizacaoCliente)
  if (!empresa || !cliente) return null
  const metros = distanciaMetrosEntrePontos(empresa, cliente)
  const texto = formatarDistanciaAproximadaMetros(metros)
  return texto || null
}

/** Ponto usado para distância: preferência de entrega, senão pin do endereço. */
export function pontoClienteParaDistancia(endereco: {
  enderecoLocalizacao?: GeoJsonPoint | null
  preferenciaEntrega?: GeoJsonPoint | null
}): GeoJsonPoint | null {
  return (
    parseGeoJsonPoint(endereco.preferenciaEntrega) ??
    parseGeoJsonPoint(endereco.enderecoLocalizacao)
  )
}
