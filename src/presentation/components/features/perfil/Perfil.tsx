'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdPerson, MdBusiness, MdLock, MdDriveFileRenameOutline } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'
import { showToast } from '@/src/shared/utils/toast'
import { GestorPasswordField } from '@/src/presentation/components/features/auth/components/GestorPasswordField'
import { PasswordFieldPressReveal } from '@/src/presentation/components/features/auth/components/PasswordFieldPressReveal'

function formatarCnpjExibicao(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/**
 * Perfil da conta (hub): apenas dados persistidos após o login
 * (`usuario` no JWT de identidade + lista `empresas` em `hubEmpresas`).
 * Não depende de sessão de empresa nem de chamadas extra a `/api/auth/me` ou PDV.
 */
export function Perfil() {
  const router = useRouter()
  const identityAuth = useAuthStore(s => s.identityAuth)
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const sessionUser = useAuthStore(s => s.getUser())

  const [isHydrated, setIsHydrated] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  /** Formulário de senha fica oculto até o utilizador clicar em «Clique Aqui». */
  const [formularioSenhaAberto, setFormularioSenhaAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [formularioNomeAberto, setFormularioNomeAberto] = useState(false)

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
    if (!tokenPerfil) {
      setFormularioSenhaAberto(false)
      setFormularioNomeAberto(false)
    }
  }, [tokenPerfil])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

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
  const empresas: LoginEmpresaSnapshot[] = hubEmpresas ?? []
  const semDadosHub = !identityUser && (!hubEmpresas || hubEmpresas.length === 0)

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
        setNovoNome('')
        setFormularioNomeAberto(false)
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
        setFormularioSenhaAberto(false)
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
    <div className="min-h-screen bg-gray-50 font-sans md:px-6 px-2 pt-4 pb-10">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <div className="mb-3">
          <button
            type="button"
            onClick={handleVoltar}
            className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-secondary px-5 font-exo text-sm font-semibold text-info transition-colors hover:bg-alternate"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar
          </button>
        </div>
        <div className="mb-2">
          <h1 className="text-3xl font-semibold text-gray-900">Meu perfil</h1>
          <p className="mt-1 text-gray-600">
            Dados da sua conta. A lista de empresas reflete o seu último login em Meus Aplicativos.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div
            className="text-white md:px-6 px-4 py-5 font-sans"
            style={{
              background: 'linear-gradient(to right, var(--color-secondary), var(--color-alternate))',
            }}
          >
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">{nome}</h2>
              <p className="mt-1 truncate text-sm text-white/90">{email}</p>
            </div>
          </div>

          <div className="md:p-6 p-4">
            <div className="flex flex-col gap-8">
              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MdPerson className="text-[var(--color-secondary)]" size={22} aria-hidden />
                  Informações da sua conta
                </h3>
                <div className="rounded-lg bg-gray-50 px-4 py-1 text-sm text-gray-700">
                  <p>
                    Veja o que você pode alterar na sua conta.
                  </p>
                  {semDadosHub ? (
                    <p className="mt-2 text-amber-800">
                      Não há neste momento sessão de hub guardada ou lista de empresas do login. Abra{' '}
                      <strong>Meus Aplicativos</strong> para voltar a carregar as empresas, ou use os dados acima
                      da sessão atual.
                    </p>
                  ) : null}
                </div>
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MdDriveFileRenameOutline className="text-[var(--color-secondary)]" size={22} aria-hidden />
                  Nome de Usuário
                </h3>
                {!tokenPerfil ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Não há token de sessão válido para alterar o nome neste momento. Faça login novamente em{' '}
                    <strong>Meus Aplicativos</strong> ou na empresa.
                  </p>
                ) : (
                  <div className="max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4">
                    {!formularioNomeAberto ? (
                      <p className="text-sm text-gray-600">
                        Para trocar seu nome de usuário{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setNovoNome(nomeFonte.getName()?.trim() ?? '')
                            setFormularioNomeAberto(true)
                          }}
                          className="font-normal text-[var(--color-secondary)] underline underline-offset-2 hover:opacity-90"
                        >
                          Clique Aqui
                        </button>
                        .
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
                        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            disabled={salvandoNome}
                            onClick={() => {
                              setFormularioNomeAberto(false)
                              setNovoNome('')
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
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
                )}
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MdLock className="text-[var(--color-secondary)]" size={22} aria-hidden />
                  Alterar senha
                </h3>
                {!tokenPerfil ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Não há token de sessão válido para alterar a senha neste momento. Faça login novamente em{' '}
                    <strong>Meus Aplicativos</strong> ou na empresa.
                  </p>
                ) : (
                  <div className="max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4">
                    {!formularioSenhaAberto ? (
                      <p className="text-sm text-gray-600">
                        Para definir uma nova senha,{' '}
                        <button
                          type="button"
                          onClick={() => setFormularioSenhaAberto(true)}
                          className="font-normal text-[var(--color-secondary)] underline underline-offset-2 hover:opacity-90"
                        >
                          Clique Aqui
                        </button>.
                      </p>
                    ) : (
                      <form onSubmit={handleAlterarSenha} className="space-y-4">
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
                        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            disabled={salvandoSenha}
                            onClick={() => {
                              setFormularioSenhaAberto(false)
                              setNovaSenha('')
                              setConfirmarSenha('')
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
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
                )}
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MdBusiness className="text-[var(--color-secondary)]" size={22} aria-hidden />
                  Empresas disponíveis
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {empresas.length}
                  </span>
                </h3>
                {empresas.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                    Nenhuma empresa listada neste login. Se esperava ver empresas, faça logout e entre
                    novamente.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                    {empresas.map(emp => (
                      <li
                        key={emp.id}
                        className="flex flex-col gap-1 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{emp.nomeFantasia}</p>
                          <p className="text-sm text-gray-600 tabular-nums">{formatarCnpjExibicao(emp.cnpj)}</p>
                        </div>
                        <div className="shrink-0">
                          {emp.bloqueado ? (
                            <span className="inline-flex px-2.5 py-0.5 text-sm font-medium text-red-800">
                              Bloqueada
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 text-sm font-medium text-success">
                              Ativa
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
