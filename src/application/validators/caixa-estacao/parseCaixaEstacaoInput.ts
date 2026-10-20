import type { ZodType, ZodTypeDef } from 'zod'

export function parseCaixaEstacaoInput<TOutput>(
  schema: ZodType<TOutput, ZodTypeDef, unknown>,
  input: unknown
): TOutput {
  return schema.parse(input)
}
