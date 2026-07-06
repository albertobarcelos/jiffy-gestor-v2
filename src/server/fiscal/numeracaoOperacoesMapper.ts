export function buildInutilizarQueryFromBody(body: any): URLSearchParams {
  const params = new URLSearchParams()
  params.set('uf', String(body?.uf ?? ''))
  params.set('ambiente', String(body?.ambiente ?? ''))
  params.set('modelo', String(body?.modelo ?? ''))
  params.set('serie', String(body?.serie ?? ''))
  params.set('numeroInicial', String(body?.numeroInicial ?? ''))
  params.set('numeroFinal', String(body?.numeroFinal ?? ''))
  params.set('justificativa', String(body?.justificativa ?? ''))
  return params
}

export function buildInutilizacoesQuery(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams()
  const modelo = searchParams.get('modelo')
  const serie = searchParams.get('serie')
  const status = searchParams.get('status')

  if (modelo) params.append('modelo', modelo)
  if (serie) params.append('serie', serie)
  if (status) params.append('status', status)

  return params
}

export function validateInutilizaveisQuery(searchParams: URLSearchParams): {
  ok: boolean
  error?: string
  params?: URLSearchParams
} {
  const modelo = searchParams.get('modelo')
  const serie = searchParams.get('serie')
  const ambiente = searchParams.get('ambiente')
  const numeroInicial = searchParams.get('numeroInicial')
  const numeroFinal = searchParams.get('numeroFinal')
  const page = searchParams.get('page')
  const size = searchParams.get('size')

  if (!modelo || !serie || !ambiente) {
    return {
      ok: false,
      error: 'modelo, serie e ambiente são obrigatórios',
    }
  }

  const params = new URLSearchParams({ modelo, serie, ambiente })
  if (numeroInicial) params.append('numeroInicial', numeroInicial)
  if (numeroFinal) params.append('numeroFinal', numeroFinal)
  if (page) params.append('page', page)
  if (size) params.append('size', size)

  return {
    ok: true,
    params,
  }
}

/** @deprecated Use validateInutilizaveisQuery */
export const validateGapsQuery = validateInutilizaveisQuery

