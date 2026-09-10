export const MENSAGEM_MAPA_INDISPONIVEL_SUPORTE =
  'Não foi possível carregar o mapa agora. Fale com o suporte Jiffy para verificar a configuração.'

export const TOAST_ID_MAPA_INDISPONIVEL = 'jiffy-mapa-google-indisponivel'

export const GOOGLE_MAPS_UNAVAILABLE_CODE = 'GOOGLE_MAPS_UNAVAILABLE'

export class MapaGoogleIndisponivelError extends Error {
  readonly code = GOOGLE_MAPS_UNAVAILABLE_CODE

  constructor() {
    super(MENSAGEM_MAPA_INDISPONIVEL_SUPORTE)
    this.name = 'MapaGoogleIndisponivelError'
  }
}

const PADROES_FALHA_SERVICO =
  /not authorized|REQUEST_DENIED|OVER_QUERY_LIMIT|API key is not|ApiNotActivatedMapError|Google Geocoding retornou|GOOGLE_MAPS_API_KEY não configurada/i

export function isFalhaServicoMapaGoogle(error: unknown): boolean {
  if (error instanceof MapaGoogleIndisponivelError) return true
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === GOOGLE_MAPS_UNAVAILABLE_CODE
  ) {
    return true
  }
  const texto =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof (error as { error?: unknown })?.error === 'string'
          ? String((error as { error: string }).error)
          : ''
  return PADROES_FALHA_SERVICO.test(texto)
}

export function logFalhaMapaGoogle(contexto: string, detalhe?: unknown): void {
  console.error(`[jiffy:mapa] ${contexto}`, detalhe ?? '')
}

let geocodeServicoIndisponivel = false

const geocodeInflight = new Map<
  string,
  Promise<{ ok: boolean; status: number; payload: unknown }>
>()

function payloadServicoIndisponivel(): {
  ok: false
  status: 503
  payload: { error: string; errorCode: string }
} {
  return {
    ok: false,
    status: 503,
    payload: {
      error: MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
      errorCode: GOOGLE_MAPS_UNAVAILABLE_CODE,
    },
  }
}

export function geocodeServicoEstaIndisponivel(): boolean {
  return geocodeServicoIndisponivel
}

export function marcarGeocodeServicoIndisponivel(): void {
  geocodeServicoIndisponivel = true
}

export function resetGoogleMapsFalhaForTests(): void {
  geocodeServicoIndisponivel = false
  geocodeInflight.clear()
}

export async function fetchGeocodeForward(
  params: URLSearchParams
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  if (geocodeServicoIndisponivel) return payloadServicoIndisponivel()
  const chave = params.toString()
  const existente = geocodeInflight.get(chave)
  if (existente) return existente
  const pedido = (async () => {
    const response = await fetch(`/api/geolocalizacao/forward?${chave}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const payload = await response.json().catch(() => ({}))
    const corpo = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    const errorCode = typeof corpo.errorCode === 'string' ? corpo.errorCode : ''
    const errorMsg = typeof corpo.error === 'string' ? corpo.error : ''
    if (
      !response.ok &&
      (errorCode === GOOGLE_MAPS_UNAVAILABLE_CODE ||
        isFalhaServicoMapaGoogle(errorMsg) ||
        response.status === 503)
    ) {
      marcarGeocodeServicoIndisponivel()
    }
    return { ok: response.ok, status: response.status, payload }
  })().finally(() => {
    geocodeInflight.delete(chave)
  })
  geocodeInflight.set(chave, pedido)
  return pedido
}

export function erroGeocodeForwardParaCliente(payload: unknown, statusHttp: number): Error {
  const corpo = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const errorCode = typeof corpo.errorCode === 'string' ? corpo.errorCode : ''
  const googleStatus = typeof corpo.googleStatus === 'string' ? corpo.googleStatus : undefined
  const errorMsg = typeof corpo.error === 'string' ? corpo.error : ''
  if (
    errorCode === GOOGLE_MAPS_UNAVAILABLE_CODE ||
    isFalhaServicoMapaGoogle(errorMsg) ||
    statusHttp === 503
  ) {
    marcarGeocodeServicoIndisponivel()
    logFalhaMapaGoogle('geocode forward', { statusHttp, errorCode, googleStatus, errorMsg })
    return new MapaGoogleIndisponivelError()
  }
  return new Error(errorMsg || 'Não foi possível localizar o endereço no Google Maps')
}
