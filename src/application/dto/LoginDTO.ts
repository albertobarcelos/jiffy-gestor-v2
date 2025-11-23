import { z } from 'zod'

/**
 * Schema de validação para login
 */
export const LoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Email ou usuário é obrigatório')
    .email('Email inválido')
    .or(z.string().min(3, 'Username deve ter pelo menos 3 caracteres')),
  password: z.string().min(1, 'Senha é obrigatória'),
})

/**
 * DTO para requisição de login
 */
export type LoginDTO = z.infer<typeof LoginSchema>

