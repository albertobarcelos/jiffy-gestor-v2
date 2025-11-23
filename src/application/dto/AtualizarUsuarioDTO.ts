import { z } from 'zod'

/**
 * Schema de validação para atualizar usuário
 */
export const AtualizarUsuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  telefone: z.string().optional(),
  ativo: z.boolean().optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  perfilPdvId: z.string().optional(),
})

export type AtualizarUsuarioDTO = z.infer<typeof AtualizarUsuarioSchema>

