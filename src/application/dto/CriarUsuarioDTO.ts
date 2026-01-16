import { z } from 'zod'

/**
 * Schema de validação para criar usuário
 */
export const CriarUsuarioSchema = z.object({
  id: z.string().optional(), // ID é opcional na criação (gerado pelo backend)
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  ativo: z.boolean().optional().default(true),
  password: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres').max(4, 'Senha deve ter exatamente 4 caracteres').optional(),
  perfilPdvId: z.string().optional(),
})

export type CriarUsuarioDTO = z.infer<typeof CriarUsuarioSchema>

