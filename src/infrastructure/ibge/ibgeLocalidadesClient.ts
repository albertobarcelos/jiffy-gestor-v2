const BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api/ibge/municipios/v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type MunicipioBrasilApiRaw = {
  nome: string
  codigo_ibge: string | number
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

function paraCodigoIbge(valor: string | number): string {
  return valor.toString().padStart(7, '0')
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Erro ao consultar municípios: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo esgotado ao consultar municípios')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function mapearMunicipiosBrasilApi(municipios: MunicipioBrasilApiRaw[]): MunicipioIbgeItem[] {
  return municipios.map(municipio => ({
    codigoCidadeIbge: paraCodigoIbge(municipio.codigo_ibge),
    nomeCidade: municipio.nome,
  }))
}

function listaValida(municipios: MunicipioIbgeItem[]): MunicipioIbgeItem[] {
  if (municipios.length === 0) {
    throw new Error('Nenhum município retornado')
  }
  return municipios
}

/**
 * A cadeia TLS do IBGE quebra no Node. A BrasilAPI entrega os mesmos
 * códigos oficiais com certificado válido, e o BFF do Next usa só ela.
 */
async function buscarMunicipiosRemotos(uf: string): Promise<MunicipioIbgeItem[]> {
  const municipios = await fetchJson<MunicipioBrasilApiRaw[]>(
    `${BRASIL_API_BASE_URL}/${uf}`,
    15000
  )
  return listaValida(mapearMunicipiosBrasilApi(municipios))
}

function encontrarMunicipioPorNome(
  municipios: MunicipioIbgeItem[],
  nomeCidade: string
): MunicipioIbgeItem | undefined {
  const cidadeNormalizada = normalizarTexto(nomeCidade)
  return municipios.find(municipio => normalizarTexto(municipio.nomeCidade) === cidadeNormalizada)
}

export async function localizarMunicipioNoEstado(
  cidade: string,
  uf: string
): Promise<MunicipioIbgeItem | null> {
  if (!cidade?.trim() || !uf?.trim()) {
    return null
  }

  const municipios = await listarMunicipiosPorEstado(uf)
  return encontrarMunicipioPorNome(municipios, cidade) ?? null
}

export async function listarMunicipiosPorEstado(uf: string): Promise<MunicipioIbgeItem[]> {
  const ufNormalizada = normalizarUf(uf)
  const cacheKey = `municipios:${ufNormalizada}`

  const cached = municipiosCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const resultado = await buscarMunicipiosRemotos(ufNormalizada)
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
  return Boolean(await localizarMunicipioNoEstado(cidade, uf))
}
