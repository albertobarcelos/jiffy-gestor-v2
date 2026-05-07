'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export function EsqueciSenhaForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/usuario/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim() }),
      })
      if (!res.ok && res.status !== 204) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Não foi possível enviar.')
      }
      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-primary-text text-sm">
          Se o e-mail existir em nossa base, enviaremos as instruções para redefinição.
        </p>
        <Link href="/login" className="inline-block font-semibold text-[var(--color-alternate)] underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-700">
        Informe o e-mail da sua conta. Enviaremos um link para definir uma nova senha.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-alternate"
        />
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[var(--color-alternate)] disabled:opacity-50"
      >
        {loading ? 'Enviando…' : 'Enviar instruções'}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-[var(--color-alternate)] underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
