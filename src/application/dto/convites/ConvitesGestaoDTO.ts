import { z } from 'zod'

const idStr = z.union([z.string(), z.number()]).transform(v => String(v))

/**
 * Convite na gestão da empresa (emitidos pela empresa autenticada).
 * Contrato alinhado ao Swagger GET/POST /convites e respostas de reenviar.
 * Sem `.strict()` na resposta para tolerar campos extras da API; IDs podem vir como número.
 */
export const ConviteGestaoSchema = z.object({
  id: idStr.pipe(z.string().min(1)),
  email: z.string().email(),
  empresaId: idStr.pipe(z.string().min(1)),
  perfilGestorId: idStr.pipe(z.string().min(1)),
  status: z.string().min(1),
  expiraEm: z.string().min(1),
  dataCriacao: z.string().min(1),
  dataAtualizacao: z.string().min(1),
  emailEnviado: z.boolean().optional().default(false),
})

export const ListarConvitesGestaoResponseSchema = z.array(ConviteGestaoSchema)

/** Normaliza corpo da API quando não vem array na raiz (ex.: paginação). */
export function unwrapListaConvitesGestaoResponse(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return raw
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.items)) {
      return o.items
    }
    if (Array.isArray(o.data)) {
      return o.data
    }
    if (Array.isArray(o.convites)) {
      return o.convites
    }
  }
  return raw
}

export const CriarConviteGestaoRequestSchema = z
  .object({
    email: z.string().email(),
    perfilGestorId: z.string().min(1),
  })
  .strict()

export type ConviteGestaoDTO = z.infer<typeof ConviteGestaoSchema>
export type CriarConviteGestaoRequestDTO = z.infer<typeof CriarConviteGestaoRequestSchema>
