import { consultarCodigoCidadeIbge as consultarCodigoCidadeIbgeApi } from '@/src/infrastructure/api/empresaConfigApi'

/**
 * Código IBGE da cidade via BFF (catálogo local do Gestor).
 */
export function consultarCodigoCidadeIbge(
  nomeCidade: string,
  uf: string
): Promise<string | null> {
  return consultarCodigoCidadeIbgeApi(nomeCidade, uf)
}
