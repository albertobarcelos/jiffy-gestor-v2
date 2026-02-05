'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { MdPerson, MdClose, MdSearch } from 'react-icons/md'
import {
  MeiosPagamentosTabsModal,
  MeiosPagamentosTabsModalState,
} from '../meios-pagamentos/MeiosPagamentosTabsModal'

interface NovoPerfilUsuarioProps {
  perfilId?: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

interface MeioPagamento {
  id: string
  nome: string
}

/**
 * Componente para criar/editar perfil de usuário
 * Replica o design e funcionalidades do Flutter
 */
export function NovoPerfilUsuario({
  perfilId,
  isEmbedded = false,
  onSaved,
  onCancel,
}: NovoPerfilUsuarioProps) {
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
  const [searchMeioPagamento, setSearchMeioPagamento] = useState('')
  const [meiosPagamentosTabsModalState, setMeiosPagamentosTabsModalState] =
    useState<MeiosPagamentosTabsModalState>({
      open: false,
      tab: 'meio-pagamento',
      mode: 'create',
      meioPagamentoId: undefined,
    })
  const hasLoadedPerfilRef = useRef(false)

  // Carregar lista de meios de pagamento usando React Query (com cache)
  const {
    data,
    isLoading: isLoadingMeiosPagamento,
    refetch: refetchMeiosPagamento,
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

      if (isEmbedded) {
        onSaved?.()
      } else {
        alert(isEditing ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
        router.push('/cadastros/perfis-usuarios-pdv')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/perfis-usuarios-pdv')
    }
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

  const openMeiosPagamentosTabsModal = () => {
    setMeiosPagamentosTabsModalState({
      open: true,
      tab: 'meio-pagamento',
      mode: 'create',
      meioPagamentoId: undefined,
    })
  }

  const closeMeiosPagamentosTabsModal = () => {
    setMeiosPagamentosTabsModalState((prev) => ({
      ...prev,
      open: false,
      meioPagamentoId: undefined,
    }))
  }

  const handleMeiosPagamentosTabChange = (tab: 'meio-pagamento') => {
    setMeiosPagamentosTabsModalState((prev) => ({ ...prev, tab }))
  }

  const handleMeiosPagamentosReload = async () => {
    // Recarrega a lista de meios de pagamento
    await refetchMeiosPagamento()
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
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md md:px-[30px] px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:w-12 w-10 md:h-12 h-10 rounded-full bg-primary/25 text-primary flex items-center justify-center">
              <span className="md:text-2xl text-xl"><MdPerson /></span>
            </div>
            <h1 className="text-primary md:text-lg text-sm font-semibold font-exo">
              {isEditing ? 'Editar Perfil de Usuário' : 'Novo Perfil de Usuário'}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meios de Pagamento *
                </label>
                <div className="flex md:flex-row flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMeiosPagamentoModal(true)}
                    className="flex-1 md:px-4 px-2 md:py-3 py-2 rounded-lg border border-gray-400 bg-info text-left text-gray-900 focus:outline-none focus:border-2 focus:border-primary"
                  >
                    {isLoadingMeiosPagamento ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Carregando...</span>
                      </div>
                    ) : selectedMeiosPagamento.length === 0 ? (
                      'Clique para Selecionar Meios de Pagamento'
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedMeiosPagamento.map((mp) => (
                          <span
                            key={mp.id}
                            className="md:px-3 px-2 py-1 bg-primary-bg rounded-full md:text-sm text-xs border border-primary flex items-center gap-2"
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
                              className="text-secondary-text hover:text-primary md:text-sm text-xs"
                            >
                              <MdClose />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMeiosPagamentoModal(true)}
                    className="h-8 px-4 rounded-lg bg-primary text-info font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Vincular Pagamentos
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Permissões */}
          <div className="bg-info">
            <h2 className="text-primary md:text-xl text-sm font-semibold font-exo mb-1">
              Permissões
            </h2>
            <div className="h-[2px] bg-primary/70 mb-2"></div>

            <div className="space-y-2">
              {/* Toggle Cancelar Venda */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Pode Cancelar Venda?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelarVenda}
                    onChange={(e) => setCancelarVenda(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Cancelar Produto */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Pode Cancelar Produto?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelarProduto}
                    onChange={(e) => setCancelarProduto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Aplicar Desconto Produto */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Pode Aplicar Desconto no Produto?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarDescontoProduto}
                    onChange={(e) => setAplicarDescontoProduto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Aplicar Desconto Venda */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Pode Aplicar Desconto na Venda?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarDescontoVenda}
                    onChange={(e) => setAplicarDescontoVenda(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Aplicar Acréscimo Produto */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Pode Aplicar Acréscimo no Produto?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarAcrescimoProduto}
                    onChange={(e) => setAplicarAcrescimoProduto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-5 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle Aplicar Acréscimo Venda */}
              <div className="flex items-center justify-between p-2 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium text-sm md:text-base">Pode Aplicar Acréscimo na Venda?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarAcrescimoVenda}
                    onChange={(e) => setAplicarAcrescimoVenda(e.target.checked)}
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
            <Button type="submit" disabled={isLoading || !role} 
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

      {/* Modal de seleção de meios de pagamento */}
      {showMeiosPagamentoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-info rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Vincular Meios de Pagamento</h3>
              <button
                type="button"
                onClick={() => setShowMeiosPagamentoModal(false)}
                className="text-secondary-text hover:text-primary-text"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 flex gap-2 items-center">
              <div className="flex-1 relative">
                <MdSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar meio de pagamento..."
                  value={searchMeioPagamento}
                  onChange={(e) => setSearchMeioPagamento(e.target.value)}
                  className="w-full h-8 pl-10 pr-4 rounded-lg border border-gray-300 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
                />
              </div>
              <button
                type="button"
                onClick={openMeiosPagamentosTabsModal}
                className="h-8 px-4 rounded-lg bg-primary text-info font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Adicionar Meios de Pagamento
              </button>
            </div>
            <div className="space-y-2">
              {meiosPagamento
                .filter((meio) =>
                  meio.nome.toLowerCase().includes(searchMeioPagamento.toLowerCase())
                )
                .map((meio) => {
                const isSelected = selectedMeiosPagamento.some((mp) => mp.id === meio.id)
                return (
                  <button
                    key={meio.id}
                    type="button"
                    onClick={() => toggleMeioPagamento(meio)}
                    className={`w-full py-2 px-4 rounded-lg border-2 text-left transition-colors ${
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
                className="h-8 px-4 rounded-lg bg-primary text-info font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-info)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      <MeiosPagamentosTabsModal
        state={meiosPagamentosTabsModalState}
        onClose={closeMeiosPagamentosTabsModal}
        onTabChange={handleMeiosPagamentosTabChange}
        onReload={handleMeiosPagamentosReload}
      />
    </div>
  )
}

