import { z } from 'zod'

/**
 * Schema de validação para criar cliente
 */
export const CriarClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  razaoSocial: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  nomeFantasia: z.string().optional(),
  ativo: z.boolean().optional().default(true),
  endereco: z
    .object({
      rua: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().optional(),
      cep: z.string().optional(),
      complemento: z.string().optional(),
    })
    .optional(),
})

export type CriarClienteDTO = z.infer<typeof CriarClienteSchema>

