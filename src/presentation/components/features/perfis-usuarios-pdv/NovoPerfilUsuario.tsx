'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'

interface NovoPerfilUsuarioProps {
  perfilId?: string
}

interface MeioPagamento {
  id: string
  nome: string
}

/**
 * Componente para criar/editar perfil de usuário
 * Replica o design e funcionalidades do Flutter
 */
export function NovoPerfilUsuario({ perfilId }: NovoPerfilUsuarioProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!perfilId

  // Estados do formulário
  const [role, setRole] = useState('')
  const [selectedMeiosPagamento, setSelectedMeiosPagamento] = useState<MeioPagamento[]>([])
  const [cancelarVenda, setCancelarVenda] = useState(false)
  const [cancelarProduto, setCancelarProduto] = useState(false)
  const [aplicarDescontoProduto, setAplicarDescontoProduto] = useState(false)
  const [aplicarDescontoVenda, setAplicarDescontoVenda] = useState(false)
  const [aplicarAcrescimoProduto, setAplicarAcrescimoProduto] = useState(false)
  const [aplicarAcrescimoVenda, setAplicarAcrescimoVenda] = useState(false)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false)
  const [showMeiosPagamentoModal, setShowMeiosPagamentoModal] = useState(false)
  const hasLoadedPerfilRef = useRef(false)

  // Carregar lista de meios de pagamento usando React Query (com cache)
  const {
    data,
    isLoading: isLoadingMeiosPagamento,
  } = useMeiosPagamentoInfinite({
    limit: 100,
  })

  // Achatando todas as páginas em uma única lista
  const meiosPagamento: MeioPagamento[] = data?.pages.flatMap((page) =>
    page.meiosPagamento.map((meio) => ({
      id: meio.getId(),
      nome: meio.getNome(),
    }))
  ) || []

  // Carregar dados do perfil se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedPerfilRef.current) return

    const loadPerfil = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingPerfil(true)
      hasLoadedPerfilRef.current = true

      try {
        const response = await fetch(`/api/perfis-usuarios-pdv/${perfilId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const perfil = PerfilUsuario.fromJSON(data)

          setRole(perfil.getRole())
          setCancelarVenda(perfil.canCancelarVenda())
          setCancelarProduto(perfil.canCancelarProduto())
          setAplicarDescontoProduto(perfil.canAplicarDescontoProduto())
          setAplicarDescontoVenda(perfil.canAplicarDescontoVenda())
          setAplicarAcrescimoProduto(perfil.canAplicarAcrescimoProduto())
          setAplicarAcrescimoVenda(perfil.canAplicarAcrescimoVenda())

          // Carregar meios de pagamento selecionados
          const nomesMeios = perfil.getAcessoMeiosPagamento()
          if (nomesMeios.length > 0 && meiosPagamento.length > 0) {
            const selecionados = meiosPagamento.filter((mp) =>
              nomesMeios.includes(mp.nome)
            )
            setSelectedMeiosPagamento(selecionados)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      } finally {
        setIsLoadingPerfil(false)
      }
    }

    loadPerfil()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, perfilId, meiosPagamento.length])

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
      const acessoMeiosPagamento = selectedMeiosPagamento.map((mp) => mp.nome)

      const body: any = {
        role,
        acessoMeiosPagamento,
        cancelarVenda,
        cancelarProduto,
        aplicarDescontoProduto,
        aplicarDescontoVenda,
        aplicarAcrescimoProduto,
        aplicarAcrescimoVenda,
      }

      const url = isEditing
        ? `/api/perfis-usuarios-pdv/${perfilId}`
        : '/api/perfis-usuarios-pdv'
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
        throw new Error(errorData.error || 'Erro ao salvar perfil')
      }

      alert(isEditing ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
      router.push('/cadastros/perfis-usuarios-pdv')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/cadastros/perfis-usuarios-pdv')
  }

  const toggleMeioPagamento = (meio: MeioPagamento) => {
    setSelectedMeiosPagamento((prev) => {
      const exists = prev.find((mp) => mp.id === meio.id)
      if (exists) {
        return prev.filter((mp) => mp.id !== meio.id)
      } else {
        return [...prev, meio]
      }
    })
  }

  if (isLoadingPerfil) {
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
              <span className="text-2xl">👥</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Perfil de Usuário' : 'Novo Perfil de Usuário'}
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
              <Input
                label="Nome do Perfil *"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                placeholder="Digite o nome do perfil"
                className="bg-info"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meios de Pagamento *
                </label>
                <button
                  type="button"
                  onClick={() => setShowMeiosPagamentoModal(true)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-left text-gray-900 focus:outline-none focus:border-2 focus:border-primary"
                >
                  {isLoadingMeiosPagamento ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Carregando...</span>
                    </div>
                  ) : selectedMeiosPagamento.length === 0 ? (
                    'Selecionar Meios de Pagamento'
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedMeiosPagamento.map((mp) => (
                        <span
                          key={mp.id}
                          className="px-3 py-1 bg-primary-bg rounded-full text-sm border border-alternate flex items-center gap-2"
                        >
                          {mp.nome}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMeiosPagamento((prev) =>
                                prev.filter((p) => p.id !== mp.id)
                              )
                            }}
                            className="text-secondary-text hover:text-primary"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Permissões */}
          <div className="bg-info rounded-[12px] p-5">
            <h2 className="text-secondary text-xl font-semibold font-exo mb-4">
              Permissões
            </h2>
            <div className="h-px bg-alternate mb-4"></div>

            <div className="space-y-3">
              {/* Toggle Cancelar Venda */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Pode Cancelar Venda?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelarVenda}
                    onChange={(e) => setCancelarVenda(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Cancelar Produto */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Pode Cancelar Produto?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelarProduto}
                    onChange={(e) => setCancelarProduto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Aplicar Desconto Produto */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Pode Aplicar Desconto no Produto?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarDescontoProduto}
                    onChange={(e) => setAplicarDescontoProduto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Aplicar Desconto Venda */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Pode Aplicar Desconto na Venda?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarDescontoVenda}
                    onChange={(e) => setAplicarDescontoVenda(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Aplicar Acréscimo Produto */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Pode Aplicar Acréscimo no Produto?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarAcrescimoProduto}
                    onChange={(e) => setAplicarAcrescimoProduto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              {/* Toggle Aplicar Acréscimo Venda */}
              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Pode Aplicar Acréscimo na Venda?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarAcrescimoVenda}
                    onChange={(e) => setAplicarAcrescimoVenda(e.target.checked)}
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
            <Button type="submit" disabled={isLoading || !role}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>

      {/* Modal de seleção de meios de pagamento */}
      {showMeiosPagamentoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-info rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary-text">Selecionar Meios de Pagamento</h3>
              <button
                type="button"
                onClick={() => setShowMeiosPagamentoModal(false)}
                className="text-secondary-text hover:text-primary-text"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {meiosPagamento.map((meio) => {
                const isSelected = selectedMeiosPagamento.some((mp) => mp.id === meio.id)
                return (
                  <button
                    key={meio.id}
                    type="button"
                    onClick={() => toggleMeioPagamento(meio)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 bg-info hover:bg-primary-bg'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary-text">{meio.nome}</span>
                      {isSelected && <span className="text-primary">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => setShowMeiosPagamentoModal(false)}
                className="px-6"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

