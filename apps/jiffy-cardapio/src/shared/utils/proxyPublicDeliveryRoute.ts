import { NextResponse } from 'next/server'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/** CORS aberto: catálogo/checkout públicos + Design do Gestor em outro host. */
const PUBLIC_CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
}

function withPublicCors(init?: {
  status?: number
  headers?: HeadersInit
}): { status: number; headers: HeadersInit } {
  return {
    status: init?.status ?? 200,
    headers: {
      'Cache-Control': 'no-store',
      ...PUBLIC_CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  }
}

export function publicDeliveryOptionsResponse(): NextResponse {
  return new NextResponse(null, withPublicCors({ status: 204 }))
}

export async function proxyPublicDeliveryGet(
  upstreamPath: string,
  searchParams?: URLSearchParams
): Promise<NextResponse> {
  try {
    const qs = searchParams?.toString()
    const endpoint = qs ? `${upstreamPath}?${qs}` : upstreamPath
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    return NextResponse.json(
      response.data ?? {},
      withPublicCors({ status: response.status || 200 })
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        withPublicCors({ status: error.status })
      )
    }
    console.error('Erro no proxy delivery público:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      withPublicCors({ status: 500 })
    )
  }
}

export async function proxyPublicDeliveryPost(
  upstreamPath: string,
  body: unknown
): Promise<NextResponse> {
  try {
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(upstreamPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    return NextResponse.json(
      response.data ?? {},
      withPublicCors({ status: response.status || 201 })
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        withPublicCors({ status: error.status })
      )
    }
    console.error('Erro no proxy delivery público POST:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      withPublicCors({ status: 500 })
    )
  }
}

export async function proxyPublicDeliveryPatch(
  upstreamPath: string,
  body: unknown
): Promise<NextResponse> {
  try {
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(upstreamPath, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    return NextResponse.json(
      response.data ?? {},
      withPublicCors({ status: response.status || 200 })
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        withPublicCors({ status: error.status })
      )
    }
    console.error('Erro no proxy delivery público PATCH:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      withPublicCors({ status: 500 })
    )
  }
}
