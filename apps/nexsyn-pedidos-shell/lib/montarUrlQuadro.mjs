export const PATH_PEDIDOS = '/pedidos'
export const QUERY_GESTOR = 'gestor'
export const URL_DEV_PADRAO = 'http://localhost:5000'

export function montarUrlQuadro(origem) {
  const raw = String(origem ?? '').trim() || URL_DEV_PADRAO
  let parsed
  try {
    parsed = new URL(raw.includes('://') ? raw : `http://${raw}`)
  } catch {
    return `${URL_DEV_PADRAO}${PATH_PEDIDOS}?${QUERY_GESTOR}`
  }

  if (parsed.pathname === '/' || parsed.pathname === '') {
    parsed.pathname = PATH_PEDIDOS
  }

  if (!parsed.searchParams.has(QUERY_GESTOR)) {
    const atual = parsed.search.replace(/^\?/, '')
    parsed.search = atual ? `${atual}&${QUERY_GESTOR}` : QUERY_GESTOR
  }

  return parsed.toString().replace(/\?gestor=$/, '?gestor')
}
