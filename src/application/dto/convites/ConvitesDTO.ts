import { z } from 'zod'

/**
 * DTOs do fluxo de convites pendentes (contrato do backend).
 * Observação: datas vêm como string (provavelmente ISO).
 */
export const ConvitePendenteSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    empresaId: z.string().min(1),
    nomeEmpresa: z.string().min(1),
    perfilGestorId: z.string().min(1),
    expiraEm: z.string().min(1),
  })
  .strict()

export const ListarConvitesPendentesResponseSchema = z.array(ConvitePendenteSchema)

export type ConvitePendenteResponseDTO = z.infer<typeof ConvitePendenteSchema>

