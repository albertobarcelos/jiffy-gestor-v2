import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

type ValidarCidadeBffResponse = {
  valido?: boolean
  codigoCidadeIbge?: string | null
}

/**
 * Código IBGE da cidade via BFF (catálogo local do Gestor).
 */
export async function consultarCodigoCidadeIbge(
  nomeCidade: string,
  uf: string
): Promise<string | null> {
  const response = await fetchGestorApi(
    `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(nomeCidade)}&uf=${encodeURIComponent(uf)}`
  )
  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as ValidarCidadeBffResponse
  if (!data.valido || !data.codigoCidadeIbge) {
    return null
  }

  return data.codigoCidadeIbge
}
