import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function caixaEstacaoZodErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ZodError)) return null
  const first = error.errors[0]
  return NextResponse.json(
    { error: first?.message ?? 'Dados inválidos', details: error.flatten() },
    { status: 400 }
  )
}
