import { z } from 'zod'
import { TerminalTaxaConfigSchema } from '@/src/application/dto/CriarTaxaDTO'

/**
 * Payload para PATCH /api/v1/taxas/:id — alinhado ao contrato do backend (Swagger).
 */
export const AtualizarTaxaSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    valor: z.number(),
    tipo: z.enum(['percentual', 'fixo', 'entrega']),
    ativo: z.boolean(),
    tributado: z.boolean(),
    ncm: z.union([z.string(), z.null()]).optional(),
    /**
     * Opcional no gestor — o upstream pode rejeitar string ISO (validação `Date`).
     * O repositório não repassa este campo ao microserviço.
     */
    dataAtualizacao: z.string().min(1).optional(),
    terminaisConfig: z.array(TerminalTaxaConfigSchema).optional(),
  })
  .strict()

export type AtualizarTaxaRequest = z.infer<typeof AtualizarTaxaSchema>
