import { z } from 'zod'

/**
 * Schema de validação para atualizar cliente
 */
export const AtualizarClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  razaoSocial: z.string().nullable().optional(),
  // CPF e CNPJ: aceita string, null ou undefined
  // null é usado para limpar/apagar o valor na API externa
  // string vazia também será convertida para null no repositório
  cpf: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  // null ou '' limpam o valor na API (mesmo padrão de cpf/cnpj no repositório)
  telefone: z.string().nullable().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal(''), z.null()]).optional(),
  nomeFantasia: z.string().nullable().optional(),
  indicadorInscricaoEstadual: z.string().optional(),
  inscricaoEstadual: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
  endereco: z
    .object({
      rua: z.string().nullable().optional(),
      numero: z.string().nullable().optional(),
      bairro: z.string().nullable().optional(),
      cidade: z.string().nullable().optional(),
      // null no contrato = limpar; o repositório envia string vazia à API externa
      estado: z.string().nullable().optional(),
      cep: z.string().nullable().optional(),
      complemento: z.string().nullable().optional(),
      codigoCidadeIbge: z.string().nullable().optional(),
      codigoEstadoIbge: z.string().nullable().optional(),
    })
    .optional(),
})

export type AtualizarClienteDTO = z.infer<typeof AtualizarClienteSchema>

