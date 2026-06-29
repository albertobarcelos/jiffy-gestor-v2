'use client'

import type { FormEvent } from 'react'
import { MdLock } from 'react-icons/md'
import { GestorPasswordField } from '@/src/presentation/components/features/auth/components/GestorPasswordField'
import { PasswordFieldPressReveal } from '@/src/presentation/components/features/auth/components/PasswordFieldPressReveal'

type PerfilConfiguracoesTabProps = {
  tokenDisponivel: boolean
  novaSenha: string
  onNovaSenhaChange: (value: string) => void
  confirmarSenha: string
  onConfirmarSenhaChange: (value: string) => void
  salvandoSenha: boolean
  onAlterarSenha: (e: FormEvent) => void
}

const submitButtonClassName =
  'rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50'

const sessaoIndisponivelSenhaClassName =
  'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'

export function PerfilConfiguracoesTab({
  tokenDisponivel,
  novaSenha,
  onNovaSenhaChange,
  confirmarSenha,
  onConfirmarSenhaChange,
  salvandoSenha,
  onAlterarSenha,
}: PerfilConfiguracoesTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-200 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <MdLock className="text-[var(--color-secondary)]" size={20} aria-hidden />
            Alterar senha
          </h3>
          <p className="mt-0.5 text-sm text-secondary-text">
            Mantenha sua conta segura com uma senha forte.
          </p>
        </header>

        {!tokenDisponivel ? (
          <div className="px-6 py-5">
            <p className={sessaoIndisponivelSenhaClassName}>
              Não há token de sessão válido para alterar a senha neste momento. Faça login novamente em{' '}
              <strong>Meus Aplicativos</strong> ou na empresa.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4 px-6 py-5" onSubmit={onAlterarSenha}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GestorPasswordField
                label="Nova senha"
                forcaBarIdPrefix="perfil-senha"
                required
                value={novaSenha}
                onChange={ev => onNovaSenhaChange(ev.target.value)}
                autoComplete="new-password"
                disabled={salvandoSenha}
              />
              <PasswordFieldPressReveal
                label="Confirmar nova senha"
                leadingLockIcon
                required
                value={confirmarSenha}
                onChange={ev => onConfirmarSenhaChange(ev.target.value)}
                autoComplete="new-password"
                disabled={salvandoSenha}
              />
            </div>
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <button type="submit" disabled={salvandoSenha} className={submitButtonClassName}>
                {salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
