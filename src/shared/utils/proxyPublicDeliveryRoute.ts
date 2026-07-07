import { NextResponse } from 'next/server'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

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
    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    console.error('Erro no proxy delivery público:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
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
    return NextResponse.json(response.data ?? {}, { status: response.status || 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    console.error('Erro no proxy delivery público POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
