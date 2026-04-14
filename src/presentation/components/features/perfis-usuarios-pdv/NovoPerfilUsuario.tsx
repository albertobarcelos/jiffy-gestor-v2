'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import toast from 'react-hot-toast'
import { MdPerson, MdSearch } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  MeiosPagamentosTabsModal,
  MeiosPagamentosTabsModalState,
} from '../meios-pagamentos/MeiosPagamentosTabsModal'

interface NovoPerfilUsuarioProps {
  perfilId?: string
  isEmbedded?: boolean
  hideEmbeddedHeader?: boolean
  embeddedFormId?: string
  hideEmbeddedFormActions?: boolean
  onEmbedFormStateChange?: (s: { isSubmitting: boolean; canSubmit: boolean }) => void
  /** Embutido: após POST com sucesso envia `perfilIdCriado` para o pai manter o modal aberto */
  onSaved?: (payload?: { perfilIdCriado?: string }) => void
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
  hideEmbeddedHeader = false,
  embeddedFormId,
  hideEmbeddedFormActions = false,
  onEmbedFormStateChange,
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
  const [searchMeioPagamento, setSearchMeioPagamento] = useState('')
  const [meiosPagamentosTabsModalState, setMeiosPagamentosTabsModalState] =
    useState<MeiosPagamentosTabsModalState>({
      open: false,
      tab: 'meio-pagamento',
      mode: 'create',
      meioPagamentoId: undefined,
    })
  const hasLoadedPerfilRef = useRef(false)
  const lastMeioPagamentoErrorToastRef = useRef<string | null>(null)
  const perfilMeiosPagamentoNomesRef = useRef<string[]>([])
  const [perfilLoaded, setPerfilLoaded] = useState(false)
  const canSubmit = Boolean(role && role.trim() && selectedMeiosPagamento.length > 0)
  const formId = embeddedFormId ?? 'novo-perfil-usuario-form'

  // Carregar lista de meios de pagamento usando React Query (com cache)
  const {
    data,
    isLoading: isLoadingMeiosPagamento,
    refetch: refetchMeiosPagamento,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMeiosPagamentoInfinite({
    limit: 100,
  })

  // Carrega todas as páginas para exibir a lista completa no formulário
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Achatando todas as páginas em uma única lista
  const meiosPagamento: MeioPagamento[] = data?.pages.flatMap((page) =>
    page.meiosPagamento.map((meio) => ({
      id: meio.getId(),
      nome: meio.getNome(),
    }))
  ) || []

  // Cria uma string serializada dos IDs dos meios de pagamento para usar como dependência estável
  const meiosPagamentoIds = useMemo(() => {
    return meiosPagamento.map((mp) => mp.id).sort().join(',')
  }, [meiosPagamento])

  const meiosPagamentoFiltrados = useMemo(() => {
    const q = searchMeioPagamento.trim().toLowerCase()
    if (!q) return meiosPagamento
    return meiosPagamento.filter((m) => m.nome.toLowerCase().includes(q))
  }, [meiosPagamento, searchMeioPagamento])

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

          setRole((perfil.getRole() || '').toUpperCase())
          setCancelarVenda(perfil.canCancelarVenda())
          setCancelarProduto(perfil.canCancelarProduto())
          setAplicarDescontoProduto(perfil.canAplicarDescontoProduto())
          setAplicarDescontoVenda(perfil.canAplicarDescontoVenda())
          setAplicarAcrescimoProduto(perfil.canAplicarAcrescimoProduto())
          setAplicarAcrescimoVenda(perfil.canAplicarAcrescimoVenda())

          // Guarda os nomes dos meios de pagamento do perfil para usar depois
          const nomesMeios = perfil.getAcessoMeiosPagamento()
          perfilMeiosPagamentoNomesRef.current = nomesMeios
          
          // Marca que o perfil foi carregado
          setPerfilLoaded(true)
          
          // Tenta atualizar os meios de pagamento selecionados se já estiverem carregados
          if (meiosPagamento.length > 0) {
            const selecionados = meiosPagamento.filter((mp) =>
              nomesMeios.includes(mp.nome)
            )
            setSelectedMeiosPagamento(selecionados)
          } else if (nomesMeios.length === 0) {
            // Se não há meios de pagamento e a lista está vazia, limpa o estado
            setSelectedMeiosPagamento([])
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
  }, [isEditing, perfilId])

  // Atualiza os meios de pagamento selecionados quando os meios de pagamento são carregados
  // Isso resolve o problema de race condition quando a página é recarregada
  useEffect(() => {
    if (!isEditing || !perfilLoaded) return
    if (meiosPagamento.length === 0) return
    
    const nomesMeios = perfilMeiosPagamentoNomesRef.current
    if (nomesMeios.length === 0) {
      setSelectedMeiosPagamento([])
      return
    }
    
    // Atualiza os meios de pagamento selecionados
    const selecionados = meiosPagamento.filter((mp) =>
      nomesMeios.includes(mp.nome)
    )
    
    // Só atualiza se houver diferença para evitar loops infinitos
    setSelectedMeiosPagamento((prev) => {
      const prevIds = prev.map((p) => p.id).sort().join(',')
      const newIds = selecionados.map((s) => s.id).sort().join(',')
      if (prevIds !== newIds) {
        return selecionados
      }
      return prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, perfilLoaded, meiosPagamentoIds, meiosPagamento.length])

  // Limpa toasts quando o componente desmonta ou quando o modal fecha
  useEffect(() => {
    return () => {
      // Limpa todos os toasts ao desmontar o componente
      showToast.dismissAll()
      lastMeioPagamentoErrorToastRef.current = null
      perfilMeiosPagamentoNomesRef.current = []
      hasLoadedPerfilRef.current = false
      setPerfilLoaded(false)
    }
  }, [])

  useEffect(() => {
    onEmbedFormStateChange?.({ isSubmitting: isLoading, canSubmit })
  }, [onEmbedFormStateChange, isLoading, canSubmit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    if (!role) {
      showToast.error('Nome do perfil é obrigatório')
      return
    }

    // Validação: não permite salvar perfil sem pelo menos 1 meio de pagamento
    if (selectedMeiosPagamento.length === 0) {
      showToast.error('É necessário selecionar pelo menos um meio de pagamento para o perfil')
      return
    }

    setIsLoading(true)
    onEmbedFormStateChange?.({ isSubmitting: true, canSubmit })

    try {
      // Garante que sempre enviamos um array, mesmo que vazio
      const acessoMeiosPagamento = selectedMeiosPagamento.map((mp) => mp.nome)

      const body: any = {
        role,
        acessoMeiosPagamento: acessoMeiosPagamento || [], // Garante que sempre seja um array
        cancelarVenda,
        cancelarProduto,
        aplicarDescontoProduto,
        aplicarDescontoVenda,
        aplicarAcrescimoProduto,
        aplicarAcrescimoVenda,
      }

      // Debug: log do body antes de enviar
      console.log('📤 [NovoPerfilUsuario] Enviando dados:', {
        ...body,
        acessoMeiosPagamentoLength: body.acessoMeiosPagamento.length,
        acessoMeiosPagamentoIsArray: Array.isArray(body.acessoMeiosPagamento),
      })

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
        console.error('❌ [NovoPerfilUsuario] Erro na resposta:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw new Error(errorData.error || `Erro ao salvar perfil (${response.status})`)
      }

      // Log da resposta de sucesso para debug
      const responseData = await response.json().catch(() => ({}))
      console.log('✅ [NovoPerfilUsuario] Perfil salvo com sucesso:', {
        responseData,
        acessoMeiosPagamento: responseData.acessoMeiosPagamento || [],
        acessoMeiosPagamentoLength: (responseData.acessoMeiosPagamento || []).length,
      })

      // Se estiver editando, recarrega os dados do perfil para garantir sincronização
      if (isEditing && perfilId) {
        hasLoadedPerfilRef.current = false
        const token = auth?.getAccessToken()
        if (token) {
          try {
            const reloadResponse = await fetch(`/api/perfis-usuarios-pdv/${perfilId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            if (reloadResponse.ok) {
              const reloadData = await reloadResponse.json()
              const perfil = PerfilUsuario.fromJSON(reloadData)
              const nomesMeios = perfil.getAcessoMeiosPagamento()
              console.log('🔄 [NovoPerfilUsuario] Dados recarregados:', {
                acessoMeiosPagamento: nomesMeios,
                acessoMeiosPagamentoLength: nomesMeios.length,
              })
              
              // Atualiza os meios de pagamento selecionados
              if (meiosPagamento.length > 0) {
                const selecionados = meiosPagamento.filter((mp) =>
                  nomesMeios.includes(mp.nome)
                )
                setSelectedMeiosPagamento(selecionados)
              } else if (nomesMeios.length === 0) {
                setSelectedMeiosPagamento([])
              }
            }
          } catch (reloadError) {
            console.error('Erro ao recarregar perfil após salvar:', reloadError)
          }
        }
      }

      if (isEmbedded) {
        // Criação embutida: devolve o id para o modal trocar para modo edição sem fechar
        if (!isEditing) {
          const criado = PerfilUsuario.fromJSON(responseData)
          const novoId = criado.getId()
          if (!novoId) {
            showToast.error('Perfil salvo, mas não foi possível obter o ID. Recarregue a página.')
            return
          }
          // Sincroniza ref dos nomes para o efeito de meios não limpar a seleção ao virar edição
          perfilMeiosPagamentoNomesRef.current = selectedMeiosPagamento.map(
            (mp) => mp.nome
          )
          // Evita GET redundante quando o pai passar `perfilId` e virar edição
          hasLoadedPerfilRef.current = true
          setPerfilLoaded(true)
          onSaved?.({ perfilIdCriado: novoId })
        } else {
          showToast.success('Perfil atualizado com sucesso!')
          onSaved?.()
        }
      } else {
        showToast.success(isEditing ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
        router.push('/cadastros/perfis-usuarios-pdv')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil')
    } finally {
      setIsLoading(false)
      onEmbedFormStateChange?.({ isSubmitting: false, canSubmit })
    }
  }

  const handleCancel = () => {
    // Limpa todos os toasts ao fechar o modal
    showToast.dismissAll()
    lastMeioPagamentoErrorToastRef.current = null
    // Reseta a referência dos meios de pagamento do perfil
    perfilMeiosPagamentoNomesRef.current = []
    hasLoadedPerfilRef.current = false
    setPerfilLoaded(false)
    
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
        // Validação: não permite remover se for o último meio de pagamento
        if (prev.length === 1) {
          // Sempre exibe o toast quando tenta remover o último item
          // O ID garante que substitui o toast anterior se ainda estiver visível
          const toastId = 'meio-pagamento-error'
          toast.error('É necessário manter pelo menos um meio de pagamento selecionado', {
            id: toastId,
            duration: 5000,
          })
          lastMeioPagamentoErrorToastRef.current = toastId
          return prev
        }
        // Limpa o toast de erro se a remoção for bem-sucedida
        if (lastMeioPagamentoErrorToastRef.current) {
          toast.dismiss(lastMeioPagamentoErrorToastRef.current)
          lastMeioPagamentoErrorToastRef.current = null
        }
        return prev.filter((mp) => mp.id !== meio.id)
      } else {
        // Limpa o toast de erro se adicionar um meio de pagamento
        if (lastMeioPagamentoErrorToastRef.current) {
          toast.dismiss(lastMeioPagamentoErrorToastRef.current)
          lastMeioPagamentoErrorToastRef.current = null
        }
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
      <div className="flex flex-col items-center justify-center h-full">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      {!isEmbedded || !hideEmbeddedHeader ? (
        <div className="sticky top-0 z-10 bg-white shadow-sm md:px-[30px] px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="md:w-12 w-10 md:h-12 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="md:text-2xl text-xl">
                  <MdPerson />
                </span>
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
      ) : null}

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          {/* Dados */}
          <div className="bg-white">
          <div className="mb-4 flex items-center gap-5">
                <h2 className="shrink-0 text-primary md:text-xl text-sm font-semibold">
                  Dados do Perfil
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>

            <div className="space-y-2">
              <Input
                label="Nome do Perfil"
                value={role}
                onChange={(e) => setRole(e.target.value.toUpperCase())}
                required
                placeholder="Digite o nome do perfil"
                className="bg-info"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-input': {
                    padding: '6px 10px',
                  },
                }}
              />
            </div>

              <div className="mt-4 space-y-2">
                <div className="mb-2 flex items-center gap-5">
                  <h2 className="shrink-0 text-primary md:text-base text-sm font-semibold font-exo">
                    Meios de Pagamento *
                  </h2>
                  <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
                </div>

                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <MdSearch
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Buscar meio de pagamento..."
                      value={searchMeioPagamento}
                      onChange={(e) => setSearchMeioPagamento(e.target.value)}
                      className="font-nunito h-8 w-full rounded-lg border border-gray-300 bg-info pl-10 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={openMeiosPagamentosTabsModal}
                    className="h-8 w-full shrink-0 rounded-lg bg-primary px-4 text-info hover:bg-primary/90 sm:w-auto"
                    sx={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-info)',
                      borderColor: 'var(--color-primary)',
                    }}
                  >
                    Adicionar Meios de Pagamento
                  </Button>
                </div>

                {isLoadingMeiosPagamento && meiosPagamento.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-info px-4 py-6 text-primary-text">
                    <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Carregando meios de pagamento...</span>
                  </div>
                ) : meiosPagamento.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-info px-4 py-6 text-center text-sm text-secondary-text">
                    Nenhum meio de pagamento cadastrado. Use o botão acima para cadastrar.
                  </div>
                ) : meiosPagamentoFiltrados.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-info px-4 py-4 text-center text-sm text-secondary-text">
                    Nenhum resultado para a busca.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-info scrollbar-hide">
                    {meiosPagamentoFiltrados.map((meio) => {
                      const isVinculado = selectedMeiosPagamento.some((mp) => mp.id === meio.id)
                      return (
                        <div
                          key={meio.id}
                          className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-1.5 last:border-b-0"
                        >
                          <span className="min-w-0 flex-1 text-xs font-medium text-primary-text">
                            {meio.nome}
                          </span>
                          <JiffyIconSwitch
                            checked={isVinculado}
                            onChange={() => toggleMeioPagamento(meio)}
                            disabled={isLoading || isLoadingMeiosPagamento}
                            bordered={false}
                            size="sm"
                            className="shrink-0 justify-center gap-0 px-0 py-0"
                            inputProps={{
                              'aria-label': `Vincular ${meio.nome} ao perfil`,
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                {isFetchingNextPage ? (
                  <p className="mt-1 text-xs text-secondary-text">Carregando mais meios de pagamento...</p>
                ) : null}
              </div>
          </div>

          {/* Permissões */}
          <div className="bg-white">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="shrink-0 text-primary md:text-base text-sm font-semibold">
                  Permissões
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>
            <div className="">
              {/* Toggle Cancelar Venda */}
              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Cancelar Venda?</span>
                <JiffyIconSwitch
                  checked={cancelarVenda}
                  onChange={e => setCancelarVenda(e.target.checked)}
                  disabled={isLoading}
                  bordered={false}
                  size="sm"
                  className="shrink-0"
                  inputProps={{ 'aria-label': 'Permitir cancelar venda' }}
                />
              </div>

              {/* Toggle Cancelar Produto */}
              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Cancelar Produto?</span>
                <JiffyIconSwitch
                  checked={cancelarProduto}
                  onChange={e => setCancelarProduto(e.target.checked)}
                  disabled={isLoading}
                  bordered={false}
                  size="sm"
                  className="shrink-0"
                  inputProps={{ 'aria-label': 'Permitir cancelar produto' }}
                />
              </div>

              {/* Toggle Aplicar Desconto Produto */}
              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Aplicar Desconto no Produto?</span>
                <JiffyIconSwitch
                  checked={aplicarDescontoProduto}
                  onChange={e => setAplicarDescontoProduto(e.target.checked)}
                  disabled={isLoading}
                  bordered={false}
                  size="sm"
                  className="shrink-0"
                  inputProps={{ 'aria-label': 'Permitir aplicar desconto no produto' }}
                />
              </div>

              {/* Toggle Aplicar Desconto Venda */}
              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Aplicar Desconto na Venda?</span>
                <JiffyIconSwitch
                  checked={aplicarDescontoVenda}
                  onChange={e => setAplicarDescontoVenda(e.target.checked)}
                  disabled={isLoading}
                  bordered={false}
                  size="sm"
                  className="shrink-0"
                  inputProps={{ 'aria-label': 'Permitir aplicar desconto na venda' }}
                />
              </div>

              {/* Toggle Aplicar Acréscimo Produto */}
              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Aplicar Acréscimo no Produto?</span>
                <JiffyIconSwitch
                  checked={aplicarAcrescimoProduto}
                  onChange={e => setAplicarAcrescimoProduto(e.target.checked)}
                  disabled={isLoading}
                  bordered={false}
                  size="sm"
                  className="shrink-0"
                  inputProps={{ 'aria-label': 'Permitir aplicar acréscimo no produto' }}
                />
              </div>

              {/* Toggle Aplicar Acréscimo Venda */}
              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Aplicar Acréscimo na Venda?</span>
                <JiffyIconSwitch
                  checked={aplicarAcrescimoVenda}
                  onChange={e => setAplicarAcrescimoVenda(e.target.checked)}
                  disabled={isLoading}
                  bordered={false}
                  size="sm"
                  className="shrink-0"
                  inputProps={{ 'aria-label': 'Permitir aplicar acréscimo na venda' }}
                />
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          {!isEmbedded || !hideEmbeddedFormActions ? (
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
          ) : null}
        </form>
      </div>

      <MeiosPagamentosTabsModal
        state={meiosPagamentosTabsModalState}
        onClose={closeMeiosPagamentosTabsModal}
        onTabChange={handleMeiosPagamentosTabChange}
        onReload={handleMeiosPagamentosReload}
      />
    </div>
  )
}

