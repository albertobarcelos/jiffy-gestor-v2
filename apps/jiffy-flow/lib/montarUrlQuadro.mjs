export const PATH_LISTA_EMPRESAS = '/pedidos/empresas'
export const QUERY_GESTOR = 'gestor'
export const URL_DEV_PADRAO = 'http://127.0.0.1:5000'

function pathSemBarraFinal(pathname) {
  const p = String(pathname || '').replace(/\/$/, '')
  return p || '/'
}

export function montarUrlQuadro(origem) {
  const raw = String(origem ?? '').trim() || URL_DEV_PADRAO
  let parsed
  try {
    parsed = new URL(raw.includes('://') ? raw : `http://${raw}`)
  } catch {
    return `${URL_DEV_PADRAO}${PATH_LISTA_EMPRESAS}?${QUERY_GESTOR}`
  }

  const path = pathSemBarraFinal(parsed.pathname)
  if (path === '/' || path === '/pedidos') {
    parsed.pathname = PATH_LISTA_EMPRESAS
  }

  if (!parsed.searchParams.has(QUERY_GESTOR)) {
    const atual = parsed.search.replace(/^\?/, '')
    parsed.search = atual ? `${atual}&${QUERY_GESTOR}` : QUERY_GESTOR
  }

  return parsed.toString().replace(/\?gestor=$/, '?gestor')
}
