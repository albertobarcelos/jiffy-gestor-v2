import { NextResponse } from 'next/server'
import type { PizzaPaginatedResponse } from '@/src/shared/types/pizza'
import { ApiError } from '@/src/infrastructure/api/apiClient'

/** Resposta de erro padronizada para rotas BFF de pizza. */
export function pizzaApiErrorResponse(error: unknown, fallback: string) {
  console.error(fallback, error)

  if (error instanceof ApiError) {
    return NextResponse.json(
      { message: error.message || fallback },
      { status: error.status || 500 }
    )
  }

  const err = error as { message?: string; status?: number }
  return NextResponse.json(
    { message: err?.message || fallback },
    { status: err?.status || 500 }
  )
}

export function parsePizzaPagination(searchParams: URLSearchParams) {
  const q = searchParams.get('q') || undefined
  const limitParsed = Number.parseInt(searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(limitParsed) ? Math.min(Math.max(limitParsed, 1), 100) : 20
  const offsetParsed = Number.parseInt(searchParams.get('offset') || '0', 10)
  const offset = Number.isFinite(offsetParsed) ? Math.max(offsetParsed, 0) : 0
  const ativoParam = searchParams.get('ativo')
  const ativo =
    ativoParam === 'true' ? true : ativoParam === 'false' ? false : null

  return { q, limit, offset, ativo }
}

export function pizzaJsonPaginated<T>(result: PizzaPaginatedResponse<T>) {
  return NextResponse.json(
    { success: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export function pizzaJsonData<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

export function pizzaJsonOk() {
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
