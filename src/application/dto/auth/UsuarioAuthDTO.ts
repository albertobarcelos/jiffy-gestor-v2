import { z } from 'zod'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'

const senhaGestorField = z
  .string()
  .min(1, 'Senha é obrigatória')
  .refine(senhaGestorEhValida, { message: SENHA_GESTOR_MENSAGEM_ERRO })

/** POST /auth/usuario/registro-por-convite — exige conviteId; e-mail não exige confirmação. */
export const RegistroPorConviteRequestSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').trim(),
    username: z.string().min(1).email('E-mail inválido').trim(),
    password: senhaGestorField,
    conviteId: z.string().min(1, 'conviteId é obrigatório no registro por convite'),
  })
  .strict()

export type RegistroPorConviteRequestDTO = z.infer<typeof RegistroPorConviteRequestSchema>

/** POST /auth/usuario/auto-registro — sem convite; backend envia e-mail de confirmação. */
export const AutoRegistroRequestSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').trim(),
    username: z.string().min(1).email('E-mail inválido').trim(),
    password: senhaGestorField,
  })
  .strict()

export type AutoRegistroRequestDTO = z.infer<typeof AutoRegistroRequestSchema>

/** @deprecated Use RegistroPorConviteRequestSchema ou AutoRegistroRequestSchema. */
export const CreateUsuarioRequestSchema = AutoRegistroRequestSchema
export type CreateUsuarioRequestDTO = AutoRegistroRequestDTO

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

/** Corpo de POST /auth/usuario/redefinir-senha (token vai em Authorization: Bearer). */
export const RedefinirSenhaBodySchema = z
  .object({
    password: senhaGestorField,
  })
  .strict()

export type RedefinirSenhaBodyDTO = z.infer<typeof RedefinirSenhaBodySchema>

/** @deprecated Use RedefinirSenhaBodySchema; token não vai mais no body. */
export const ResetPasswordRequestSchema = RedefinirSenhaBodySchema
export type ResetPasswordRequestDTO = RedefinirSenhaBodyDTO
