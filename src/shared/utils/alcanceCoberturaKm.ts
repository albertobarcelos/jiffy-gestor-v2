import type { RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { METROS_POR_KM_RAIO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'

export function kmInteiroDoRaio(metros: number): number | null {
  if (metros <= 0 || metros % METROS_POR_KM_RAIO !== 0) return null
  return metros / METROS_POR_KM_RAIO
}

/** Faixas 1..alcanceKm que ainda não existem como raio em km inteiro. */
export function faixasKmFaltantes(
  raios: Array<Pick<RaioEntregaDTO, 'distanciaMaximaEmMetros'>>,
  alcanceKm: number
): number[] {
  if (alcanceKm < 1) return []
  const existentes = new Set(
    raios
      .map(raio => kmInteiroDoRaio(raio.distanciaMaximaEmMetros))
      .filter((km): km is number => km != null)
  )
  const faltantes: number[] = []
  for (let km = 1; km <= alcanceKm; km++) {
    if (!existentes.has(km)) faltantes.push(km)
  }
  return faltantes
}

/** Raios além do alcance máximo (ex.: 10 → 4 remove Até 5 km … Até 10 km). */
export function raiosAcimaDoAlcance<T extends { distanciaMaximaEmMetros: number }>(
  raios: T[],
  alcanceKm: number
): T[] {
  if (alcanceKm < 1) return [...raios]
  const limiteMetros = alcanceKm * METROS_POR_KM_RAIO
  return raios.filter(raio => raio.distanciaMaximaEmMetros > limiteMetros)
}

export function sincronizarFaixasAlcanceKm<T extends { id: string; distanciaMaximaEmMetros: number }>(
  raios: T[],
  alcanceKm: number
): { criarKm: number[]; excluirIds: string[] } {
  return {
    criarKm: faixasKmFaltantes(raios, alcanceKm),
    excluirIds: raiosAcimaDoAlcance(raios, alcanceKm).map(raio => raio.id),
  }
}
