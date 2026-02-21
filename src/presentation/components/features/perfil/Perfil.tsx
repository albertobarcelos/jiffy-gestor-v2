'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdPerson, MdLock, MdEdit, MdSave, MdClose, MdBusiness } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserMeData {
  sub?: string
  empresaId?: string
  aud?: string
  userId?: string
  generatedFor?: string
  iat?: number
  exp?: number
}

interface UsuarioGestorData {
  id: string
  username: string
  nome: string
  ativo: boolean
  empresaId: string
  perfilGestor?: {
    id: string
    role: string
    acessoFinanceiro: boolean
    acessoEstoque: boolean
    acessoFiscal: boolean
    acessoDashboard: boolean
  }
}

interface EmpresaData {
  id: string
  nome?: string
  razaoSocial?: string
  nomeFantasia?: string
}

/**
 * Componente de Perfil do Usuário
 * Exibe informações do usuário logado e permite edição
 */
export function Perfil() {
  const { getUser, isAuthenticated, auth } = useAuthStore()
  const router = useRouter()
  const user = getUser()
  const [isHydrated, setIsHydrated] = useState(false)
  const [userMeData, setUserMeData] = useState<UserMeData | null>(null)
  const [usuarioGestorData, setUsuarioGestorData] = useState<UsuarioGestorData | null>(null)
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para edição
  const [isEditingNome, setIsEditingNome] = useState(false)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [editedNome, setEditedNome] = useState('')
  const [editedEmail, setEditedEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Estados para restrições
  const [acessoFinanceiro, setAcessoFinanceiro] = useState(false)
  const [acessoEstoque, setAcessoEstoque] = useState(false)
  const [acessoFiscal, setAcessoFiscal] = useState(false)
  const [acessoDashboard, setAcessoDashboard] = useState(false)

  // Estados para operações
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Estados para modal de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<'email' | 'password' | null>(null)

  // Marcar como hidratado apenas no cliente (evita hydration mismatch)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || !user)) {
      router.push('/login')
    }
  }, [isAuthenticated, user, router, isHydrated])

  // Buscar dados completos do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isHydrated || !isAuthenticated || !auth) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const token = auth.getAccessToken()
        if (!token) {
          throw new Error('Token de acesso não disponível')
        }

        // 1. Buscar dados do /api/auth/me para obter o userId
        const meResponse = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!meResponse.ok) {
          throw new Error('Erro ao buscar dados do usuário autenticado')
        }

        const meData = await meResponse.json()
        setUserMeData(meData)

        // O endpoint /api/v1/pessoas/usuarios-gestor/{id} espera o 'sub' do token
        // O 'sub' é o ID do usuário gestor no sistema
        // Usar 'sub' primeiro, com fallback para 'userId' caso necessário
        const userId = meData.sub || meData.userId
        
        if (!userId) {
          throw new Error('ID do usuário não encontrado no token (sub ou userId)')
        }

        // 2. Buscar dados completos do usuário gestor usando o 'sub' como ID
        const gestorResponse = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        let empresaIdToFetch = meData.empresaId

        if (!gestorResponse.ok) {
          const errorData = await gestorResponse.json().catch(() => ({}))
          
          // Se for 404, pode ser que o userId não seja o ID do usuário gestor
          // Nesse caso, vamos usar os dados do /auth/me e do store
          if (gestorResponse.status === 404) {
            setError('Usuário gestor não encontrado. Exibindo informações básicas.')
            // Continua com os dados disponíveis
          } else {
            throw new Error(errorData.error || `Erro ao buscar dados do usuário gestor: ${gestorResponse.status}`)
          }
        } else {
          const gestorData = await gestorResponse.json()
          setUsuarioGestorData(gestorData)
          setEditedNome(gestorData.nome || '')
          setEditedEmail(gestorData.username || '')

          // Atualizar empresaId se disponível no gestorData
          if (gestorData.empresaId) {
            empresaIdToFetch = gestorData.empresaId
          }

          // Atualizar estados das restrições
          if (gestorData.perfilGestor) {
            setAcessoFinanceiro(gestorData.perfilGestor.acessoFinanceiro || false)
            setAcessoEstoque(gestorData.perfilGestor.acessoEstoque || false)
            setAcessoFiscal(gestorData.perfilGestor.acessoFiscal || false)
            setAcessoDashboard(gestorData.perfilGestor.acessoDashboard || false)
          }
        }

        // 3. Buscar dados da empresa
        const empresaId = empresaIdToFetch
        if (empresaId) {
          const empresaResponse = await fetch(`/api/empresas/${empresaId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (empresaResponse.ok) {
            const empresaData = await empresaResponse.json()
            setEmpresaData(empresaData)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do usuário')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [isHydrated, isAuthenticated, auth])

  // Mostrar loading enquanto hidrata ou carrega dados
  if (!isHydrated || !user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/images/jiffy-loading.gif" 
            alt="Carregando..." 
            className="w-20 h-20 mx-auto mb-4" 
          />
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  const userName = usuarioGestorData?.nome || user.getName() || 'Usuário'
  const userEmail = usuarioGestorData?.username || user.getEmail()
  const userInitial = userName.charAt(0).toUpperCase()
  const userRole = usuarioGestorData?.perfilGestor?.role || 'Não definido'
  const empresaNome = empresaData?.nomeFantasia || empresaData?.razaoSocial || empresaData?.nome || 'Não informado'

  // Se houver erro mas não for crítico, mostra aviso mas permite visualização
  const hasNonCriticalError = error && error.includes('Usuário gestor não encontrado')

  const handleSaveNome = async () => {
    if (!usuarioGestorData || !auth) return

    try {
      setIsSaving(true)
      setSaveMessage(null)

      const token = auth.getAccessToken()
      const userId = userMeData?.sub || userMeData?.userId

      if (!userId) {
        throw new Error('ID do usuário não encontrado')
      }

      const response = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: editedNome,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar nome')
      }

      const updatedData = await response.json()
      setUsuarioGestorData(updatedData)
      setSaveMessage({ type: 'success', text: 'Nome atualizado com sucesso!' })
      setIsEditingNome(false)

      // Limpar mensagem após 3 segundos
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Erro ao salvar nome' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEmail = () => {
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editedEmail)) {
      setSaveMessage({ type: 'error', text: 'Email inválido' })
      return
    }

    // Mostrar modal de confirmação
    setPendingAction('email')
    setShowConfirmModal(true)
  }

  const confirmSaveEmail = async () => {
    if (!usuarioGestorData || !auth) return

    setShowConfirmModal(false)
    setPendingAction(null)

    try {
      setIsSaving(true)
      setSaveMessage(null)

      const token = auth.getAccessToken()
      const userId = userMeData?.sub || userMeData?.userId

      if (!userId) {
        throw new Error('ID do usuário não encontrado')
      }

      const response = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editedEmail,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar email')
      }

      const updatedData = await response.json()
      setUsuarioGestorData(updatedData)
      setSaveMessage({ type: 'success', text: 'Email atualizado com sucesso!' })
      setIsEditingEmail(false)

      // Limpar mensagem após 3 segundos
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Erro ao salvar email' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      setSaveMessage({ type: 'error', text: 'As senhas não coincidem' })
      return
    }
    if (newPassword.length < 6) {
      setSaveMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' })
      return
    }

    // Mostrar modal de confirmação
    setPendingAction('password')
    setShowConfirmModal(true)
  }

  const confirmChangePassword = async () => {
    if (!usuarioGestorData || !auth) return

    setShowConfirmModal(false)
    setPendingAction(null)

    try {
      setIsSaving(true)
      setSaveMessage(null)

      const token = auth.getAccessToken()
      const userId = userMeData?.sub || userMeData?.userId

      if (!userId) {
        throw new Error('ID do usuário não encontrado')
      }

      const response = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao alterar senha')
      }

      setSaveMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
      setIsChangingPassword(false)
      setNewPassword('')
      setConfirmPassword('')

      // Limpar mensagem após 3 segundos
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Erro ao alterar senha' 
      })
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 md:px-6 px-2 pt-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header com gradiente */}
          <div 
            className="text-white md:px-6 px-2 py-3"
            style={{
              background: 'linear-gradient(to right, rgb(0, 51, 102), rgba(0, 51, 102, 0.8))'
            }}
          >
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                <span className="text-2xl font-bold text-white">
                  {userInitial}
                </span>
              </div>
              {/* Informações do usuário */}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {userName}
                </h2>
                <p className="text-sm text-white/90 mt-1">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Conteúdo do card */}
          <div className="md:p-6">
            {/* Mensagem de aviso se houver erro não crítico */}
            {hasNonCriticalError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ {error} Algumas informações podem estar incompletas.
                </p>
              </div>
            )}

            {/* Mensagem de sucesso/erro */}
            {saveMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                saveMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm">
                  {saveMessage.type === 'success' ? '✅' : '❌'} {saveMessage.text}
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              {/* Informações Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <MdPerson className="text-primary" size={20} />
                  Informações Pessoais
                </h3>
                <div className="bg-gray-50 rounded-lg px-4 py-2 flex flex-col gap-2">
                  {/* Campo Nome */}
                  <div className="flex items-center justify-between">
                    {isEditingNome ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editedNome}
                          onChange={(e) => setEditedNome(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveNome}
                          disabled={isSaving}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Salvar nome"
                        >
                          <MdSave size={20} />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingNome(false)
                            setEditedNome(usuarioGestorData?.nome || '')
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Cancelar edição"
                        >
                          <MdClose size={20} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Nome</p>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {editedNome || userName}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsEditingNome(true)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          aria-label="Editar nome"
                        >
                          <MdEdit size={20} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Separador */}
                  <div className="border-t border-gray-200 pt-4">
                    {isEditingEmail ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={editedEmail}
                          onChange={(e) => setEditedEmail(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEmail}
                          disabled={isSaving}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Salvar email"
                        >
                          <MdSave size={20} />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingEmail(false)
                            setEditedEmail(usuarioGestorData?.username || '')
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Cancelar edição"
                        >
                          <MdClose size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {editedEmail || userEmail}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsEditingEmail(true)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          aria-label="Editar email"
                        >
                          <MdEdit size={20} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Separador - Perfil do Usuário */}
                  <div className="border-t border-gray-200 pt-4">
                    <div>
                      <p className="text-sm text-gray-600">Perfil do Usuário</p>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {userRole}
                      </p>
                    </div>
                  </div>

                  {/* Separador - Empresa */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MdBusiness className="text-gray-600" size={20} />
                        <div>
                          <p className="text-sm text-gray-600">Empresa</p>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {empresaNome}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/configuracoes')}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        aria-label="Editar empresa"
                        title="Editar empresa"
                      >
                        <MdEdit size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Restrições do Perfil */}
              {usuarioGestorData?.perfilGestor && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MdLock className="text-primary" size={20} />
                    Restrições do Perfil
                  </h3>
                  <div className="bg-gray-50 rounded-lg px-4">
                    <p className="text-sm text-gray-600 mb-2">
                      As restrições do perfil são gerenciadas na seção de gerenciamento de perfis.
                    </p>
                    <div className="flex flex-col gap-2">
                      {/* Acesso Financeiro */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Acesso Financeiro</p>
                          <p className="text-xs text-gray-500 mt-1">Permite acesso ao módulo financeiro</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          acessoFinanceiro 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {acessoFinanceiro ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {/* Acesso Estoque */}
                      <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Acesso Estoque</p>
                          <p className="text-xs text-gray-500 mt-1">Permite acesso ao módulo de estoque</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          acessoEstoque 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {acessoEstoque ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {/* Acesso Fiscal */}
                      <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Acesso Fiscal</p>
                          <p className="text-xs text-gray-500 mt-1">Permite acesso ao módulo fiscal</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          acessoFiscal 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {acessoFiscal ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {/* Acesso Dashboard */}
                      <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Acesso Dashboard</p>
                          <p className="text-xs text-gray-500 mt-1">Permite acesso ao dashboard</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          acessoDashboard 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {acessoDashboard ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Segurança */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MdLock className="text-primary" size={20} />
                  Segurança
                </h3>
                <div className="bg-gray-50 rounded-lg px-4">
                  {isChangingPassword ? (
                    <div className="flex flex-col max-w-xs gap-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Nova Senha</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Digite a nova senha"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Confirmar Senha</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Confirme a nova senha"
                        />
                      </div>
                      <div className="flex gap-2 mb-6 mt-2">
                        <button
                          onClick={handleChangePassword}
                          disabled={isSaving}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <img 
                                src="/images/jiffy-loading.gif" 
                                alt="Salvando..." 
                                className="w-4 h-4" 
                              />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Senha'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsChangingPassword(false)
                            setNewPassword('')
                            setConfirmPassword('')
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center mb-6 mt-2">
                      <button
                        onClick={() => setIsChangingPassword(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Alterar Senha
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Confirmar Alteração
              </h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Atenção:</strong> Ao alterar {pendingAction === 'email' ? 'o email' : 'a senha'}, você estará modificando suas credenciais de acesso ao sistema.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-700">
                {pendingAction === 'email' 
                  ? 'Você precisará usar o novo email para fazer login nas próximas vezes que acessar o sistema.'
                  : 'Você precisará usar a nova senha para fazer login nas próximas vezes que acessar o sistema.'}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  // Cancelar edição e restaurar valores originais
                  if (pendingAction === 'email') {
                    setIsEditingEmail(false)
                    setEditedEmail(usuarioGestorData?.username || '')
                  } else if (pendingAction === 'password') {
                    setIsChangingPassword(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }
                  setPendingAction(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pendingAction === 'email') {
                    confirmSaveEmail()
                  } else if (pendingAction === 'password') {
                    confirmChangePassword()
                  }
                }}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : 'Confirmar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
