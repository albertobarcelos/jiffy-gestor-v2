const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type MunicipioIbgeRaw = {
  id: number
  nome: string
}

export type MunicipioIbgeItem = {
  codigoCidadeIbge: string
  nomeCidade: string
}

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const municipiosCache = new Map<string, CacheEntry<MunicipioIbgeItem[]>>()

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

async function fetchIbgeJson<T>(url: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Erro ao consultar IBGE: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo esgotado ao consultar API do IBGE')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Lista municípios de um estado via API pública do IBGE (sem autenticação).
 */
export async function listarMunicipiosPorEstado(uf: string): Promise<MunicipioIbgeItem[]> {
  const ufNormalizada = normalizarUf(uf)
  const cacheKey = `municipios:${ufNormalizada}`

  const cached = municipiosCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const municipios = await fetchIbgeJson<MunicipioIbgeRaw[]>(
    `${IBGE_BASE_URL}/estados/${ufNormalizada}/municipios`,
    15000
  )

  const resultado = municipios.map(municipio => ({
    codigoCidadeIbge: municipio.id.toString().padStart(7, '0'),
    nomeCidade: municipio.nome,
  }))

  municipiosCache.set(cacheKey, { data: resultado, timestamp: Date.now() })

  return resultado
}

export async function buscarMunicipiosPorNome(
  uf: string,
  nome: string
): Promise<{
  municipios: MunicipioIbgeItem[]
  total: number
  limitado: boolean
}> {
  const todosMunicipios = await listarMunicipiosPorEstado(uf)
  const nomeNormalizado = normalizarTexto(nome)

  const municipiosFiltrados = todosMunicipios.filter(municipio =>
    normalizarTexto(municipio.nomeCidade).includes(nomeNormalizado)
  )

  return {
    municipios: municipiosFiltrados.slice(0, 20),
    total: municipiosFiltrados.length,
    limitado: municipiosFiltrados.length > 20,
  }
}

export async function validarCidadeNoEstado(cidade: string, uf: string): Promise<boolean> {
  if (!cidade?.trim() || !uf?.trim()) {
    return false
  }

  const municipios = await listarMunicipiosPorEstado(uf)
  const cidadeNormalizada = normalizarTexto(cidade)

  return municipios.some(
    municipio => normalizarTexto(municipio.nomeCidade) === cidadeNormalizada
  )
}
