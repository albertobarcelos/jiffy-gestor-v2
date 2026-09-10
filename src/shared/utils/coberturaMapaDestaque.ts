export type TipoDestaqueCobertura = 'raio' | 'area' | 'areas'

export function raioAlcanceMaximo<T extends { distanciaMaximaEmMetros: number }>(
  raios: T[]
): T | null {
  if (raios.length === 0) return null
  return raios.reduce((melhor, atual) =>
    atual.distanciaMaximaEmMetros > melhor.distanciaMaximaEmMetros ? atual : melhor
  )
}

/** Anel da faixa: do raio anterior até este (Até 3 km = coroa 2→3 km). */
export function anelDaFaixaKm<T extends { id: string; distanciaMaximaEmMetros: number }>(
  raios: T[],
  raioId: string
): { innerMetros: number; outerMetros: number } | null {
  const ordenados = [...raios].sort(
    (a, b) => a.distanciaMaximaEmMetros - b.distanciaMaximaEmMetros
  )
  const indice = ordenados.findIndex(raio => raio.id === raioId)
  if (indice < 0) return null
  const outerMetros = ordenados[indice].distanciaMaximaEmMetros
  const innerMetros = indice === 0 ? 0 : ordenados[indice - 1].distanciaMaximaEmMetros
  return { innerMetros, outerMetros }
}

export type DestaqueCobertura = {
  tipo: TipoDestaqueCobertura
  id: string | null
}

export type EstiloOverlayCobertura = {
  fillOpacity: number
  strokeOpacity: number
  strokeWeight: number
  zIndex: number
}

export function resolverDestaqueCobertura(params: {
  hover: DestaqueCobertura | null
  areaFormaEditandoId: string | null
  areaEditandoId: string | null
}): {
  areaDestacadaId: string | null
  raioDestacadoId: string | null
  destacarTodasAreas: boolean
} {
  const { hover, areaFormaEditandoId, areaEditandoId } = params

  if (areaFormaEditandoId) {
    return {
      areaDestacadaId: areaFormaEditandoId,
      raioDestacadoId: hover?.tipo === 'raio' ? hover.id : null,
      destacarTodasAreas: false,
    }
  }

  if (hover?.tipo === 'areas') {
    return { areaDestacadaId: null, raioDestacadoId: null, destacarTodasAreas: true }
  }

  if (hover?.tipo === 'area') {
    return { areaDestacadaId: hover.id, raioDestacadoId: null, destacarTodasAreas: false }
  }

  if (hover?.tipo === 'raio') {
    return { areaDestacadaId: null, raioDestacadoId: hover.id, destacarTodasAreas: false }
  }

  return {
    areaDestacadaId: areaEditandoId,
    raioDestacadoId: null,
    destacarTodasAreas: false,
  }
}

export function estiloOverlayCobertura(params: {
  ativo: boolean
  destacado: boolean
  haDestaqueAtivo: boolean
  variante: 'raio' | 'area'
  editando?: boolean
}): EstiloOverlayCobertura {
  const { ativo, destacado, haDestaqueAtivo, variante, editando = false } = params
  const dimir = haDestaqueAtivo && !destacado && !editando

  if (variante === 'raio') {
    if (!ativo) {
      return { fillOpacity: 0, strokeOpacity: 0, strokeWeight: 0, zIndex: 0 }
    }
    if (destacado) {
      return { fillOpacity: 0.32, strokeOpacity: 1, strokeWeight: 2, zIndex: 4 }
    }
    if (dimir) {
      return { fillOpacity: 0.08, strokeOpacity: 0.35, strokeWeight: 1, zIndex: 1 }
    }
    return { fillOpacity: 0.16, strokeOpacity: 0.9, strokeWeight: 1, zIndex: 1 }
  }

  if (!ativo) {
    return { fillOpacity: 0, strokeOpacity: 0, strokeWeight: 0, zIndex: 0 }
  }
  if (editando || destacado) {
    return {
      fillOpacity: 0.38,
      strokeOpacity: 1,
      strokeWeight: 3,
      zIndex: editando ? 5 : 3,
    }
  }
  if (dimir) {
    return { fillOpacity: 0.08, strokeOpacity: 0.25, strokeWeight: 1, zIndex: 2 }
  }
  return { fillOpacity: 0.28, strokeOpacity: 0.85, strokeWeight: 2, zIndex: 2 }
}

/** Identidade do enquadramento: só muda quando o pin, o alcance ou as áreas mudam. */
export function assinaturaEnquadramentoCobertura(input: {
  centro: { lat: number; lng: number } | null
  raiosMetros: number[]
  areaIds: string[]
  rascunhoPontos: number
}): string {
  const centro = input.centro
    ? `${input.centro.lat.toFixed(6)},${input.centro.lng.toFixed(6)}`
    : ''
  return `${centro}|${input.raiosMetros.join(',')}|${input.areaIds.join(',')}|${input.rascunhoPontos}`
}

/** Faixa que contém a distância; inativa vira buraco (null). */
export function raioIdNoPonto(
  raios: Array<{ id: string; distanciaMaximaEmMetros: number; ativo?: boolean }>,
  distanciaMetros: number
): string | null {
  const ordenados = [...raios].sort(
    (a, b) => a.distanciaMaximaEmMetros - b.distanciaMaximaEmMetros
  )
  for (let indice = 0; indice < ordenados.length; indice++) {
    const innerMetros = indice === 0 ? 0 : ordenados[indice - 1].distanciaMaximaEmMetros
    const outerMetros = ordenados[indice].distanciaMaximaEmMetros
    if (distanciaMetros < innerMetros || distanciaMetros > outerMetros) continue
    return ordenados[indice].ativo === false ? null : ordenados[indice].id
  }
  return null
}
