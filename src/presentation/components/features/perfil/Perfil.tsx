'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdAccountCircle, MdPerson, MdLock, MdDriveFileRenameOutline, MdEdit, MdEmail } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'
import { showToast } from '@/src/shared/utils/toast'
import { GestorPasswordField } from '@/src/presentation/components/features/auth/components/GestorPasswordField'
import { PasswordFieldPressReveal } from '@/src/presentation/components/features/auth/components/PasswordFieldPressReveal'

/**
 * Perfil da conta (hub): dados do utilizador persistidos após o login
 * (`usuario` no JWT de identidade ou sessão de tenant).
 */
export function Perfil() {
  const router = useRouter()
  const identityAuth = useAuthStore(s => s.identityAuth)
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const sessionUser = useAuthStore(s => s.getUser())

  const [isHydrated, setIsHydrated] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  const tokenPerfil = useMemo(() => {
    if (identityAuth && !identityAuth.isExpired()) {
      return identityAuth.getAccessToken()
    }
    if (tenantAuth && !tenantAuth.isExpired()) {
      return tenantAuth.getAccessToken()
    }
    return null
  }, [identityAuth, tenantAuth])

  const handleVoltar = useCallback(() => {
    router.back()
  }, [router])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!sessionUser) return
    const user =
      identityAuth && !identityAuth.isExpired() ? identityAuth.getUser() : sessionUser
    setNovoNome(user.getName()?.trim() ?? '')
  }, [sessionUser, identityAuth])

  useEffect(() => {
    if (!isHydrated || !isRehydrated) return
    if (!isAuthenticated || !sessionUser) {
      router.push('/login')
    }
  }, [isHydrated, isRehydrated, isAuthenticated, sessionUser, router])

  if (!isHydrated || !isRehydrated || !sessionUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-gray-50 p-6">
        <JiffyLoading />
      </div>
    )
  }

  const identityUser = identityAuth && !identityAuth.isExpired() ? identityAuth.getUser() : null
  const nomeFonte = identityUser ?? sessionUser
  const nome = nomeFonte.getName()?.trim() || nomeFonte.getEmail() || 'Usuário'
  const email = nomeFonte.getEmail()

  const handleAlterarNome = async (e: FormEvent) => {
    e.preventDefault()
    if (!tokenPerfil) {
      showToast.error('Sessão expirada ou indisponível. Entre novamente para alterar o nome.')
      return
    }
    const trimmed = novoNome.trim()
    if (!trimmed) {
      showToast.warning('Indique um nome.')
      return
    }
    if (trimmed.length > 200) {
      showToast.warning('O nome é demasiado longo.')
      return
    }

    setSalvandoNome(true)
    try {
      const res = await fetch('/api/auth/usuario/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPerfil}`,
        },
        body: JSON.stringify({ nome: trimmed }),
      })

      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { nome?: string | null }
        const nomeGuardado =
          typeof data.nome === 'string' && data.nome.trim().length > 0 ? data.nome.trim() : trimmed
        useAuthStore.getState().updateSessionUserDisplayName(nomeGuardado)
        setNovoNome(nomeGuardado)
        showToast.success('Nome atualizado com sucesso.')
        return
      }

      const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      const msg = errBody.message || errBody.error || 'Não foi possível atualizar o nome.'
      showToast.error(msg)
    } catch {
      showToast.error('Não foi possível atualizar o nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  const handleAlterarSenha = async (e: FormEvent) => {
    e.preventDefault()
    if (!tokenPerfil) {
      showToast.error('Sessão expirada ou indisponível. Entre novamente para alterar a senha.')
      return
    }
    if (!senhaGestorEhValida(novaSenha)) {
      showToast.warning(SENHA_GESTOR_MENSAGEM_ERRO)
      return
    }
    if (novaSenha !== confirmarSenha) {
      showToast.error('As senhas não conferem.')
      return
    }

    setSalvandoSenha(true)
    try {
      const res = await fetch('/api/auth/usuario/me/senha', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPerfil}`,
        },
        body: JSON.stringify({ password: novaSenha }),
      })

      if (res.status === 204) {
        setNovaSenha('')
        setConfirmarSenha('')
        showToast.success('Senha atualizada com sucesso.')
        return
      }

      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      const msg = data.message || data.error || 'Não foi possível atualizar a senha.'
      showToast.error(msg)
    } catch {
      showToast.error('Não foi possível atualizar a senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <div className="w-full bg-gray-50 font-sans px-2 pb-10 pt-4 md:px-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        
        <div className="mb-4 mt-6">
          <h1 className="text-2xl font-semibold text-gray-900">Detalhes Pessoais</h1>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div
            className="text-white md:px-6 px-4 py-8 font-sans"
            style={{
              background: 'linear-gradient(to right, var(--color-secondary), var(--color-alternate), var(--color-secondary))',
            }}
          >
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight">
                <MdAccountCircle className="shrink-0 text-white" size={24} aria-hidden />
                <span className="truncate">{nome}</span>
              </h2>
              <p className="flex min-w-0 items-center gap-2 text-sm text-white/90">
                <MdEmail className="shrink-0 text-white" size={20} aria-hidden />
                <span className="truncate">{email}</span>
              </p>
            </div>
          </div>

          <div className="md:p-6 p-4">
            <section>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <MdPerson className="text-[var(--color-secondary)]" size={22} aria-hidden />
                Configurações da conta
              </h3>
              <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="bg-gray-50 rounded-lg p-4 border border-alternate">
                  <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
                    <MdEdit className="text-[var(--color-secondary)]" size={20} aria-hidden />
                    Nome de Usuário
                  </h4>
                  {!tokenPerfil ? (
                    <p className="rounded-lg px-4 py-3 text-sm text-secondary">
                      Não há token de sessão válido para alterar o nome neste momento. Faça login novamente em{' '}
                      <strong>Meus Aplicativos</strong> ou na empresa.
                    </p>
                  ) : (
                    <form onSubmit={handleAlterarNome} className="space-y-4">
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
                          onChange={ev => setNovoNome(ev.target.value)}
                          disabled={salvandoNome}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] disabled:bg-gray-50"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={salvandoNome}
                          className="rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {salvandoNome ? 'Salvando…' : 'Salvar nome'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-alternate">
                  <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
                    <MdLock className="text-[var(--color-secondary)]" size={20} aria-hidden />
                    Alterar senha
                  </h4>
                  {!tokenPerfil ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Não há token de sessão válido para alterar a senha neste momento. Faça login novamente em{' '}
                      <strong>Meus Aplicativos</strong> ou na empresa.
                    </p>
                  ) : (
                    <form onSubmit={handleAlterarSenha} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <GestorPasswordField
                          label="Nova senha"
                          forcaBarIdPrefix="perfil-senha"
                          required
                          value={novaSenha}
                          onChange={ev => setNovaSenha(ev.target.value)}
                          autoComplete="new-password"
                          disabled={salvandoSenha}
                        />
                        <PasswordFieldPressReveal
                          label="Confirmar nova senha"
                          leadingLockIcon
                          required
                          value={confirmarSenha}
                          onChange={ev => setConfirmarSenha(ev.target.value)}
                          autoComplete="new-password"
                          disabled={salvandoSenha}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={salvandoSenha}
                          className="rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
