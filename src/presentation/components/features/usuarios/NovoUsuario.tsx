'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Usuario } from '@/src/domain/entities/Usuario'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface NovoUsuarioProps {
  usuarioId?: string
}

interface PerfilPDV {
  id: string
  role: string
}

/**
 * Componente para criar/editar usuário
 * Replica o design e funcionalidades do Flutter
 */
export function NovoUsuario({ usuarioId }: NovoUsuarioProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!usuarioId

  // Estados do formulário
  const [id, setId] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [perfilPdvId, setPerfilPdvId] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [novoCliente, setNovoCliente] = useState(false)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false)
  const [perfisPDV, setPerfisPDV] = useState<PerfilPDV[]>([])
  const hasLoadedUsuarioRef = useRef(false)
  const hasLoadedPerfisRef = useRef(false)

  // Carregar lista de perfis PDV
  useEffect(() => {
    if (hasLoadedPerfisRef.current) return

    const loadPerfis = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingPerfis(true)
      hasLoadedPerfisRef.current = true

      try {
        const response = await fetch('/api/perfis-pdv', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const perfis = (data.items || []).map((item: any) => ({
            id: item.id?.toString() || '',
            role: item.role?.toString() || '',
          }))
          setPerfisPDV(perfis)
          if (perfis.length > 0 && !isEditing) {
            setPerfilPdvId(perfis[0].id)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar perfis PDV:', error)
      } finally {
        setIsLoadingPerfis(false)
      }
    }

    loadPerfis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

          setId(usuario.getId())
          setNome(usuario.getNome())
          setTelefone(usuario.getTelefone() || '')
          setPerfilPdvId(usuario.getPerfilPdvId() || '')
          setAtivo(usuario.isAtivo())
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
      alert('Token não encontrado')
      return
    }

    if (!isEditing && !id) {
      alert('ID é obrigatório')
      return
    }

    if (!isEditing && !password) {
      alert('Senha é obrigatória para novos usuários')
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
        body.id = id
        body.password = password
      } else if (password) {
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

      alert(isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
      router.push('/cadastros/usuarios')
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar usuário')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/cadastros/usuarios')
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
              <span className="text-2xl">👤</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
            </h1>
          </div>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="h-9 px-[26px] rounded-[30px] border-primary/15 text-primary bg-primary/10 hover:bg-primary/20"
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[30px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados */}
          <div className="bg-info rounded-[12px] p-5">
            <h2 className="text-secondary text-xl font-semibold font-exo mb-4">
              Dados
            </h2>
            <div className="h-px bg-alternate mb-4"></div>

            <div className="space-y-4">
              {!isEditing && (
                <Input
                  label="ID do Usuário *"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                  placeholder="Digite o ID do usuário"
                  className="bg-info"
                />
              )}

              <Input
                label="Nome *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Digite o nome do usuário"
                className="bg-info"
              />

              <Input
                label="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 0 0000-0000"
                className="bg-info"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil PDV *
                </label>
                {isLoadingPerfis ? (
                  <div className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <select
                    value={perfilPdvId}
                    onChange={(e) => setPerfilPdvId(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 focus:outline-none focus:border-2 focus:border-primary"
                  >
                    <option value="">Selecione um perfil...</option>
                    {perfisPDV.map((perfil) => (
                      <option key={perfil.id} value={perfil.id}>
                        {perfil.role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {!isEditing && (
                <Input
                  label="Senha *"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Digite a senha (mínimo 6 caracteres)"
                  className="bg-info"
                />
              )}

              {isEditing && (
                <Input
                  label="Nova Senha (deixe em branco para manter a atual)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  className="bg-info"
                />
              )}

              {/* Toggle Novo Cliente */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      novoCliente ? 'bg-success/20' : 'bg-secondary-bg/20'
                    }`}
                  >
                    <span className={`text-2xl ${novoCliente ? 'text-success' : 'text-secondary-text'}`}>
                      👤
                    </span>
                  </div>
                  <span className="text-primary-text font-medium">Novo Cliente</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoCliente}
                    onChange={(e) => setNovoCliente(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="px-8"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome || (!isEditing && (!id || !password))}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

