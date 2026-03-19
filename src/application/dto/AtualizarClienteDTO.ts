import { z } from 'zod'

/**
 * Schema de validação para atualizar cliente
 */
export const AtualizarClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  razaoSocial: z.string().optional(),
  // CPF e CNPJ: aceita string, null ou undefined
  // null é usado para limpar/apagar o valor na API externa
  // string vazia também será convertida para null no repositório
  cpf: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
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
      codigoCidadeIbge: z.string().optional(),
      codigoEstadoIbge: z.string().optional(),
    })
    .optional(),
})

export type AtualizarClienteDTO = z.infer<typeof AtualizarClienteSchema>

