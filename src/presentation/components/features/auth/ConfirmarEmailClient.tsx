'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Phase = 'idle' | 'loading' | 'success' | 'error' | 'missing'

async function postConfirmarEmail(token: string): Promise<'success' | 'error'> {
  const res = await fetch('/api/auth/usuario/confirmar-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (res.status === 204) return 'success'
  return 'error'
}

async function postReenviar(username: string): Promise<boolean> {
  const res = await fetch('/api/auth/usuario/reenviar-confirmacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  return res.status === 204
}

/**
 * Lê `token` da query, confirma e-mail no mount e oferece reenvio em caso de erro.
 */
export function ConfirmarEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [phase, setPhase] = useState<Phase>(() => (token ? 'loading' : 'missing'))
  const [emailReenvio, setEmailReenvio] = useState('')
  const [reenviando, setReenviando] = useState(false)
  const [reenvioOk, setReenvioOk] = useState(false)

  useEffect(() => {
    if (!token) {
      setPhase('missing')
      return
    }

    let cancelado = false

    void (async () => {
      const result = await postConfirmarEmail(token)
      if (cancelado) return
      setPhase(result === 'success' ? 'success' : 'error')
    })()

    return () => {
      cancelado = true
    }
  }, [token])

  const handleReenviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setReenviando(true)
    setReenvioOk(false)
    try {
      const ok = await postReenviar(emailReenvio.trim())
      setReenvioOk(ok)
    } finally {
      setReenviando(false)
    }
  }

  if (phase === 'loading') {
    return (
      <p className="text-center text-primary-text" role="status">
        Confirmando seu e-mail…
      </p>
    )
  }

  if (phase === 'missing') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-error text-sm">Link inválido: falta o token de confirmação.</p>
        <Link href="/login" className="text-[var(--color-alternate)] font-semibold text-sm underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className="space-y-6 text-center">
        <p className="text-primary-text font-medium">E-mail confirmado com sucesso!</p>
        <Link
          href="/login"
          className="inline-flex w-full justify-center py-3 px-4 rounded-lg font-semibold text-white bg-[var(--color-alternate)] hover:opacity-95"
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-error text-sm text-center">
        Link de confirmação inválido ou expirado. Você pode solicitar um novo e-mail abaixo.
      </p>

      <form onSubmit={handleReenviar} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">E-mail cadastrado</label>
        <input
          type="email"
          required
          value={emailReenvio}
          onChange={e => setEmailReenvio(e.target.value)}
          placeholder="seu@email.com"
          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-alternate"
        />
        <button
          type="submit"
          disabled={reenviando}
          className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[var(--color-alternate)] disabled:opacity-50"
        >
          {reenviando ? 'Enviando…' : 'Reenviar e-mail de confirmação'}
        </button>
      </form>

      {reenvioOk ? (
        <p className="text-sm text-center text-gray-700">
          Se o e-mail estiver cadastrado e pendente de confirmação, um novo link foi enviado.
        </p>
      ) : null}

      <div className="text-center">
        <Link href="/login" className="text-sm text-[var(--color-alternate)] underline">
          Voltar ao login
        </Link>
      </div>
    </div>
  )
}
