import { z } from 'zod'

export const TipoImpactoPrecoSchema = z.enum(['nenhum', 'aumenta', 'diminui'])

export const VinculoComplementoOverrideSchema = z
  .object({
    menuId: z.string().trim().min(1, 'ID do menu é obrigatório'),
    produtoId: z.string().trim().min(1, 'ID do produto é obrigatório'),
    complementoId: z.string().trim().min(1, 'ID do complemento é obrigatório'),
    grupoComplementoId: z.string().trim().min(1, 'ID do grupo de complementos é obrigatório'),
    valor: z.number().min(0, 'Valor não pode ser negativo').optional(),
    ativo: z.boolean().optional(),
  })
  .refine(item => item.valor !== undefined || item.ativo !== undefined, {
    message: 'Cada vínculo deve informar valor e/ou ativo',
  })

export const ImpactoComplementoNoGrupoSchema = z.object({
  grupoComplementoId: z.string().trim().min(1, 'ID do grupo de complementos é obrigatório'),
  complementoId: z.string().trim().min(1, 'ID do complemento é obrigatório'),
  tipoImpactoPreco: TipoImpactoPrecoSchema,
})

export const AtualizarVinculosComplementoSchema = z.object({
  vinculos: z
    .array(VinculoComplementoOverrideSchema)
    .min(1, 'Informe ao menos um vínculo')
    .max(100, 'Máximo de 100 vínculos'),
})

export const AtualizarImpactoComplementoNosGruposSchema = z.object({
  grupos: z
    .array(ImpactoComplementoNoGrupoSchema)
    .min(1, 'Informe ao menos um grupo')
    .max(100, 'Máximo de 100 grupos'),
})

export const AtualizarOverridesComplementoSchema = z
  .object({
    vinculos: z
      .array(VinculoComplementoOverrideSchema)
      .min(1, 'Informe ao menos um vínculo')
      .max(100, 'Máximo de 100 vínculos')
      .optional(),
    grupos: z
      .array(ImpactoComplementoNoGrupoSchema)
      .min(1, 'Informe ao menos um grupo')
      .max(100, 'Máximo de 100 grupos')
      .optional(),
  })
  .refine(
    body => (body.vinculos !== undefined && body.vinculos.length > 0) || (body.grupos !== undefined && body.grupos.length > 0),
    { message: 'Informe vínculos e/ou grupos' }
  )

export const ReordenarGrupoComplementoNoMenuSchema = z.object({
  novaPosicao: z.coerce.number().int().min(1, 'Nova posição inválida'),
  grupoComplementoId: z.string().trim().min(1, 'ID do grupo de complementos é obrigatório'),
})

export const ReordenarComplementoNoMenuSchema = ReordenarGrupoComplementoNoMenuSchema.extend({
  complementoId: z.string().trim().min(1, 'ID do complemento é obrigatório'),
})

export type AtualizarVinculosComplementoDTO = z.infer<typeof AtualizarVinculosComplementoSchema>
export type AtualizarImpactoComplementoNosGruposDTO = z.infer<
  typeof AtualizarImpactoComplementoNosGruposSchema
>
export type AtualizarOverridesComplementoDTO = z.infer<typeof AtualizarOverridesComplementoSchema>
export type ReordenarGrupoComplementoNoMenuDTO = z.infer<typeof ReordenarGrupoComplementoNoMenuSchema>
export type ReordenarComplementoNoMenuDTO = z.infer<typeof ReordenarComplementoNoMenuSchema>
