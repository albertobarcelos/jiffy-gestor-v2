import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/pessoas/usuarios-gestor
 * Lista usuários gestor com paginação e busca
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const q = searchParams.get('q') || ''
    const ativoParam = searchParams.get('ativo')
    const ativo = ativoParam !== null ? ativoParam === 'true' : null
    const perfilGestorId = searchParams.get('perfilGestorId') || ''

    console.log('🔍 [API/usuarios-gestor] Parâmetros recebidos:', {
      limit,
      offset,
      q,
      ativoParam,
      ativo
    })

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (q) {
      params.append('q', q)
    }

    if (ativo !== null) {
      params.append('ativo', ativo.toString())
      console.log('✅ [API/usuarios-gestor] Filtro ativo aplicado:', ativo)
    } else {
      console.log('⚠️ [API/usuarios-gestor] Filtro ativo não especificado - retornando todos')
    }

    if (perfilGestorId) {
      params.append('perfilGestorId', perfilGestorId)
      console.log('✅ [API/usuarios-gestor] Filtro perfilGestorId aplicado:', perfilGestorId)
    }

    const apiClient = new ApiClient()
    
    try {
      const response = await apiClient.request<any>(`/api/v1/pessoas/usuarios-gestor?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      })

      console.log('🔍 [usuarios-gestor] Resposta da API externa:', {
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        itemsLength: response.data?.items?.length || 0,
        count: response.data?.count,
      })

      // A API retorna no formato { items: [...], count: ..., page: ..., limit: ..., totalPages: ..., hasNext: ..., hasPrevious: ... }
      // response.data já contém a estrutura completa
      const apiData = response.data || {}
      
      // Garante que items seja um array
      const items = Array.isArray(apiData.items) ? apiData.items : []
      const count = apiData.count || 0
      
      console.log('✅ [usuarios-gestor] Retornando dados:', { itemsCount: items.length, count })
      
      return NextResponse.json({
        items,
        count,
      })
    } catch (apiError) {
      console.error('❌ [usuarios-gestor] Erro na chamada da API externa:', apiError)
      throw apiError
    }
  } catch (error) {
    console.error('Erro ao buscar usuários gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar usuários gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pessoas/usuarios-gestor
 * Cria um novo usuário gestor
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    console.log('🔍 [usuarios-gestor] Criando usuário gestor:', body)

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/pessoas/usuarios-gestor', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('✅ [usuarios-gestor] Usuário gestor criado:', response.data)
    return NextResponse.json(response.data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar usuário gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao criar usuário gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
