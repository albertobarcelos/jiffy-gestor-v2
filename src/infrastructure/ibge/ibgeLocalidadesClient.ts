import municipiosPorUfJson from './municipios-por-uf.json'

export type MunicipioIbgeItem = {
  codigoCidadeIbge: string
  nomeCidade: string
}

const municipiosPorUf = municipiosPorUfJson as Record<string, MunicipioIbgeItem[]>

function normalizarTexto(value: string): string {
  return value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function normalizarUf(uf: string): string {
  return uf.toUpperCase().trim()
}

function encontrarMunicipioPorNome(
  municipios: MunicipioIbgeItem[],
  nomeCidade: string
): MunicipioIbgeItem | undefined {
  const cidadeNormalizada = normalizarTexto(nomeCidade)
  return municipios.find(municipio => normalizarTexto(municipio.nomeCidade) === cidadeNormalizada)
}

/** Fonte de verdade dos municípios até a API Jiffy assumir o catálogo. */
export function listarMunicipiosPorEstado(uf: string): MunicipioIbgeItem[] {
  return municipiosPorUf[normalizarUf(uf)] ?? []
}

export function localizarMunicipioNoEstado(
  cidade: string,
  uf: string
): MunicipioIbgeItem | null {
  if (!cidade?.trim() || !uf?.trim()) {
    return null
  }

  return encontrarMunicipioPorNome(listarMunicipiosPorEstado(uf), cidade) ?? null
}

export function validarCidadeNoEstado(cidade: string, uf: string): boolean {
  return Boolean(localizarMunicipioNoEstado(cidade, uf))
}
