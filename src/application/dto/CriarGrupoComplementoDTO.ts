import { z } from 'zod'

/**
 * Schema de validação para criar grupo de complementos
 */
export const CriarGrupoComplementoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  qtdMinima: z.number().min(0, 'Quantidade mínima não pode ser negativa').int('Quantidade mínima deve ser um número inteiro'),
  qtdMaxima: z.number().min(0, 'Quantidade máxima não pode ser negativa').int('Quantidade máxima deve ser um número inteiro'),
  ativo: z.boolean().optional().default(true),
  complementosIds: z.array(z.string()).optional().default([]),
}).refine((data) => data.qtdMinima <= data.qtdMaxima, {
  message: 'Quantidade mínima não pode ser maior que máxima',
  path: ['qtdMinima'],
})

export type CriarGrupoComplementoDTO = z.infer<typeof CriarGrupoComplementoSchema>

