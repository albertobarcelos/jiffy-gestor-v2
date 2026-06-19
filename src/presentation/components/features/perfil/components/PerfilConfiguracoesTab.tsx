'use client'

import type { FormEvent } from 'react'
import { MdEdit, MdLock } from 'react-icons/md'
import { GestorPasswordField } from '@/src/presentation/components/features/auth/components/GestorPasswordField'
import { PasswordFieldPressReveal } from '@/src/presentation/components/features/auth/components/PasswordFieldPressReveal'

type PerfilConfiguracoesTabProps = {
  tokenDisponivel: boolean
  novoNome: string
  onNovoNomeChange: (value: string) => void
  salvandoNome: boolean
  onAlterarNome: (e: FormEvent) => void
  novaSenha: string
  onNovaSenhaChange: (value: string) => void
  confirmarSenha: string
  onConfirmarSenhaChange: (value: string) => void
  salvandoSenha: boolean
  onAlterarSenha: (e: FormEvent) => void
}

const inputClassName =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] disabled:bg-gray-50'

const submitButtonClassName =
  'rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50'

const sessaoIndisponivelClassName = 'rounded-lg px-4 py-3 text-sm text-secondary'

const sessaoIndisponivelSenhaClassName =
  'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'

export function PerfilConfiguracoesTab({
  tokenDisponivel,
  novoNome,
  onNovoNomeChange,
  salvandoNome,
  onAlterarNome,
  novaSenha,
  onNovaSenhaChange,
  confirmarSenha,
  onConfirmarSenhaChange,
  salvandoSenha,
  onAlterarSenha,
}: PerfilConfiguracoesTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-200 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <MdEdit className="text-[var(--color-secondary)]" size={20} aria-hidden />
            Nome de exibição
          </h3>
          <p className="mt-0.5 text-sm text-secondary-text">
            É assim que seu nome aparece para os demais usuários.
          </p>
        </header>

        {!tokenDisponivel ? (
          <div className="px-6 py-5">
            <p className={sessaoIndisponivelClassName}>
              Não há token de sessão válido para alterar o nome neste momento. Faça login novamente em{' '}
              <strong>Meus Aplicativos</strong> ou na empresa.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4 px-6 py-5" onSubmit={onAlterarNome}>
            <div>
              <label htmlFor="perfil-novo-nome" className="mb-1.5 block text-sm font-medium text-gray-800">
                Nome
              </label>
              <input
                id="perfil-novo-nome"
                type="text"
                autoComplete="name"
                maxLength={200}
                value={novoNome}
                onChange={ev => onNovoNomeChange(ev.target.value)}
                disabled={salvandoNome}
                className={inputClassName}
                placeholder="Digite seu nome"
              />
            </div>
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <button type="submit" disabled={salvandoNome || novoNome.trim().length === 0} className={submitButtonClassName}>
                {salvandoNome ? 'Salvando…' : 'Salvar nome'}
              </button>
            </div>
          </form>
        )}
      </section>

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
