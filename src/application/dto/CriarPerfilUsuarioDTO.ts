import { z } from 'zod'

/**
 * Schema de validação para criar perfil de usuário
 */
export const CriarPerfilUsuarioSchema = z.object({
  role: z.string().min(1, 'Role é obrigatório'),
  acessoMeiosPagamento: z.array(z.string()).optional().default([]),
  cancelarVenda: z.boolean().optional().default(false),
  cancelarProduto: z.boolean().optional().default(false),
  aplicarDescontoProduto: z.boolean().optional().default(false),
  aplicarDescontoVenda: z.boolean().optional().default(false),
  aplicarAcrescimoProduto: z.boolean().optional().default(false),
  aplicarAcrescimoVenda: z.boolean().optional().default(false),
})

export type CriarPerfilUsuarioDTO = z.infer<typeof CriarPerfilUsuarioSchema>

