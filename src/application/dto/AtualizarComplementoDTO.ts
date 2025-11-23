import { z } from 'zod'

/**
 * Schema de validação para atualizar complemento
 */
export const AtualizarComplementoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  descricao: z.string().optional(),
  valor: z.number().min(0, 'Valor não pode ser negativo').optional(),
  ativo: z.boolean().optional(),
  tipoImpactoPreco: z.string().optional(),
  ordem: z.number().int().optional(),
})

export type AtualizarComplementoDTO = z.infer<typeof AtualizarComplementoSchema>

