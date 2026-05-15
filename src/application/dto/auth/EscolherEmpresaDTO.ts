import { z } from 'zod'

export const EscolherEmpresaRequestSchema = z
  .object({
    empresaId: z.string().min(1),
  })
  .strict()

export type EscolherEmpresaRequestDTO = z.infer<typeof EscolherEmpresaRequestSchema>

export const EscolherEmpresaResponseSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
  })
  .strict()

export type EscolherEmpresaResponseDTO = z.infer<typeof EscolherEmpresaResponseSchema>

