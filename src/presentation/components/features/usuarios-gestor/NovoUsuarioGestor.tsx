'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { UsuarioGestor } from '@/src/domain/entities/UsuarioGestor'
import { PerfilGestor as PerfilGestorEntity } from '@/src/domain/entities/PerfilGestor'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { showToast } from '@/src/shared/utils/toast'
import { MdPerson, MdVisibility, MdVisibilityOff } from 'react-icons/md'

interface NovoUsuarioGestorProps {
  usuarioId?: string
  initialPerfilGestorId?: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

interface PerfilGestor {
  id: string
  role: string
}

const MODULOS_ACESSO = ['FISCAL', 'FINANCEIRO', 'ESTOQUE', 'DASHBOARD'] as const

/**
 * Componente para criar/editar usuário gestor
 * Replica o design e funcionalidades do Flutter
 */
export function NovoUsuarioGestor({
  usuarioId,
  initialPerfilGestorId,
  isEmbedded,
  onSaved,
  onCancel,
}: NovoUsuarioGestorProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!usuarioId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [perfilGestorId, setPerfilGestorId] = useState(initialPerfilGestorId || '')
  const [ativo, setAtivo] = useState(true)
  const [modulosAcesso, setModulosAcesso] = useState<string[]>([])
  const [perfilGestorCompleto, setPerfilGestorCompleto] = useState<PerfilGestorEntity | null>(null)
  const [perfilGestorSelecionado, setPerfilGestorSelecionado] = useState<PerfilGestor | null>(null)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)
  const hasLoadedUsuarioRef = useRef(false)

  // Estados para perfis gestor
  const [perfisGestor, setPerfisGestor] = useState<PerfilGestor[]>([])
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false)

  // Carregar todos os perfis gestor fazendo requisições sequenciais
  const loadPerfisGestor = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }

    setIsLoadingPerfis(true)
    try {
      const allPerfis: PerfilGestor[] = []
      let currentOffset = 0
      let hasMore = true
      let maxIterations = 100 // Proteção contra loop infinito
      let iterations = 0

      while (hasMore && iterations < maxIterations) {
        iterations++
        const params = new URLSearchParams({
          limit: '10',
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/pessoas/perfis-gestor?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()

        // A API pode retornar { items: [...] } ou diretamente um array
        const items = Array.isArray(data) ? data : (data.items || [])
        
        if (items.length === 0) {
          hasMore = false
          break
        }

        const newPerfis = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            role: item.role?.toString() || '',
          }))
          .filter((perfil: PerfilGestor) => perfil.id && perfil.role)

        allPerfis.push(...newPerfis)
        
        // Usa hasNext da API se disponível, senão verifica se retornou 10 itens
        hasMore = data.hasNext !== undefined ? data.hasNext : newPerfis.length === 10
        currentOffset += newPerfis.length
      }

      setPerfisGestor(allPerfis)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar perfis gestor'
      showToast.error(errorMessage)
      setPerfisGestor([])
    } finally {
      setIsLoadingPerfis(false)
    }
  }, [auth])

  // Carregar perfis gestor quando o componente montar
  useEffect(() => {
    loadPerfisGestor()
  }, [loadPerfisGestor])

  // Carregar dados completos do perfil gestor quando selecionado
  const loadPerfilGestorCompleto = useCallback(async (perfilId: string) => {
    const token = auth?.getAccessToken()
    if (!token || !perfilId) {
      setPerfilGestorCompleto(null)
      return
    }

    try {
      const response = await fetch(`/api/pessoas/perfis-gestor/${perfilId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const perfil = PerfilGestorEntity.fromJSON(data)
        setPerfilGestorCompleto(perfil)
      } else {
        setPerfilGestorCompleto(null)
      }
    } catch (error) {
      setPerfilGestorCompleto(null)
    }
  }, [auth])

  // Carregar perfil completo quando perfilGestorId mudar
  useEffect(() => {
    if (perfilGestorId) {
      loadPerfilGestorCompleto(perfilGestorId)
    } else {
      setPerfilGestorCompleto(null)
    }
  }, [perfilGestorId, loadPerfilGestorCompleto])

  // Definir perfil inicial quando não estiver em modo de edição
  useEffect(() => {
    if (!isEditing && initialPerfilGestorId && perfisGestor.length > 0 && !perfilGestorId) {
      const perfilExiste = perfisGestor.some((p: any) => p.id === initialPerfilGestorId)
      if (perfilExiste) {
        setPerfilGestorId(initialPerfilGestorId)
      }
    }
  }, [isEditing, initialPerfilGestorId, perfisGestor, perfilGestorId])

  // Carregar dados do usuário se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedUsuarioRef.current) return

    const loadUsuario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingUsuario(true)
      hasLoadedUsuarioRef.current = true

      try {
        const response = await fetch(`/api/pessoas/usuarios-gestor/${usuarioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const usuario = UsuarioGestor.fromJSON(data)

          setNome(usuario.getNome())
          setUsername(usuario.getUsername())
          setAtivo(usuario.isAtivo())
          
          const perfilId = usuario.getPerfilGestorId() || ''
          if (perfilId) {
            setPerfilGestorId(perfilId)
            // O perfil completo será carregado pelo useEffect quando perfilGestorId mudar
          }
          
          // Não precisamos mais de modulosAcesso, pois vem do perfil gestor
          // setModulosAcesso(usuario.getModulosAcesso() || [])
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar usuário gestor'
        showToast.error(errorMessage)
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

    if (!nome || !username) {
      showToast.error('Nome e e-mail são obrigatórios')
      return
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(username)) {
      showToast.error('Por favor, insira um e-mail válido')
      return
    }

    if (!isEditing && !password) {
      showToast.error('Senha é obrigatória para novos usuários')
      return
    }

    if (!perfilGestorId) {
      showToast.error('Perfil gestor é obrigatório')
      return
    }

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        username,
        ativo,
        perfilGestorId,
      }

      // Módulos de acesso só são enviados na criação
      // Na edição, os módulos vêm do perfil gestor associado
      if (!isEditing) {
        body.modulosAcesso = modulosAcesso.length > 0 ? modulosAcesso : []
        body.password = password
      } else if (password) {
        // Em modo de edição, só envia senha se foi alterada
        body.password = password
      }

      const url = isEditing
        ? `/api/pessoas/usuarios-gestor/${usuarioId}`
        : '/api/pessoas/usuarios-gestor'
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
        throw new Error(errorData.error || 'Erro ao salvar usuário gestor')
      }

      showToast.success(
        isEditing ? 'Usuário gestor atualizado com sucesso!' : 'Usuário gestor criado com sucesso!'
      )
      if (isEmbedded) {
        onSaved?.()
      } else {
        router.push('/cadastros/usuarios-gestor')
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário gestor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/usuarios-gestor')
    }
  }

  // Função removida - módulos de acesso agora vêm do perfil gestor

  if (isLoadingUsuario) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <img
          src="/images/jiffy-loading.gif"
          alt="Carregando"
          className="w-20 h-20 object-contain"
        />
        <span className="text-sm font-medium text-primary-text font-nunito mt-2">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md md:px-[30px] px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:w-12 w-10 md:h-12 h-10 rounded-full bg-primary/25 text-primary flex items-center justify-center">
              <span className="md:text-2xl text-xl"><MdPerson /></span>
            </div>
            <h1 className="text-primary md:text-lg text-sm font-semibold font-exo">
              {isEditing ? 'Editar Usuário Gestor' : 'Novo Usuário Gestor'}
            </h1>
          </div>
          <Button
            onClick={handleCancel}
            variant="outlined"
            className="h-8 px-8 rounded-lg hover:bg-primary/15 transition-colors"
            sx={{
              backgroundColor: 'var(--color-info)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto md:px-[30px] px-1 py-2">
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Dados */}
          <div className="bg-info">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-primary md:text-xl text-sm font-semibold font-exo">
                Dados do Usuário
              </h2>
              {/* Toggle Status - Na mesma linha do título */}
              <div className="flex items-center gap-2">
                <span className="text-primary-text font-medium text-sm md:text-base">Usuário Ativo?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
            <div className="h-[2px] bg-primary/70 mb-4"></div>

            <div className="space-y-2">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Digite o nome do usuário"
                className="bg-info"
                autoComplete="off"
                sx={{
                  '& .MuiInputBase-input': {
                    padding: '8px 12px',
                  },
                }}
              />

              <Input
                label="E-mail"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Digite o e-mail"
                className="bg-info"
                autoComplete="email"
                sx={{
                  '& .MuiInputBase-input': {
                    padding: '8px 12px',
                  },
                }}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil Gestor *
                </label>
                {isLoadingPerfis ? (
                  <div className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info flex items-center justify-center">
                    <img
                      src="/images/jiffy-loading.gif"
                      alt="Carregando"
                      className="w-6 h-6"
                    />
                  </div>
                ) : (
                  <Select
                    value={perfilGestorId || undefined}
                    onValueChange={(value) => {
                      setPerfilGestorId(value)
                      // O perfil completo será carregado pelo useEffect
                    }}
                  >
                    <SelectTrigger className="w-full h-10 px-4 rounded-lg border border-gray-400 bg-info hover:border-primary-text focus:outline-none focus:border-2 focus:border-primary-text">
                      <SelectValue placeholder="Selecione um perfil gestor..." />
                    </SelectTrigger>
                    <SelectContent 
                      className="max-h-[200px] z-[9999] overflow-y-auto !bg-info border border-gray-300 shadow-lg" 
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      {perfisGestor.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-secondary-text">
                          Nenhum perfil gestor disponível
                        </div>
                      ) : (
                        perfisGestor.map((perfil: PerfilGestor) => (
                          <SelectItem
                            key={perfil.id}
                            value={perfil.id}
                            className="min-h-[32px] max-h-[40px] data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary transition-colors"
                          >
                            {perfil.role}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <Input
                      label=""
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Digite a senha"
                      className="bg-info pr-10"
                      autoComplete="new-password"
                      sx={{
                        '& .MuiInputBase-input': {
                          padding: '8px 12px',
                        },
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors z-10"
                    >
                      {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha (deixe em branco para manter a atual)
                  </label>
                  <div className="relative">
                    <Input
                      label=""
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                      className="bg-info pr-10"
                      autoComplete="new-password"
                      sx={{
                        '& .MuiInputBase-input': {
                          padding: '8px 12px',
                        },
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors z-10"
                    >
                      {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Módulos de Acesso - Exibição baseada no Perfil Gestor selecionado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Módulos de Acesso
                  <span className="text-xs text-secondary-text ml-2">
                    (Definidos pelo Perfil Gestor)
                  </span>
                </label>
                {!perfilGestorId ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-secondary-text text-center">
                      Selecione um Perfil Gestor para visualizar os módulos de acesso
                    </p>
                  </div>
                ) : !perfilGestorCompleto ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                    <img
                      src="/images/jiffy-loading.gif"
                      alt="Carregando"
                      className="w-6 h-6"
                    />
                    <span className="ml-2 text-sm text-secondary-text">Carregando módulos...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {MODULOS_ACESSO.map((modulo) => {
                      let isActive = false
                      switch (modulo) {
                        case 'FINANCEIRO':
                          isActive = perfilGestorCompleto.hasAcessoFinanceiro()
                          break
                        case 'ESTOQUE':
                          isActive = perfilGestorCompleto.hasAcessoEstoque()
                          break
                        case 'FISCAL':
                          isActive = perfilGestorCompleto.hasAcessoFiscal()
                          break
                        case 'DASHBOARD':
                          isActive = perfilGestorCompleto.hasAcessoDashboard()
                          break
                      }
                      
                      return (
                        <div key={modulo} className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                          <span className="text-primary-text font-medium text-sm md:text-base">{modulo}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {perfilGestorCompleto && (
                  <p className="text-xs text-secondary-text mt-2">
                    Os módulos de acesso são definidos pelo Perfil Gestor selecionado. Para alterá-los, edite o Perfil Gestor.
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-2">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="h-8 px-8 rounded-lg hover:bg-primary/15 transition-colors"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !nome || !username || !perfilGestorId} 
              className="h-8 rounded-lg text-white hover:bg-primary/90"
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
