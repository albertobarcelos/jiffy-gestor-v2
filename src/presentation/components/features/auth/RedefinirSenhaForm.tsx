'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'
import { showToast } from '@/src/shared/utils/toast'
import { GestorPasswordField } from '@/src/presentation/components/features/auth/components/GestorPasswordField'
import { PasswordFieldPressReveal } from '@/src/presentation/components/features/auth/components/PasswordFieldPressReveal'

export function RedefinirSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Link inválido: falta o token.')
      return
    }
    if (!senhaGestorEhValida(password)) {
      showToast.warning(SENHA_GESTOR_MENSAGEM_ERRO)
      return
    }
    if (password !== confirm) {
      showToast.error('As senhas não conferem.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/usuario/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (res.status === 204) {
        router.push('/redefinir-senha/sucesso')
        return
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error || 'Token inválido/expirado ou senha fora dos padrões.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-error text-sm">Link inválido ou incompleto.</p>
        <Link href="/login" className="font-semibold text-[var(--color-alternate)] underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 [@media(max-height:720px)]:space-y-3 [@media(max-height:640px)]:space-y-2.5"
    >
      <GestorPasswordField
        label="Nova senha"
        forcaBarIdPrefix="redefinir-senha"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="new-password"
        disabled={loading}
      />
      <PasswordFieldPressReveal
        label="Confirmar nova senha"
        leadingLockIcon
        required
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        autoComplete="new-password"
        disabled={loading}
      />
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[var(--color-secondary)] disabled:opacity-50"
      >
        {loading ? 'Salvando…' : 'Salvar nova senha'}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-[var(--color-secondary)] underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
