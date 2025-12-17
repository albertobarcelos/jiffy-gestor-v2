'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Usuario } from '@/src/domain/entities/Usuario'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { usePerfisPDV } from '@/src/presentation/hooks/usePerfisPDV'
import { showToast } from '@/src/shared/utils/toast'
import { MdPerson, MdVisibility, MdVisibilityOff } from 'react-icons/md'

interface NovoUsuarioProps {
  usuarioId?: string
  initialPerfilPdvId?: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

interface PerfilPDV {
  id: string
  role: string
}

/**
 * Componente para criar/editar usuário
 * Replica o design e funcionalidades do Flutter
 */
export function NovoUsuario({
  usuarioId,
  initialPerfilPdvId,
  isEmbedded,
  onSaved,
  onCancel,
}: NovoUsuarioProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!usuarioId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // Controla visibilidade da senha
  const [perfilPdvId, setPerfilPdvId] = useState(initialPerfilPdvId || '')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)
  const hasLoadedUsuarioRef = useRef(false)

  // Carregar lista de perfis PDV usando React Query (com cache)
  const {
    data: perfisPDV = [],
    isLoading: isLoadingPerfis,
  } = usePerfisPDV()

  // Definir perfil inicial quando não estiver em modo de edição
  useEffect(() => {
    if (!isEditing && initialPerfilPdvId && perfisPDV.length > 0 && !perfilPdvId) {
      // Verifica se o perfil inicial existe na lista de perfis
      const perfilExiste = perfisPDV.some((p: any) => p.id === initialPerfilPdvId)
      if (perfilExiste) {
        setPerfilPdvId(initialPerfilPdvId)
      }
    }
  }, [isEditing, initialPerfilPdvId, perfisPDV, perfilPdvId])

  // Garantir que o perfil seja definido quando os perfis e o perfilPdvId estiverem disponíveis
  useEffect(() => {
    if (isEditing && perfisPDV.length > 0 && !perfilPdvId && hasLoadedUsuarioRef.current) {
      // Se o perfil ainda não foi carregado, tenta carregar novamente
      // Isso pode acontecer se os perfis carregarem antes do usuário
      const loadPerfilAgain = async () => {
        const token = auth?.getAccessToken()
        if (!token) return

        try {
          const response = await fetch(`/api/usuarios/${usuarioId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            const perfilId = data.perfilPdvId || ''
            if (perfilId) {
              console.log('Definindo perfil após carregar perfis:', perfilId)
              setPerfilPdvId(perfilId)
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar perfil:', error)
        }
      }

      loadPerfilAgain()
    }
  }, [isEditing, perfisPDV, perfilPdvId, usuarioId, auth])

  // Carregar dados do usuário se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedUsuarioRef.current) return

    const loadUsuario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingUsuario(true)
      hasLoadedUsuarioRef.current = true

      try {
        const response = await fetch(`/api/usuarios/${usuarioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const usuario = Usuario.fromJSON(data)

          setNome(usuario.getNome())
          setTelefone(usuario.getTelefone() || '')
          
          // Carrega o perfilPdvId diretamente dos dados da API (garantido pela rota)
          // Prioriza data.perfilPdvId que vem dos dados brutos da API externa
          const perfilId = data.perfilPdvId || usuario.getPerfilPdvId() || ''
          console.log('Carregando perfil do usuário:', {
            dataPerfilPdvId: data.perfilPdvId,
            usuarioPerfilPdvId: usuario.getPerfilPdvId(),
            perfilIdFinal: perfilId,
            dataCompleto: data,
            perfisDisponiveis: perfisPDV,
            perfilEncontrado: perfisPDV.find((p: any) => p.id === perfilId),
          })
          
          // Só define o perfil se encontrar um ID válido
          if (perfilId) {
            setPerfilPdvId(perfilId)
            console.log('PerfilPdvId definido:', perfilId)
          } else {
            console.warn('PerfilPdvId não encontrado nos dados do usuário')
          }
          
          setAtivo(usuario.isAtivo())
          
          // Carrega a senha do banco (pode vir como 'password' ou 'senha' na resposta)
          const senha = data.password || data.senha || ''
          setPassword(senha)
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
      } finally {
        setIsLoadingUsuario(false)
      }
    }

    loadUsuario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, usuarioId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    if (!isEditing && !password) {
      showToast.error('Senha é obrigatória para novos usuários')
      return
    }

    if (!isEditing && password.length !== 4) {
      showToast.error('A senha deve conter exatamente 4 dígitos')
      return
    }

    // Em modo de edição, valida apenas se uma nova senha foi digitada
    if (isEditing && password && password.length > 0 && password.length !== 4) {
      showToast.error('A senha deve conter exatamente 4 dígitos')
      return
    }

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        telefone,
        ativo,
        perfilPdvId,
      }

      if (!isEditing) {
        body.password = password
      } else {
        // Em modo de edição, sempre envia a senha (mesmo que seja a mesma)
        // Se o usuário não alterou, envia a senha atual
        body.password = password
      }

      const url = isEditing
        ? `/api/usuarios/${usuarioId}`
        : '/api/usuarios'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar usuário')
      }

      showToast.success(
        isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'
      )
      if (isEmbedded) {
        onSaved?.()
      } else {
        router.push('/cadastros/usuarios')
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/usuarios')
    }
  }

  // Função para formatar senha: apenas números, máximo 4 dígitos
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Remove tudo que não é número e limita a 4 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 4)
    setPassword(numericValue)
  }

  if (isLoadingUsuario) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md px-[30px] py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/25 text-primary flex items-center justify-center">
              <span className="text-2xl"><MdPerson /></span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
            </h1>
          </div>
        </div>
      </div>

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[30px]">
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          {/* Dados */}
          <div className="bg-info rounded-[12px] p-5">
            <h2 className="text-primary text-xl font-semibold font-exo mb-4">
              Dados do Usuário
            </h2>
            <div className="h-[2px] bg-primary/70  mb-4"></div>

            <div className="space-y-4">
              <Input
                label="Nome"
                value={nome || ''}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Digite o nome do usuário"
                className="bg-info"
                autoComplete="off"
                inputProps={{
                  'aria-label': 'Nome do usuário',
                  autoComplete: 'off',
                  name: 'usuario-nome',
                }}
              />

              <Input
                label="Telefone"
                value={telefone || ''}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 0 0000-0000"
                className="bg-info"
                autoComplete="off"
                inputProps={{
                  'aria-label': 'Telefone do usuário',
                  autoComplete: 'off',
                  name: 'usuario-telefone',
                }}
              />

              <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-[300px] gap-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil PDV *
                </label>
                {isLoadingPerfis ? (
                  <div className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <select
                    value={perfilPdvId || ''}
                    onChange={(e) => {
                      console.log('Perfil alterado:', e.target.value)
                      setPerfilPdvId(e.target.value)
                    }}
                    required
                    className="w-full h-13 px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 hover:border-primary-text focus:outline-none focus:border-2 focus:border-primary-text"
                  >
                    {!isEditing && <option value="">Selecione um perfil...</option>}
                    {(Array.isArray(perfisPDV) ? perfisPDV : []).map((perfil: any) => {
                      const isSelected = perfil.id === perfilPdvId
                      if (isSelected) {
                        console.log('Perfil selecionado encontrado:', perfil.role, perfil.id)
                      }
                      return (
                        <option key={perfil.id} value={perfil.id}>
                          {perfil.role}
                        </option>
                      )
                    })}
                  </select>
                )}
              

              {!isEditing && (
                <Input
                  label="Senha"
                  type="password"
                  value={password || ''}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Digite a senha com 4 dígitos"
                  className="bg-info"
                  autoComplete="new-password"
                  inputProps={{
                    'aria-label': 'Senha do usuário',
                    autoComplete: 'new-password',
                    name: 'usuario-senha-nova',
                    maxLength: 4,
                    pattern: '[0-9]{4}',
                    inputMode: 'numeric',
                    
                  }}
                />
              )}

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      label=""
                      type={showPassword ? 'text' : 'password'}
                      value={password || ''}
                      onChange={handlePasswordChange}
                      placeholder="Digite a nova senha com 4 dígitos"
                      className="bg-info pr-10"
                      autoComplete="new-password"
                      inputProps={{
                        'aria-label': 'Senha do usuário',
                        autoComplete: 'new-password',
                        name: 'usuario-senha-editar',
                        maxLength: 4,
                        pattern: '[0-9]{4}',
                        inputMode: 'numeric',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors z-10"
                      title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        <MdVisibilityOff className="w-5 h-5" />
                      ) : (
                        <MdVisibility className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-secondary-text mt-1">
                    Clique no ícone do olho para visualizar a senha
                  </p>
                </div>
              )}
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-between p-4 rounded-lg gap-2">
                <span className="text-primary-text font-medium">Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[16px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="h-8 px-[26px] rounded-lg border-primary/15 text-primary hover:bg-primary/20"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome || (!isEditing && !password)}
            className="h-8 px-[26px] rounded-lg border-primary/15 text-primary hover:bg-primary/90"
            sx={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-info)',
              borderColor: 'var(--color-primary)',
            }}
            >
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

