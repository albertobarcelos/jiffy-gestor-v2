import { z } from 'zod'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'

const senhaGestorField = z
  .string()
  .min(1, 'Senha é obrigatória')
  .refine(senhaGestorEhValida, { message: SENHA_GESTOR_MENSAGEM_ERRO })

/** POST /auth/usuario/registro */
export const CreateUsuarioRequestSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').trim(),
    username: z.string().min(1).email('E-mail inválido').trim(),
    password: senhaGestorField,
    /** Alinha com convite pendente no backend (cadastro ativo sem confirmação de e-mail). */
    conviteId: z.string().min(1).optional(),
  })
  .strict()

export type CreateUsuarioRequestDTO = z.infer<typeof CreateUsuarioRequestSchema>

/** POST /auth/usuario/confirmar-email */
export const ConfirmEmailRequestSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
  })
  .strict()

export type ConfirmEmailRequestDTO = z.infer<typeof ConfirmEmailRequestSchema>

/** POST /auth/usuario/reenviar-confirmacao */
export const ResendConfirmationEmailRequestSchema = z
  .object({
    username: z.string().min(1).email('E-mail inválido').trim(),
  })
  .strict()

export type ResendConfirmationEmailRequestDTO = z.infer<typeof ResendConfirmationEmailRequestSchema>

/** POST /auth/usuario/esqueci-senha */
export const ForgotPasswordRequestSchema = ResendConfirmationEmailRequestSchema

export type ForgotPasswordRequestDTO = z.infer<typeof ForgotPasswordRequestSchema>

/** POST /auth/usuario/redefinir-senha */
export const ResetPasswordRequestSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: senhaGestorField,
  })
  .strict()

export type ResetPasswordRequestDTO = z.infer<typeof ResetPasswordRequestSchema>
