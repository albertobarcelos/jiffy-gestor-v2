import { NextRequest, NextResponse } from 'next/server'
import { DeliveryRepository } from '@/src/infrastructure/database/repositories/DeliveryRepository'
import { ListarPedidosUseCase } from '@/src/application/use-cases/delivery/ListarPedidosUseCase'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  extrairPedidosDeliveryQueryParamsDeSearchParams,
  isRequisicaoListagemPedidosIntegradorLegada,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { PedidosDeliveryListResponse } from '@/src/application/dto/api/pedidoDeliveryListApi'

const RESPOSTA_VAZIA_JIFFY: PedidosDeliveryListResponse = {
  count: 0,
  page: 1,
  limit: PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  items: [],
}

/**
 * POST /api/delivery/pedidos
 * Cria pedido no módulo delivery Jiffy (`POST /api/v1/delivery/pedidos`).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/delivery/pedidos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 201 })
  } catch (error) {
    console.error('Erro ao criar pedido delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function listarPedidosIntegradorLegado(request: NextRequest): Promise<NextResponse> {
  const bearerToken = request.headers.get('Bearer') || request.headers.get('bearer')
  const integradorToken = request.headers.get('integrador-token')

  if (!bearerToken) {
    return NextResponse.json({ error: 'Token de autenticação não fornecido' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const dataAtualizacao = searchParams.get('data_atualizacao') || undefined

  const params: {
    status?: StatusPedido
    dataAtualizacao?: string
  } = {}

  if (statusParam) {
    const status = parseInt(statusParam, 10)
    if (Object.values(StatusPedido).includes(status)) {
      params.status = status as StatusPedido
    }
  }

  if (dataAtualizacao) {
    params.dataAtualizacao = dataAtualizacao
  }

  const repository = new DeliveryRepository(undefined, bearerToken, integradorToken || undefined)
  const useCase = new ListarPedidosUseCase(repository)
  const pedidos = await useCase.execute(params)

  return NextResponse.json({
    pedidos: pedidos.map(p => ({
      pedidoRef: p.pedidoRef,
      status: p.status,
      usuario: {
        id: p.usuario.id,
        nome: p.usuario.nome,
        telefone: p.usuario.telefone,
        email: p.usuario.email,
      },
      itens: p.itens.map(i => ({
        id: i.id,
        nome: i.nome,
        quantidade: i.quantidade,
        preco: i.preco,
        observacoes: i.observacoes,
        complementos: i.complementos.map(c => ({
          id: c.id,
          nome: c.nome,
          preco: c.preco,
        })),
      })),
      endereco: p.endereco
        ? {
            rua: p.endereco.rua,
            numero: p.endereco.numero,
            bairro: p.endereco.bairro,
            cidade: p.endereco.cidade,
            estado: p.endereco.estado,
            cep: p.endereco.cep,
            complemento: p.endereco.complemento,
            referencia: p.endereco.referencia,
          }
        : undefined,
      valorTotal: p.valorTotal,
      metodoPagamento: p.metodoPagamento,
      observacoes: p.observacoes,
      dataCriacao: p.dataCriacao?.toISOString(),
      dataAtualizacao: p.dataAtualizacao?.toISOString(),
    })),
  })
}

async function listarPedidosModuloJiffy(request: NextRequest): Promise<NextResponse> {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { searchParams } = new URL(request.url)
  const queryParams = extrairPedidosDeliveryQueryParamsDeSearchParams(searchParams)

  if (queryParams.offset == null) queryParams.offset = 0
  if (queryParams.limit == null) queryParams.limit = PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE
  if (queryParams.cancelado == null) queryParams.cancelado = false

  const query = serializarPedidosDeliveryQueryParams(queryParams).toString()

  const apiClient = new ApiClient()
  const response = await apiClient.request<PedidosDeliveryListResponse>(
    `/api/v1/delivery/pedidos${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'application/json',
      },
    }
  )

  return NextResponse.json(response.data ?? RESPOSTA_VAZIA_JIFFY)
}

/**
 * GET /api/delivery/pedidos
 * - Sessão gestor (cookie / Authorization): proxy `GET /api/v1/delivery/pedidos` (Jiffy).
 * - Integrador legado: header `Bearer` + `status`/`data_atualizacao` (shape `{ pedidos: [...] }`).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const usarIntegrador = isRequisicaoListagemPedidosIntegradorLegada(searchParams, {
      bearerHeaderCustom: request.headers.get('Bearer') || request.headers.get('bearer'),
      integradorToken: request.headers.get('integrador-token'),
    })

    if (usarIntegrador) {
      return await listarPedidosIntegradorLegado(request)
    }

    return await listarPedidosModuloJiffy(request)
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Erro ao listar pedidos delivery:', {
        status: error.status,
        message: error.message,
        details: error.data,
      })
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    console.error('Erro ao listar pedidos delivery:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar pedidos' },
      { status: 500 }
    )
  }
}
