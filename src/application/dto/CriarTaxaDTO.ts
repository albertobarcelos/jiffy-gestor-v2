import { z } from 'zod'

/** Item opcional por terminal — sobrescreve o comportamento padrão da taxa naquele PDV. */
export const TerminalTaxaConfigSchema = z.object({
  terminalId: z.string().min(1),
  ativo: z.boolean(),
  automatico: z.boolean(),
  mesa: z.boolean(),
  balcao: z.boolean(),
})

/**
 * Payload para POST /api/v1/taxas (criar taxa da empresa).
 * Campos extras no JSON são rejeitados (.strict).
 */
export const CriarTaxaSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    valor: z.number(),
    tipo: z.enum(['percentual', 'fixo', 'entrega']),
    ativo: z.boolean(),
    tributado: z.boolean(),
    ncm: z.union([z.string(), z.null()]).optional(),
    terminaisConfig: z.array(TerminalTaxaConfigSchema).optional(),
  })
  .strict()

/** Contrato validado na borda (POST /api/taxas) — alinhado a `CriarTaxaPayload` no domínio. */
export type CriarTaxaRequest = z.infer<typeof CriarTaxaSchema>
