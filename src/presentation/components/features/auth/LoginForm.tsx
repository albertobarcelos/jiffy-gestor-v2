'use client'

import { useState, FormEvent, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { loginViaApiRoute } from '@/src/presentation/components/features/auth/utils/loginViaApiRoute'
import { extrairEmailLoginQuery } from '@/src/presentation/components/features/auth/utils/emailFromLoginQuery'
import { decodeInvitePayloadFromLoginSearch } from '@/src/presentation/components/features/auth/utils/inviteLoginPayload'
import { AuthEnvelopeIcon, AuthLockIcon } from '@/src/presentation/components/features/auth/components/auth-input-icons'
import { authFluid } from '@/src/presentation/components/features/auth/components/auth-input-fluid'
import { cn } from '@/src/shared/utils/cn'

/**
 * Componente de formulário de login
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const { loginWithHubEmpresas, setLoading, setError, isLoading } = useAuthStore()

  /** Convite por e-mail: `p` (base64url), ou legado `email` / `conviteId`. */
  useEffect(() => {
    const doPayload = decodeInvitePayloadFromLoginSearch(searchParams)
    if (doPayload?.email?.trim()) {
      setEmail(doPayload.email.trim())
      return
    }
    const daBusca = searchParams.get('email')
    if (daBusca?.trim()) {
      try {
        setEmail(decodeURIComponent(daBusca.trim()))
      } catch {
        setEmail(daBusca.trim())
      }
      return
    }
    if (typeof window !== 'undefined') {
      const recuperado = extrairEmailLoginQuery(window.location.search)
      if (recuperado) {
        setEmail(recuperado)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setError(null)
    setNeedsEmailConfirmation(false)
    setResendMessage(null)

    // Validação básica
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório'
    }
    if (!password) {
      newErrors.password = 'Senha é obrigatória'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)

      const resultado = await loginViaApiRoute(email.trim(), password)

      if (!resultado.ok) {
        if (resultado.needsEmailConfirmation) {
          setNeedsEmailConfirmation(true)
        }
        throw new Error(resultado.error)
      }

      loginWithHubEmpresas(resultado.auth, resultado.empresas)

      router.replace('/meus-apps')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login'
      setError(message)
      setErrors({ email: message })
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email.trim()) return
    setResendLoading(true)
    setResendMessage(null)
    try {
      const res = await fetch('/api/auth/usuario/reenviar-confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim() }),
      })
      if (res.ok) {
        setResendMessage(
          'Se o e-mail estiver cadastrado e pendente de confirmação, um novo link foi enviado.'
        )
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setResendMessage(data.error || 'Não foi possível reenviar o e-mail.')
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 [@media(max-height:720px)]:space-y-2 [@media(max-height:640px)]:space-y-1.5"
    >
      {/* Campo E-mail com ícone de envelope */}
      <div>
        <label className={authFluid.label}>E-mail</label>
        <div className="relative">
          <div className={authFluid.iconLeft}>
            <AuthEnvelopeIcon className={authFluid.iconSvg} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            disabled={isLoading}
            autoComplete="email"
            className={cn(
              authFluid.shell,
              authFluid.textAndPy,
              authFluid.padIconField,
              errors.email ? 'border-error' : '',
              isLoading ? 'cursor-not-allowed opacity-50' : ''
            )}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-error">{errors.email}</p>
        )}
        {needsEmailConfirmation && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="mb-2">Confirme seu e-mail para continuar.</p>
            <button
              type="button"
              onClick={() => void handleResendConfirmation()}
              disabled={resendLoading || !email.trim()}
              className="w-full py-2 rounded-lg font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-xs sm:text-sm"
            >
              {resendLoading ? 'Enviando…' : 'Reenviar e-mail de confirmação'}
            </button>
            {resendMessage ? <p className="mt-2 text-xs text-amber-900">{resendMessage}</p> : null}
          </div>
        )}
      </div>

      {/* Campo Senha com ícone de cadeado e toggle de visibilidade */}
      <div>
        <label className={authFluid.label}>Senha</label>
        <div className="relative">
          <div className={authFluid.iconLeft}>
            <AuthLockIcon className={authFluid.iconSvg} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="current-password"
            className={cn(
              authFluid.shell,
              authFluid.textAndPy,
              authFluid.padPwdField,
              errors.password ? 'border-error' : '',
              isLoading ? 'cursor-not-allowed opacity-50' : ''
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              authFluid.eyeBtn,
              'hover:text-gray-700',
              isLoading && 'cursor-not-allowed opacity-50'
            )}
            disabled={isLoading}
          >
            {showPassword ? (
              <svg
                className={authFluid.eyeIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L3 3"
                />
              </svg>
            ) : (
              <svg
                className={authFluid.eyeIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-error">{errors.password}</p>
        )}
      </div>

      {/* Botão Acessar - roxo vibrante */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-[var(--color-secondary)] hover:bg-[var(--color-alternate)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          backgroundColor: 'var(--color-secondary)',
        }}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Carregando...
          </>
        ) : (
          'Acessar'
        )}
      </button>

      <div className="space-y-1 text-center">
        <Link
          href="/esqueci-senha"
          className="block w-full text-sm text-[var(--color-secondary)] hover:text-[var(--color-alternate)] transition-colors disabled:opacity-50"
          style={{ color: 'var(--color-secondary)' }}
        >
          Esqueceu sua senha?
        </Link>
        <p className="text-sm text-gray-700">
          Não tem conta?{' '}
          <Link href="/registro" className="font-semibold text-[var(--color-secondary)] underline">
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  )
}

