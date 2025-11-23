import { z } from 'zod'

/**
 * Schema de validação para criar usuário
 */
export const CriarUsuarioSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  ativo: z.boolean().optional().default(true),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  perfilPdvId: z.string().optional(),
})

export type CriarUsuarioDTO = z.infer<typeof CriarUsuarioSchema>

