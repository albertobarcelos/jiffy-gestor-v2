import { z } from 'zod'

/**
 * Schema de validação para atualizar usuário
 */
export const AtualizarUsuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  telefone: z.string().optional(),
  ativo: z.boolean().optional(),
  password: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres').max(4, 'Senha deve ter exatamente 4 caracteres').optional(),
  perfilPdvId: z.string().optional(),
})

export type AtualizarUsuarioDTO = z.infer<typeof AtualizarUsuarioSchema>

