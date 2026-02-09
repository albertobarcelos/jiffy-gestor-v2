'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { PerfilGestor } from '@/src/domain/entities/PerfilGestor'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { MdPerson } from 'react-icons/md'

interface NovoPerfilGestorProps {
  perfilId?: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * Componente para criar/editar perfil gestor
 * Replica o design e funcionalidades do Flutter
 */
export function NovoPerfilGestor({
  perfilId,
  isEmbedded = false,
  onSaved,
  onCancel,
}: NovoPerfilGestorProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!perfilId

  // Estados do formulário
  const [role, setRole] = useState('')
  const [acessoFinanceiro, setAcessoFinanceiro] = useState(false)
  const [acessoEstoque, setAcessoEstoque] = useState(false)
  const [acessoFiscal, setAcessoFiscal] = useState(false)
  const [acessoDashboard, setAcessoDashboard] = useState(false)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false)
  const hasLoadedPerfilRef = useRef(false)

  // Carregar dados do perfil se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedPerfilRef.current) return

    const loadPerfil = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingPerfil(true)
      hasLoadedPerfilRef.current = true

      try {
        const response = await fetch(`/api/pessoas/perfis-gestor/${perfilId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const perfil = PerfilGestor.fromJSON(data)

          setRole(perfil.getRole())
          setAcessoFinanceiro(perfil.hasAcessoFinanceiro())
          setAcessoEstoque(perfil.hasAcessoEstoque())
          setAcessoFiscal(perfil.hasAcessoFiscal())
          setAcessoDashboard(perfil.hasAcessoDashboard())
        }
      } catch (error) {
        // Erro ao carregar perfil gestor
      } finally {
        setIsLoadingPerfil(false)
      }
    }

    loadPerfil()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, perfilId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    if (!role) {
      alert('Nome do perfil é obrigatório')
      return
    }

    setIsLoading(true)

    try {
      const body: any = {
        role,
        acessoFinanceiro,
        acessoEstoque,
        acessoFiscal,
        acessoDashboard,
      }

      const url = isEditing
        ? `/api/pessoas/perfis-gestor/${perfilId}`
        : '/api/pessoas/perfis-gestor'
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
        throw new Error(errorData.error || 'Erro ao salvar perfil gestor')
      }

      if (isEmbedded) {
        onSaved?.()
      } else {
        alert(isEditing ? 'Perfil gestor atualizado com sucesso!' : 'Perfil gestor criado com sucesso!')
        router.push('/cadastros/perfis-gestor')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar perfil gestor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/perfis-gestor')
    }
  }

  if (isLoadingPerfil) {
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
              {isEditing ? 'Editar Perfil Gestor' : 'Novo Perfil Gestor'}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados */}
          <div className="bg-info">
            <h2 className="text-primary md:text-xl text-sm font-semibold font-exo mb-1">
              Dados do Perfil
            </h2>
            <div className="h-[2px] bg-primary/70 mb-4"></div>

            <div className="space-y-2">
              <Input
                label="Nome do Perfil"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                placeholder="Digite o nome do perfil"
                className="bg-info"
              />
            </div>
          </div>

          {/* Permissões */}
          <div className="bg-info">
            <h2 className="text-primary md:text-xl text-sm font-semibold font-exo mb-1">
              Permissões de Acesso
            </h2>
            <div className="h-[2px] bg-primary/70 mb-2"></div>

            <div className="space-y-2">
              {/* Toggle Acesso Financeiro */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Acesso Financeiro?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acessoFinanceiro}
                    onChange={(e) => setAcessoFinanceiro(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Acesso Estoque */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Acesso Estoque?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acessoEstoque}
                    onChange={(e) => setAcessoEstoque(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Acesso Fiscal */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Acesso Fiscal?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acessoFiscal}
                    onChange={(e) => setAcessoFiscal(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Acesso Dashboard */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Acesso Dashboard?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acessoDashboard}
                    onChange={(e) => setAcessoDashboard(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
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
              disabled={isLoading || !role} 
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
