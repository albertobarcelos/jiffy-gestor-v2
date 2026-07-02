'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { PerfilIdentityCard } from './components/PerfilIdentityCard'
import { PerfilDadosPessoaisTab } from './components/PerfilDadosPessoaisTab'
import { PerfilConfiguracoesTab } from './components/PerfilConfiguracoesTab'
import type { PerfilDadosExibicao, PerfilTabId } from './types/perfilTypes'
import { PERFIL_CONTENT_WIDTH_CLASS, PERFIL_TABS } from './types/perfilTypes'

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
  const [activeTab, setActiveTab] = useState<PerfilTabId>('personal')
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
  /** Campos futuros: null até o backend expor GET/PATCH de perfil completo. */
  const dadosExibicao: PerfilDadosExibicao = {
    nomeCompleto: nome,
    apelido: null,
    email,
    dataNascimento: null,
    telefone: null,
    departamento: null,
    localizacao: null,
  }

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
      showToast.error('Sessão expirada ou indisponível, entre novamente.')
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
    <div className="w-full bg-gray-50 px-2 pb-6 pt-4 font-sans md:px-6">
      <div className={cn('min-w-0', PERFIL_CONTENT_WIDTH_CLASS)}>
        <header className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Meu perfil</h1>
          <p className="mt-1 text-sm text-secondary-text">
            Dados da sua conta na plataforma Jiffy.
          </p>
        </header>

        <PerfilIdentityCard nome={nome} email={email} localizacao={dadosExibicao.localizacao} />

        <div
          role="tablist"
          aria-label="Seções do perfil"
          className="mt-6 flex gap-1 border-b border-gray-200"
        >
          {PERFIL_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative -mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[var(--color-secondary)] text-gray-900'
                  : 'border-transparent text-secondary-text hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6" role="tabpanel">
          {activeTab === 'personal' ? (
            <PerfilDadosPessoaisTab dados={dadosExibicao} />
          ) : (
            <PerfilConfiguracoesTab
              tokenDisponivel={Boolean(tokenPerfil)}
              novoNome={novoNome}
              onNovoNomeChange={setNovoNome}
              salvandoNome={salvandoNome}
              onAlterarNome={handleAlterarNome}
              novaSenha={novaSenha}
              onNovaSenhaChange={setNovaSenha}
              confirmarSenha={confirmarSenha}
              onConfirmarSenhaChange={setConfirmarSenha}
              salvandoSenha={salvandoSenha}
              onAlterarSenha={handleAlterarSenha}
            />
          )}
        </div>
      </div>
    </div>
  )
}
