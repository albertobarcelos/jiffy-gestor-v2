import { z } from 'zod'

/**
 * Schema de validação para criar impressora
 */
export const CriarImpressoraSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  modelo: z.string().optional(),
  ativo: z.boolean().optional().default(true),
  tipoConexao: z.string().optional(),
  ip: z.string().optional(),
  porta: z.string().optional(),
  terminais: z.array(z.any()).optional(),
})

export type CriarImpressoraDTO = z.infer<typeof CriarImpressoraSchema>

