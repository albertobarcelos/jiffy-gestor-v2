import { NextResponse } from 'next/server'
import { ApiError } from '@/src/infrastructure/api/apiClient'

/** Resposta de erro padronizada para rotas BFF de menus. */
export function menuApiErrorResponse(error: unknown, fallback: string) {
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
