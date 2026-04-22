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
  removerProdutoLancado: z.boolean().optional().default(false),
  removerPagamento: z.boolean().optional().default(false),
  reimprimir: z.boolean().optional().default(false),
  acessoVisaoGeral: z.boolean().optional().default(false),
  acessoHistorico: z.boolean().optional().default(false),
  acessoMesa: z.boolean().optional().default(false),
  acessoBalcao: z.boolean().optional().default(false),
  acessoConfiguracoes: z.boolean().optional().default(false),
  crudCardapio: z.boolean().optional().default(false),
  crudUsuario: z.boolean().optional().default(false),
  crudCliente: z.boolean().optional().default(false),
  encerrarCaixa: z.boolean().optional().default(false),
  lancarTaxa: z.boolean().optional().default(false),
  removerTaxa: z.boolean().optional().default(false),
  removerLicenca: z.boolean().optional().default(false),
})

export type CriarPerfilUsuarioDTO = z.infer<typeof CriarPerfilUsuarioSchema>

