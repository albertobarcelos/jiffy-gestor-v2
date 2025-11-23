import { z } from 'zod'

/**
 * Schema de validação para atualizar impressora
 */
export const AtualizarImpressoraSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  modelo: z.string().optional(),
  ativo: z.boolean().optional(),
  tipoConexao: z.string().optional(),
  ip: z.string().optional(),
  porta: z.string().optional(),
  terminais: z.array(z.any()).optional(),
})

export type AtualizarImpressoraDTO = z.infer<typeof AtualizarImpressoraSchema>

