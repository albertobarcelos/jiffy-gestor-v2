import { z } from 'zod'

/**
 * Schema de validação para atualizar cliente
 */
export const AtualizarClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  razaoSocial: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  nomeFantasia: z.string().optional(),
  ativo: z.boolean().optional(),
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

export type AtualizarClienteDTO = z.infer<typeof AtualizarClienteSchema>

