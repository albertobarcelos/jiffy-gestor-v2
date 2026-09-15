import { NextResponse } from 'next/server'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'

export function searchParamsToRecord(searchParams: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    record[key] = value
  })
  return record
}

export function menuZodErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ZodError)) return null
  return NextResponse.json(
    { message: 'Dados inválidos', details: error.flatten() },
    { status: 400 }
  )
}

/** Aceita schemas com `.default()` / `.transform()` (input ≠ output). */
export function parseMenuRouteInput<TOutput>(
  schema: ZodType<TOutput, ZodTypeDef, unknown>,
  input: unknown
): TOutput {
  return schema.parse(input)
}
