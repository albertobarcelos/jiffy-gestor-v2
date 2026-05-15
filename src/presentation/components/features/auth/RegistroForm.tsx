'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'
import { showToast } from '@/src/shared/utils/toast'
import { executarPosRegistroConvite } from '@/src/presentation/components/features/auth/utils/executarPosRegistroConvite'
import { AuthEmailField } from '@/src/presentation/components/features/auth/components/AuthEmailField'
import { AuthNameField } from '@/src/presentation/components/features/auth/components/AuthNameField'
import { GestorPasswordField } from '@/src/presentation/components/features/auth/components/GestorPasswordField'
import { PasswordFieldPressReveal } from '@/src/presentation/components/features/auth/components/PasswordFieldPressReveal'

export function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fluxoConvite = searchParams.get('novousuario') === 'true'
  const emailConvite = searchParams.get('email') ?? ''
  const conviteId = searchParams.get('conviteId') ?? ''
  const isRegistroPorConvite = conviteId.trim().length > 0

  const login = useAuthStore(s => s.login)
  const setHubEmpresas = useAuthStore(s => s.setHubEmpresas)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (emailConvite.trim()) {
      setEmail(emailConvite.trim())
    }
  }, [emailConvite])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

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
      const conviteIdTrim = conviteId.trim()
      const isRegistroPorConvite = conviteIdTrim.length > 0

      if (fluxoConvite && !isRegistroPorConvite) {
        throw new Error(
          'Link de convite incompleto: falta o identificador do convite (conviteId). Abra o link enviado por e-mail.'
        )
      }

      const url = isRegistroPorConvite
        ? '/api/auth/usuario/registro-por-convite'
        : '/api/auth/usuario/auto-registro'

      const body = isRegistroPorConvite
        ? {
            nome: nome.trim(),
            username: email.trim(),
            password,
            conviteId: conviteIdTrim,
          }
        : {
            nome: nome.trim(),
            username: email.trim(),
            password,
          }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; ativo?: boolean }

      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível concluir o cadastro.')
      }

      if (isRegistroPorConvite) {
        await executarPosRegistroConvite(email.trim(), password, {
          login,
          setHubEmpresas,
          getHubEmpresas: () => useAuthStore.getState().hubEmpresas,
          onPrecisaConfirmarEmail: () => router.push('/registro/sucesso'),
          onConcluido: () => router.replace('/meus-apps'),
        })
        return
      }

      if (data.ativo) {
        router.push('/registro/sucesso?ativo=true')
      } else {
        router.push('/registro/sucesso')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 [@media(max-height:720px)]:space-y-2 [@media(max-height:640px)]:space-y-1.5"
    >
      {isRegistroPorConvite ? (
        <p className="text-sm text-gray-800 rounded-lg bg-white/50 border border-white/60 p-3">
          Você foi convidado para uma empresa na Jiffy. Complete o cadastro; em seguida entraremos e aceitaremos o
          convite automaticamente quando possível.
        </p>
      ) : null}

      <AuthNameField
        label="Nome completo"
        required
        value={nome}
        onChange={e => setNome(e.target.value)}
        disabled={loading}
      />
      <AuthEmailField
        label="E-mail"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        readOnly={isRegistroPorConvite && Boolean(emailConvite.trim())}
        disabled={loading}
        className={
          isRegistroPorConvite && emailConvite.trim() ? 'cursor-not-allowed opacity-90' : undefined
        }
      />
      <GestorPasswordField
        label="Senha"
        forcaBarIdPrefix="registro-senha"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="new-password"
        disabled={loading}
      />
      <PasswordFieldPressReveal
        label="Confirmar senha"
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
        {loading ? (isRegistroPorConvite ? 'Entrando…' : 'Cadastrando…') : isRegistroPorConvite ? 'Cadastrar e continuar' : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-gray-700">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-[var(--color-secondary)] underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}
