import { z } from 'zod'

/**
 * Schema de validação para criar complemento
 */
export const CriarComplementoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  valor: z.number().min(0, 'Valor não pode ser negativo').optional().default(0),
  ativo: z.boolean().optional().default(true),
  tipoImpactoPreco: z.string().optional(),
})

export type CriarComplementoDTO = z.infer<typeof CriarComplementoSchema>

