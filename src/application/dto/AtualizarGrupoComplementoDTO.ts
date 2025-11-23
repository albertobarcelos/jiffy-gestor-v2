import { z } from 'zod'

/**
 * Schema de validação para atualizar grupo de complementos
 */
export const AtualizarGrupoComplementoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  qtdMinima: z.number().min(0, 'Quantidade mínima não pode ser negativa').int('Quantidade mínima deve ser um número inteiro').optional(),
  qtdMaxima: z.number().min(0, 'Quantidade máxima não pode ser negativa').int('Quantidade máxima deve ser um número inteiro').optional(),
  ativo: z.boolean().optional(),
  complementosIds: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.qtdMinima !== undefined && data.qtdMaxima !== undefined) {
    return data.qtdMinima <= data.qtdMaxima
  }
  return true
}, {
  message: 'Quantidade mínima não pode ser maior que máxima',
  path: ['qtdMinima'],
})

export type AtualizarGrupoComplementoDTO = z.infer<typeof AtualizarGrupoComplementoSchema>

