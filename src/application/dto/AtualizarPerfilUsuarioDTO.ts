import { z } from 'zod'

/**
 * Schema de validação para atualizar perfil de usuário
 */
export const AtualizarPerfilUsuarioSchema = z.object({
  role: z.string().min(1, 'Role é obrigatório').optional(),
  // Aceita array vazio explicitamente
  acessoMeiosPagamento: z.array(z.string()).optional(),
  cancelarVenda: z.boolean().optional(),
  cancelarProduto: z.boolean().optional(),
  aplicarDescontoProduto: z.boolean().optional(),
  aplicarDescontoVenda: z.boolean().optional(),
  aplicarAcrescimoProduto: z.boolean().optional(),
  aplicarAcrescimoVenda: z.boolean().optional(),
})

export type AtualizarPerfilUsuarioDTO = z.infer<typeof AtualizarPerfilUsuarioSchema>

