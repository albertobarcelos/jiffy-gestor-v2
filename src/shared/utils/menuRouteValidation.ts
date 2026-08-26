import { NextResponse } from 'next/server'
import { ZodError, type ZodSchema } from 'zod'

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

export function parseMenuRouteInput<T>(schema: ZodSchema<T>, input: unknown): T {
  return schema.parse(input)
}
