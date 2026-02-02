import { NextRequest, NextResponse } from 'next/server'

interface PeriodoDates {
  periodoInicial: string
  periodoFinal: string
}

function getPeriodoDates(periodo: string): PeriodoDates {
  const now = new Date()

  let inicio: Date | null = null
  let fim: Date | null = null

  switch (periodo) {
    case 'hoje':
      inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case 'semana':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 6)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case '30dias':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 29)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case 'mes':
      inicio = new Date(now.getFullYear(), now.getMonth(), 1)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      fim.setHours(23, 59, 59, 999)
      break
    case '60dias':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 59)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    case '90dias':
      inicio = new Date(now)
      inicio.setDate(now.getDate() - 89)
      inicio.setHours(0, 0, 0, 0)
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      fim.setHours(23, 59, 59, 999)
      break
    default:
      return { periodoInicial: '', periodoFinal: '' }
  }

  return {
    periodoInicial: inicio ? inicio.toISOString() : '',
    periodoFinal: fim ? fim.toISOString() : '',
  }
}

export async function GET(request: NextRequest) {
  const tokenHeader = request.headers.get('authorization')
  const token = tokenHeader?.replace(/^Bearer\s+/i, '')
  const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL

  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido.' }, { status: 401 })
  }

  if (!baseUrl) {
    return NextResponse.json({ error: 'URL da API não configurada.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const limit = Number(searchParams.get('limit') || '10')
  const periodoInicialCustom = searchParams.get('periodoInicial')
  const periodoFinalCustom = searchParams.get('periodoFinal')

  const params = new URLSearchParams()

  // Se datas personalizadas foram fornecidas, usa elas
  if (periodoInicialCustom && periodoFinalCustom) {
    params.append('periodoInicial', periodoInicialCustom)
    params.append('periodoFinal', periodoFinalCustom)
  } else {
    // Caso contrário, usa a função de cálculo de período
    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo)
    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial)
      params.append('periodoFinal', periodoFinal)
    }
  }

  params.append('status', 'FINALIZADA')
  params.append('limit', '100')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  try {
    const vendasResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas?${params.toString()}`, {
      headers,
    })

    if (!vendasResponse.ok) {
      const errorText = await vendasResponse.text().catch(() => '')
      return NextResponse.json(
        { error: `Erro ao buscar vendas por período. ${errorText || ''}` },
        { status: vendasResponse.status }
      )
    }

    const vendasData = await vendasResponse.json()
    const vendaIds: string[] = (vendasData.items || []).map((venda: { id: string }) => venda.id)

    if (vendaIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const productNamesCache = new Map<string, string>()
    const getProductName = async (id: string): Promise<string> => {
      if (productNamesCache.has(id)) {
        return productNamesCache.get(id) as string
      }

      const response = await fetch(`${baseUrl}/api/v1/cardapio/produtos/${id}`, { headers })
      if (!response.ok) {
        console.warn(`Não foi possível buscar o nome para o produto ID: ${id}. Status: ${response.status}`)
        return 'Produto Desconhecido'
      }

      const data = await response.json()
      const nome = data?.nome ?? 'Produto Desconhecido'
      productNamesCache.set(id, nome)
      return nome
    }

    const detailedVendasPromises = vendaIds.map(async (vendaId) => {
      const detalhesResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas/${vendaId}`, { headers })
      if (!detalhesResponse.ok) {
        console.warn(`Não foi possível buscar detalhes para a venda ID: ${vendaId}. Status: ${detalhesResponse.status}`)
        return null
      }
      return detalhesResponse.json()
    })

    const detailedVendas = (await Promise.all(detailedVendasPromises)).filter(Boolean) as Array<{
      produtosLancados: { produtoId: string; quantidade: number; valorFinal: number }[]
    }>

    const productAggregation = new Map<string, { produto: string; quantidade: number; valorTotal: number }>()

    for (const venda of detailedVendas) {
      for (const produtoLancado of venda.produtosLancados) {
        const produtoId = produtoLancado.produtoId
        const quantidade = produtoLancado.quantidade
        const valorUnitarioTotalDoItem = produtoLancado.valorFinal

        const produtoNome = await getProductName(produtoId)

        if (productAggregation.has(produtoNome)) {
          const existing = productAggregation.get(produtoNome)!
          existing.quantidade += quantidade
          existing.valorTotal += valorUnitarioTotalDoItem
          productAggregation.set(produtoNome, existing)
        } else {
          productAggregation.set(produtoNome, {
            produto: produtoNome,
            quantidade,
            valorTotal: valorUnitarioTotalDoItem,
          })
        }
      }
    }

    const items = Array.from(productAggregation.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limit)

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Erro ao buscar top produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar top produtos.' },
      { status: 500 }
    )
  }
}
