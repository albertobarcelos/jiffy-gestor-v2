import { NextRequest, NextResponse } from 'next/server'
import type { z } from 'zod'
import { ZodError } from 'zod'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Encaminha POST validado para o jiffy-backend (BFF). Respeita 201/204/4xx do upstream.
 */
export async function proxyAuthUsuarioPost<T>(
  request: NextRequest,
  upstreamPath: string,
  schema: z.ZodType<T>
): Promise<NextResponse> {
  try {
    const body: unknown = await request.json()
    const validated = schema.parse(body)
    const apiClient = new ApiClient()
    const { data, status } = await apiClient.request<unknown>(upstreamPath, {
      method: 'POST',
      body: JSON.stringify(validated),
    })

    if (status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    if (status === 201) {
      return NextResponse.json(data ?? {}, { status: 201 })
    }

    return NextResponse.json(data ?? {}, { status })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      )
    }
    if (error instanceof ZodError) {
      const first = error.issues[0]?.message
      return NextResponse.json({ error: first || 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
