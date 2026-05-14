import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

interface VendaListApiResponse {
  items: { id: string }[]
  count?: number
  totalPages?: number
  limit?: number
}

interface VendaDetalhesApiResponse {
  id: string
  status?: string
  dataFinalizacao?: string
  dataCancelamento?: string | null
  troco?: number
  valorFinal?: number
  pagamentos: {
    id: string
    valor: number
    meioPagamentoId: string
    cancelado: boolean
    canceladoPorId?: string | null
    dataCancelamento?: string | null
    isTefUsed?: boolean
    isTefConfirmed?: boolean
  }[]
}

interface MeioPagamentoApiResponse {
  id: string
  nome: string
  formaPagamentoFiscal?: string
}

const VENDAS_LIST_PAGE_SIZE = 100
const VENDAS_DETALHE_CONCORRENCIA = 64
const MEIOS_LIST_PAGE_SIZE = 100
const MEIOS_FETCH_CONCORRENCIA = 16

async function promisePool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency)
    const chunkResults = await Promise.all(chunk.map(fn))
    results.push(...chunkResults)
  }
  return results
}

async function fetchVendasListPage(
  baseUrl: string,
  headers: HeadersInit,
  baseParams: URLSearchParams,
  pageIndex: number
): Promise<VendaListApiResponse> {
  const currentParams = new URLSearchParams(baseParams.toString())
  currentParams.append('limit', VENDAS_LIST_PAGE_SIZE.toString())
  currentParams.append('offset', (pageIndex * VENDAS_LIST_PAGE_SIZE).toString())
  const vendasUrl = `${baseUrl}/api/v1/operacao-pdv/vendas?${currentParams.toString()}`
  const vendasResponse = await fetch(vendasUrl, { headers })
  if (!vendasResponse.ok) {
    const detalhe = await vendasResponse.text().catch(() => '')
    throw new Error(
      `Erro ao buscar vendas finalizadas (página ${pageIndex + 1}) [HTTP ${vendasResponse.status}]${detalhe ? `: ${detalhe.slice(0, 300)}` : ''}`
    )
  }
  return vendasResponse.json() as Promise<VendaListApiResponse>
}

async function fetchAllVendasFinalizadas(
  baseUrl: string,
  headers: HeadersInit,
  periodoInicial: string,
  periodoFinal: string
): Promise<string[]> {
  const baseParams = new URLSearchParams()
  if (periodoInicial && periodoFinal) {
    baseParams.append('dataFinalizacaoInicial', periodoInicial)
    baseParams.append('dataFinalizacaoFinal', periodoFinal)
  }
  baseParams.append('status', 'FINALIZADA')

  const firstData = await fetchVendasListPage(baseUrl, headers, baseParams, 0)
  const allIds = firstData.items.map(v => v.id)

  let totalPages = 1
  if (typeof firstData.totalPages === 'number' && firstData.totalPages > 0) {
    totalPages = firstData.totalPages
  } else if (firstData.count != null && firstData.limit != null && firstData.limit > 0) {
    totalPages = Math.ceil(firstData.count / firstData.limit)
  } else if (allIds.length < VENDAS_LIST_PAGE_SIZE) {
    return allIds
  } else {
    let page = 1
    for (;;) {
      const data = await fetchVendasListPage(baseUrl, headers, baseParams, page)
      const ids = data.items.map(v => v.id)
      allIds.push(...ids)
      if (ids.length < VENDAS_LIST_PAGE_SIZE) {
        break
      }
      page++
    }
    return allIds
  }

  if (totalPages <= 1) {
    return allIds
  }

  const restIndexes = Array.from({ length: totalPages - 1 }, (_, i) => i + 1)
  const restPages = await Promise.all(
    restIndexes.map(pi => fetchVendasListPage(baseUrl, headers, baseParams, pi))
  )
  for (const d of restPages) {
    allIds.push(...d.items.map(v => v.id))
  }
  return allIds
}

async function fetchAllMeiosPagamentoMap(
  baseUrl: string,
  headers: HeadersInit
): Promise<Map<string, MeioPagamentoApiResponse>> {
  const map = new Map<string, MeioPagamentoApiResponse>()
  let offset = 0

  for (;;) {
    const url = `${baseUrl}/api/v1/pagamento/meios-pagamento?limit=${MEIOS_LIST_PAGE_SIZE}&offset=${offset}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const detalhe = await res.text().catch(() => '')
      throw new Error(
        `Erro ao listar meios de pagamento [HTTP ${res.status}]${detalhe ? `: ${detalhe.slice(0, 300)}` : ''}`
      )
    }
    const data = (await res.json()) as { items?: MeioPagamentoApiResponse[]; count?: number }
    const items = data.items ?? []
    for (const item of items) {
      const id = String(item.id ?? '')
      if (id) {
        map.set(id, {
          id,
          nome: item.nome ?? '',
          formaPagamentoFiscal: item.formaPagamentoFiscal,
        })
      }
    }
    if (items.length < MEIOS_LIST_PAGE_SIZE) {
      break
    }
    offset += MEIOS_LIST_PAGE_SIZE
  }

  return map
}

async function garantirMeiosFaltantesNoCache(
  baseUrl: string,
  headers: HeadersInit,
  cache: Map<string, MeioPagamentoApiResponse>,
  idsNecessarios: Set<string>
): Promise<void> {
  const faltantes = [...idsNecessarios].filter(id => id && !cache.has(id))
  if (faltantes.length === 0) return

  await promisePool(faltantes, MEIOS_FETCH_CONCORRENCIA, async id => {
    const res = await fetch(`${baseUrl}/api/v1/pagamento/meios-pagamento/${id}`, { headers })
    if (!res.ok) {
      return
    }
    const data = (await res.json()) as MeioPagamentoApiResponse
    const mid = String(data.id ?? id)
    cache.set(mid, {
      id: mid,
      nome: data.nome ?? 'Desconhecido',
      formaPagamentoFiscal: data.formaPagamentoFiscal,
    })
  })
}

async function fetchDetalhesVendasEmLotes(
  baseUrl: string,
  headers: HeadersInit,
  vendaIds: string[]
): Promise<(VendaDetalhesApiResponse | null)[]> {
  return promisePool(vendaIds, VENDAS_DETALHE_CONCORRENCIA, async vendaId => {
    const detalhesResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas/${vendaId}`, {
      headers,
    })
    if (!detalhesResponse.ok) {
      return null
    }
    return detalhesResponse.json() as Promise<VendaDetalhesApiResponse>
  })
}

function isVendaFinalizada(venda: VendaDetalhesApiResponse): boolean {
  if (venda.dataCancelamento) {
    return false
  }
  if (!venda.dataFinalizacao) {
    return false
  }
  if (venda.status) {
    return venda.status.toUpperCase() === 'FINALIZADA'
  }
  return true
}

function filtrarPagamentosValidos(pagamentos: VendaDetalhesApiResponse['pagamentos']): {
  validos: VendaDetalhesApiResponse['pagamentos']
  cancelados: number
  tefNaoConfirmados: number
} {
  let cancelados = 0
  let tefNaoConfirmados = 0
  const validos = pagamentos.filter(pagamento => {
    const isCancelado =
      pagamento.cancelado === true ||
      (pagamento.dataCancelamento !== null && pagamento.dataCancelamento !== undefined)

    if (isCancelado) {
      cancelados++
      return false
    }

    const usaTef = pagamento.isTefUsed === true
    if (usaTef) {
      const tefConfirmado = pagamento.isTefConfirmed === true
      if (!tefConfirmado) {
        tefNaoConfirmados++
        return false
      }
    }

    return true
  })

  return { validos, cancelados, tefNaoConfirmados }
}

function isDinheiro(data: MeioPagamentoApiResponse | undefined): boolean {
  if (!data) return false
  const nomeLower = (data.nome || '').toLowerCase()
  const formaFiscalLower = (data.formaPagamentoFiscal || '').toLowerCase()
  return nomeLower.includes('dinheiro') || formaFiscalLower.includes('dinheiro')
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'hoje'
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
    
    let inicioAtual: Date | null = null
    let fimAtual: Date | null = null

    if (periodo === 'personalizado') {
      const iniStr = searchParams.get('dataFinalizacaoInicial')
      const fimStr = searchParams.get('dataFinalizacaoFinal')
      if (iniStr && fimStr) {
        inicioAtual = new Date(iniStr)
        fimAtual = new Date(fimStr)
      } else {
        return NextResponse.json({ error: 'Datas personalizadas inválidas' }, { status: 400 })
      }
    } else {
      const mapOpcao: Record<string, string> = {
        hoje: 'Hoje',
        ontem: 'Ontem',
        semana: 'Últimos 7 Dias',
        '30dias': 'Últimos 30 Dias',
      }
      const opcao = mapOpcao[periodo] || 'Hoje'
      const atual = calcularPeriodoNoFusoEmpresa(opcao, timezone)
      inicioAtual = atual.inicio
      fimAtual = atual.fim
    }

    const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL
    if (!baseUrl) {
      throw new Error('URL da API não configurada.')
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenInfo.token}`,
    }

    if (!inicioAtual || !fimAtual) {
      return NextResponse.json({ error: 'Não foi possível determinar o período de datas' }, { status: 400 })
    }

    const periodoInicialStr = inicioAtual.toISOString()
    const periodoFinalStr = fimAtual.toISOString()

    const meiosPromise = fetchAllMeiosPagamentoMap(baseUrl, headers)
    const vendaIds = await fetchAllVendasFinalizadas(baseUrl, headers, periodoInicialStr, periodoFinalStr)

    if (vendaIds.length === 0) {
      void meiosPromise.catch(() => {})
      return NextResponse.json([])
    }

    const [paymentMethodCache, detalhesBrutos] = await Promise.all([
      meiosPromise,
      fetchDetalhesVendasEmLotes(baseUrl, headers, vendaIds),
    ])
    
    const allDetailedVendas = detalhesBrutos.filter(Boolean) as VendaDetalhesApiResponse[]
    const detailedVendas = allDetailedVendas.filter(venda => isVendaFinalizada(venda))

    const vendasComPagamentosValidos: Array<{
      venda: VendaDetalhesApiResponse
      pagamentosValidos: VendaDetalhesApiResponse['pagamentos']
    }> = []

    const idsMeiosUsados = new Set<string>()

    for (const venda of detailedVendas) {
      if (!venda.pagamentos?.length) continue
      const { validos } = filtrarPagamentosValidos(venda.pagamentos)
      if (validos.length === 0) continue
      vendasComPagamentosValidos.push({ venda, pagamentosValidos: validos })
      for (const p of validos) {
        if (p.meioPagamentoId) {
          idsMeiosUsados.add(p.meioPagamentoId)
        }
      }
    }

    await garantirMeiosFaltantesNoCache(baseUrl, headers, paymentMethodCache, idsMeiosUsados)

    const methodAggregation = new Map<
      string,
      { metodo: string; formaPagamentoFiscal: string; valor: number; quantidade: number }
    >()
    let totalSalesValue = 0

    for (const { venda, pagamentosValidos } of vendasComPagamentosValidos) {
      const totalPagoValido = pagamentosValidos.reduce((sum, pagamento) => sum + pagamento.valor, 0)

      const trocoCalculado = venda.valorFinal
        ? Math.max(0, totalPagoValido - venda.valorFinal)
        : venda.troco || 0

      let totalPagamentosDinheiro = 0
      const pagamentosComDados: Array<{
        metodoNome: string
        isDinheiro: boolean
        valorOriginal: number
        formaPagamentoFiscal: string
      }> = []

      for (const pagamento of pagamentosValidos) {
        const paymentMethodData = paymentMethodCache.get(pagamento.meioPagamentoId)
        const metodoNome = paymentMethodData?.nome || 'Desconhecido'
        const isDinheiroFlag = isDinheiro(paymentMethodData)

        if (isDinheiroFlag) {
          totalPagamentosDinheiro += pagamento.valor
        }

        pagamentosComDados.push({
          metodoNome,
          isDinheiro: isDinheiroFlag,
          valorOriginal: pagamento.valor,
          formaPagamentoFiscal: paymentMethodData?.formaPagamentoFiscal ?? '',
        })
      }

      for (const {
        metodoNome,
        isDinheiro: isDinheiroVal,
        valorOriginal,
        formaPagamentoFiscal: formaFiscalRaw,
      } of pagamentosComDados) {
        let valorPagamento = valorOriginal

        if (isDinheiroVal && trocoCalculado > 0 && totalPagamentosDinheiro > 0) {
          const proporcao = valorOriginal / totalPagamentosDinheiro
          const trocoProporcional = trocoCalculado * proporcao
          valorPagamento = Math.max(0, valorOriginal - trocoProporcional)
        }

        totalSalesValue += valorPagamento

        if (methodAggregation.has(metodoNome)) {
          const existing = methodAggregation.get(metodoNome)!
          existing.valor += valorPagamento
          existing.quantidade += 1
          if (!existing.formaPagamentoFiscal && formaFiscalRaw) {
            existing.formaPagamentoFiscal = formaFiscalRaw
          }
          methodAggregation.set(metodoNome, existing)
        } else {
          methodAggregation.set(metodoNome, {
            metodo: metodoNome,
            formaPagamentoFiscal: formaFiscalRaw,
            valor: valorPagamento,
            quantidade: 1,
          })
        }
      }
    }

    const metodosPagamento = Array.from(methodAggregation.values())
      .map(item => ({
        metodo: item.metodo,
        valor: item.valor,
        quantidade: item.quantidade,
        percentual: totalSalesValue > 0 ? (item.valor / totalSalesValue) * 100 : 0,
        formaPagamentoFiscal: item.formaPagamentoFiscal,
      }))
      .sort((a, b) => b.valor - a.valor)

    return NextResponse.json(metodosPagamento)
  } catch (error: any) {
    console.error('Erro ao buscar métodos de pagamento:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}
