'use client'

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
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
  /** Embutido: notifica se há alterações não refletidas no baseline (ex.: bloquear aba Usuário no modal). */
  onEmbedDirtyChange?: (dirty: boolean) => void
  /** Embutido: após POST com sucesso envia `perfilIdCriado` para o pai manter o modal aberto */
  onSaved?: (payload?: { perfilIdCriado?: string }) => void
  /**
   * Embutido: fechar o painel após "Salvar e fechar" com sucesso.
   * Deve chamar `onClose` do modal direto — não usar `onCancel` (evita `handleRequestClose` / confirmação com `dirty` ainda não propagado).
   */
  onClosePanelAfterSave?: () => void
  onCancel?: () => void
}

/** API imperativa — confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoPerfilUsuarioHandle {
  isDirty: () => boolean
  /** Submete o form do perfil e, em embed, força fechamento após sucesso (inclui criação com `perfilIdCriado`). */
  savePerfilAndClose: () => void
}

interface MeioPagamento {
  id: string
  nome: string
}

/** Campos de permissão persistidos via PATCH (espelha `AtualizarPerfilUsuarioDTO`) */
type PermissaoCampo =
  | 'cancelarVenda'
  | 'cancelarProduto'
  | 'aplicarDescontoProduto'
  | 'aplicarDescontoVenda'
  | 'aplicarAcrescimoProduto'
  | 'aplicarAcrescimoVenda'
  | 'removerProdutoLancado'
  | 'removerPagamento'
  | 'reimprimir'
  | 'acessoVisaoGeral'
  | 'acessoHistorico'
  | 'acessoMesa'
  | 'acessoBalcao'
  | 'acessoConfiguracoes'
  | 'crudCardapio'
  | 'crudUsuario'
  | 'crudCliente'
  | 'encerrarCaixa'
  | 'lancarTaxa'
  | 'removerTaxa'
  | 'removerLicenca'

/**
 * Componente para criar/editar perfil de usuário
 * Replica o design e funcionalidades do Flutter
 */
export const NovoPerfilUsuario = forwardRef<NovoPerfilUsuarioHandle, NovoPerfilUsuarioProps>(
  function NovoPerfilUsuario(
    {
      perfilId,
      isEmbedded = false,
      hideEmbeddedHeader = false,
      embeddedFormId,
      hideEmbeddedFormActions = false,
      onEmbedFormStateChange,
      onEmbedDirtyChange,
      onSaved,
      onClosePanelAfterSave,
      onCancel,
    },
    ref
  ) {
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
  const [removerProdutoLancado, setRemoverProdutoLancado] = useState(false)
  const [removerPagamento, setRemoverPagamento] = useState(false)
  const [reimprimir, setReimprimir] = useState(false)
  const [acessoVisaoGeral, setAcessoVisaoGeral] = useState(false)
  const [acessoHistorico, setAcessoHistorico] = useState(false)
  const [acessoMesa, setAcessoMesa] = useState(false)
  const [acessoBalcao, setAcessoBalcao] = useState(false)
  const [acessoConfiguracoes, setAcessoConfiguracoes] = useState(false)
  const [crudCardapio, setCrudCardapio] = useState(false)
  const [crudUsuario, setCrudUsuario] = useState(false)
  const [crudCliente, setCrudCliente] = useState(false)
  const [encerrarCaixa, setEncerrarCaixa] = useState(false)
  const [lancarTaxa, setLancarTaxa] = useState(false)
  const [removerTaxa, setRemoverTaxa] = useState(false)
  const [removerLicenca, setRemoverLicenca] = useState(false)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  /** PATCH só dos meios ao alternar switch — não bloqueia o submit do formulário inteiro */
  const [isSavingMeiosPagamento, setIsSavingMeiosPagamento] = useState(false)
  /** PATCH das permissões ao alternar switch */
  const [savingPermissoes, setSavingPermissoes] = useState<Set<PermissaoCampo>>(
    () => new Set()
  )
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

  /** Snapshot só de dados persistidos (PADRAO_MODAL_SAIR_SEM_SALVAR). */
  const getFormSnapshot = useCallback(() => {
    const meiosIds = [...selectedMeiosPagamento]
      .map((m) => m.id)
      .sort()
      .join(',')
    return JSON.stringify({
      role: (role || '').trim(),
      meiosIds,
      cancelarVenda,
      cancelarProduto,
      aplicarDescontoProduto,
      aplicarDescontoVenda,
      aplicarAcrescimoProduto,
      aplicarAcrescimoVenda,
      removerProdutoLancado,
      removerPagamento,
      reimprimir,
      acessoVisaoGeral,
      acessoHistorico,
      acessoMesa,
      acessoBalcao,
      acessoConfiguracoes,
      crudCardapio,
      crudUsuario,
      crudCliente,
      encerrarCaixa,
      lancarTaxa,
      removerTaxa,
      removerLicenca,
    })
  }, [
    role,
    selectedMeiosPagamento,
    cancelarVenda,
    cancelarProduto,
    aplicarDescontoProduto,
    aplicarDescontoVenda,
    aplicarAcrescimoProduto,
    aplicarAcrescimoVenda,
    removerProdutoLancado,
    removerPagamento,
    reimprimir,
    acessoVisaoGeral,
    acessoHistorico,
    acessoMesa,
    acessoBalcao,
    acessoConfiguracoes,
    crudCardapio,
    crudUsuario,
    crudCliente,
    encerrarCaixa,
    lancarTaxa,
    removerTaxa,
    removerLicenca,
  ])

  const baselineSerializedRef = useRef('')
  /** Incrementado a cada `commitBaseline` para o pai recalcular `dirty` (baseline está em ref). */
  const [baselineTick, setBaselineTick] = useState(0)
  /** Após "Salvar e fechar" no diálogo de confirmação — força `onCancel` no embed mesmo com `perfilIdCriado`. */
  const closeAfterEmbeddedSaveRef = useRef(false)

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
    setBaselineTick(t => t + 1)
  }, [getFormSnapshot])

  const embedDirtyComputed = useMemo(() => {
    if (isLoadingPerfil) return false
    return getFormSnapshot() !== baselineSerializedRef.current
  }, [getFormSnapshot, isLoadingPerfil, baselineTick])

  useEffect(() => {
    if (!isEmbedded || !onEmbedDirtyChange) return
    onEmbedDirtyChange(embedDirtyComputed)
  }, [isEmbedded, onEmbedDirtyChange, embedDirtyComputed])

  useEffect(() => {
    return () => {
      if (isEmbedded) {
        onEmbedDirtyChange?.(false)
      }
    }
  }, [isEmbedded, onEmbedDirtyChange])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  const selectedMeiosPagamentoRef = useRef(selectedMeiosPagamento)
  selectedMeiosPagamentoRef.current = selectedMeiosPagamento

  /** Evita reverter estado se outro PATCH de meios foi disparado depois */
  const meiosPersistSeqRef = useRef(0)
  const meiosPatchInFlightRef = useRef(0)

  const persistAcessoMeiosPagamento = useCallback(
    async (next: MeioPagamento[], previous: MeioPagamento[]) => {
      if (!perfilId) return
      const seqAtStart = ++meiosPersistSeqRef.current
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        if (seqAtStart === meiosPersistSeqRef.current) {
          selectedMeiosPagamentoRef.current = previous
          setSelectedMeiosPagamento(previous)
        }
        return
      }

      meiosPatchInFlightRef.current += 1
      setIsSavingMeiosPagamento(true)
      try {
        const response = await fetch(`/api/perfis-usuarios-pdv/${perfilId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            acessoMeiosPagamento: next.map((mp) => mp.nome),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            typeof errorData.error === 'string'
              ? errorData.error
              : `Erro ao atualizar meios (${response.status})`
          )
        }

        if (seqAtStart !== meiosPersistSeqRef.current) return

        perfilMeiosPagamentoNomesRef.current = next.map((m) => m.nome)
        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 0)
      } catch (err) {
        console.error('Erro ao persistir meios de pagamento do perfil:', err)
        showToast.error(
          err instanceof Error ? err.message : 'Erro ao atualizar meios de pagamento'
        )
        if (seqAtStart === meiosPersistSeqRef.current) {
          selectedMeiosPagamentoRef.current = previous
          setSelectedMeiosPagamento(previous)
        }
      } finally {
        meiosPatchInFlightRef.current -= 1
        if (meiosPatchInFlightRef.current <= 0) {
          meiosPatchInFlightRef.current = 0
          setIsSavingMeiosPagamento(false)
        }
      }
    },
    [perfilId, auth]
  )

  // Baseline inicial em modo criação
  useEffect(() => {
    if (isLoadingPerfil) return
    if (isEditing) return
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [isLoadingPerfil, isEditing, perfilId])

  const permissoesPersistSeqRef = useRef(0)
  const permissoesPatchInFlightRef = useRef(0)

  const permissoesRef = useRef({
    cancelarVenda: false,
    cancelarProduto: false,
    aplicarDescontoProduto: false,
    aplicarDescontoVenda: false,
    aplicarAcrescimoProduto: false,
    aplicarAcrescimoVenda: false,
    removerProdutoLancado: false,
    removerPagamento: false,
    reimprimir: false,
    acessoVisaoGeral: false,
    acessoHistorico: false,
    acessoMesa: false,
    acessoBalcao: false,
    acessoConfiguracoes: false,
    crudCardapio: false,
    crudUsuario: false,
    crudCliente: false,
    encerrarCaixa: false,
    lancarTaxa: false,
    removerTaxa: false,
    removerLicenca: false,
  })

  useEffect(() => {
    permissoesRef.current = {
      cancelarVenda,
      cancelarProduto,
      aplicarDescontoProduto,
      aplicarDescontoVenda,
      aplicarAcrescimoProduto,
      aplicarAcrescimoVenda,
      removerProdutoLancado,
      removerPagamento,
      reimprimir,
      acessoVisaoGeral,
      acessoHistorico,
      acessoMesa,
      acessoBalcao,
      acessoConfiguracoes,
      crudCardapio,
      crudUsuario,
      crudCliente,
      encerrarCaixa,
      lancarTaxa,
      removerTaxa,
      removerLicenca,
    }
  }, [
    cancelarVenda,
    cancelarProduto,
    aplicarDescontoProduto,
    aplicarDescontoVenda,
    aplicarAcrescimoProduto,
    aplicarAcrescimoVenda,
    removerProdutoLancado,
    removerPagamento,
    reimprimir,
    acessoVisaoGeral,
    acessoHistorico,
    acessoMesa,
    acessoBalcao,
    acessoConfiguracoes,
    crudCardapio,
    crudUsuario,
    crudCliente,
    encerrarCaixa,
    lancarTaxa,
    removerTaxa,
    removerLicenca,
  ])

  const aplicarValorPermissao = useCallback((campo: PermissaoCampo, value: boolean) => {
    switch (campo) {
      case 'cancelarVenda':
        setCancelarVenda(value)
        break
      case 'cancelarProduto':
        setCancelarProduto(value)
        break
      case 'aplicarDescontoProduto':
        setAplicarDescontoProduto(value)
        break
      case 'aplicarDescontoVenda':
        setAplicarDescontoVenda(value)
        break
      case 'aplicarAcrescimoProduto':
        setAplicarAcrescimoProduto(value)
        break
      case 'aplicarAcrescimoVenda':
        setAplicarAcrescimoVenda(value)
        break
      case 'removerProdutoLancado':
        setRemoverProdutoLancado(value)
        break
      case 'removerPagamento':
        setRemoverPagamento(value)
        break
      case 'reimprimir':
        setReimprimir(value)
        break
      case 'acessoVisaoGeral':
        setAcessoVisaoGeral(value)
        break
      case 'acessoHistorico':
        setAcessoHistorico(value)
        break
      case 'acessoMesa':
        setAcessoMesa(value)
        break
      case 'acessoBalcao':
        setAcessoBalcao(value)
        break
      case 'acessoConfiguracoes':
        setAcessoConfiguracoes(value)
        break
      case 'crudCardapio':
        setCrudCardapio(value)
        break
      case 'crudUsuario':
        setCrudUsuario(value)
        break
      case 'crudCliente':
        setCrudCliente(value)
        break
      case 'encerrarCaixa':
        setEncerrarCaixa(value)
        break
      case 'lancarTaxa':
        setLancarTaxa(value)
        break
      case 'removerTaxa':
        setRemoverTaxa(value)
        break
      case 'removerLicenca':
        setRemoverLicenca(value)
        break
    }
  }, [])

  const persistPermissaoCampo = useCallback(
    async (campo: PermissaoCampo, next: boolean, previous: boolean) => {
      if (!perfilId) return
      const seqAtStart = ++permissoesPersistSeqRef.current
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        if (seqAtStart === permissoesPersistSeqRef.current) {
          permissoesRef.current = { ...permissoesRef.current, [campo]: previous }
          aplicarValorPermissao(campo, previous)
        }
        return
      }

      permissoesPatchInFlightRef.current += 1
      setSavingPermissoes(prev => {
        const nextSet = new Set(prev)
        nextSet.add(campo)
        return nextSet
      })
      try {
        const response = await fetch(`/api/perfis-usuarios-pdv/${perfilId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [campo]: next }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            typeof errorData.error === 'string'
              ? errorData.error
              : `Erro ao atualizar permissões (${response.status})`
          )
        }

        if (seqAtStart !== permissoesPersistSeqRef.current) return
        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 0)
      } catch (err) {
        console.error('Erro ao persistir permissão do perfil:', err)
        showToast.error(
          err instanceof Error ? err.message : 'Erro ao atualizar permissão'
        )
        if (seqAtStart === permissoesPersistSeqRef.current) {
          permissoesRef.current = { ...permissoesRef.current, [campo]: previous }
          aplicarValorPermissao(campo, previous)
        }
      } finally {
        permissoesPatchInFlightRef.current -= 1
        if (permissoesPatchInFlightRef.current <= 0) {
          permissoesPatchInFlightRef.current = 0
        }
        setSavingPermissoes(prev => {
          const nextSet = new Set(prev)
          nextSet.delete(campo)
          return nextSet
        })
      }
    },
    [perfilId, auth, aplicarValorPermissao]
  )

  /** Atualiza UI e, se já existir perfil, persiste o campo via PATCH */
  const handlePermissaoChange = useCallback(
    (campo: PermissaoCampo, next: boolean) => {
      const previous = permissoesRef.current[campo]
      permissoesRef.current = { ...permissoesRef.current, [campo]: next }
      aplicarValorPermissao(campo, next)
      if (perfilId) {
        void persistPermissaoCampo(campo, next, previous)
      }
    },
    [perfilId, aplicarValorPermissao, persistPermissaoCampo]
  )

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

  // Lista achatada das páginas — memoizada por `data` para não criar novo array a cada render.
  // Sem isso, qualquer setState (ex.: toggle de permissão) recria `meiosPagamento`, invalida os
  // useMemos abaixo e roda sort/filtro de novo desnecessariamente (reflow junto ao scroll do modal).
  const meiosPagamento = useMemo<MeioPagamento[]>(() => {
    if (!data?.pages?.length) return []
    return data.pages.flatMap((page) =>
      page.meiosPagamento.map((meio) => ({
        id: meio.getId(),
        nome: meio.getNome(),
      }))
    )
  }, [data])

  // Cria uma string serializada dos IDs dos meios de pagamento para usar como dependência estável
  const meiosPagamentoIds = useMemo(() => {
    return meiosPagamento.map((mp) => mp.id).sort().join(',')
  }, [meiosPagamento])

  const meiosPagamentoFiltrados = useMemo(() => {
    const q = searchMeioPagamento.trim().toLowerCase()
    const lista =
      !q ? [...meiosPagamento] : meiosPagamento.filter((m) => m.nome.toLowerCase().includes(q))
    // Vinculados ao perfil primeiro; desempate alfabético estável
    const vinculadosIds = new Set(selectedMeiosPagamento.map((m) => m.id))
    lista.sort((a, b) => {
      const av = vinculadosIds.has(a.id) ? 1 : 0
      const bv = vinculadosIds.has(b.id) ? 1 : 0
      if (bv !== av) return bv - av
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    })
    return lista
  }, [meiosPagamento, searchMeioPagamento, selectedMeiosPagamento])

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
          setRemoverProdutoLancado(perfil.canRemoverProdutoLancado())
          setRemoverPagamento(perfil.canRemoverPagamento())
          setReimprimir(perfil.canReimprimir())
          setAcessoVisaoGeral(perfil.canAcessoVisaoGeral())
          setAcessoHistorico(perfil.canAcessoHistorico())
          setAcessoMesa(perfil.canAcessoMesa())
          setAcessoBalcao(perfil.canAcessoBalcao())
          setAcessoConfiguracoes(perfil.canAcessoConfiguracoes())
          setCrudCardapio(perfil.canCrudCardapio())
          setCrudUsuario(perfil.canCrudUsuario())
          setCrudCliente(perfil.canCrudCliente())
          setEncerrarCaixa(perfil.canEncerrarCaixa())
          setLancarTaxa(perfil.canLancarTaxa())
          setRemoverTaxa(perfil.canRemoverTaxa())
          setRemoverLicenca(perfil.canRemoverLicenca())

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
        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 250)
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
    if (isEditing && perfilLoaded) {
      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 200)
    }
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
    const forceClosePanel = closeAfterEmbeddedSaveRef.current
    closeAfterEmbeddedSaveRef.current = false

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
        removerProdutoLancado,
        removerPagamento,
        reimprimir,
        acessoVisaoGeral,
        acessoHistorico,
        acessoMesa,
        acessoBalcao,
        acessoConfiguracoes,
        crudCardapio,
        crudUsuario,
        crudCliente,
        encerrarCaixa,
        lancarTaxa,
        removerTaxa,
        removerLicenca,
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
          commitBaselineLatestRef.current()
          if (forceClosePanel) {
            onClosePanelAfterSave?.()
          }
        } else {
          showToast.success('Perfil atualizado com sucesso!')
          onSaved?.()
          commitBaselineLatestRef.current()
          if (forceClosePanel) {
            onClosePanelAfterSave?.()
          }
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

  const toggleMeioPagamento = useCallback(
    (meio: MeioPagamento) => {
      const prev = selectedMeiosPagamentoRef.current
      const exists = prev.find((mp) => mp.id === meio.id)
      if (exists) {
        if (prev.length === 1) {
          const toastId = 'meio-pagamento-error'
          toast.error('É necessário manter pelo menos um meio de pagamento selecionado', {
            id: toastId,
            duration: 5000,
          })
          lastMeioPagamentoErrorToastRef.current = toastId
          return
        }
        if (lastMeioPagamentoErrorToastRef.current) {
          toast.dismiss(lastMeioPagamentoErrorToastRef.current)
          lastMeioPagamentoErrorToastRef.current = null
        }
      } else if (lastMeioPagamentoErrorToastRef.current) {
        toast.dismiss(lastMeioPagamentoErrorToastRef.current)
        lastMeioPagamentoErrorToastRef.current = null
      }

      const next = exists ? prev.filter((mp) => mp.id !== meio.id) : [...prev, meio]
      selectedMeiosPagamentoRef.current = next
      setSelectedMeiosPagamento(next)

      // Perfil ainda não persistido: só estado local até o primeiro Salvar do formulário
      if (perfilId) {
        void persistAcessoMeiosPagamento(next, prev)
      }
    },
    [perfilId, persistAcessoMeiosPagamento]
  )

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

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingPerfil) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      savePerfilAndClose: () => {
        closeAfterEmbeddedSaveRef.current = true
        const el = document.getElementById(formId)
        if (el instanceof HTMLFormElement) {
          el.requestSubmit()
        }
      },
    }),
    [formId, getFormSnapshot, isLoadingPerfil]
  )

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
                            disabled={
                              isLoading ||
                              isLoadingMeiosPagamento ||
                              isSavingMeiosPagamento
                            }
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
                    onChange={e => handlePermissaoChange('cancelarVenda', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('cancelarVenda')}
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
                    onChange={e => handlePermissaoChange('cancelarProduto', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('cancelarProduto')}
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
                    onChange={e => handlePermissaoChange('aplicarDescontoProduto', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('aplicarDescontoProduto')}
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
                    onChange={e => handlePermissaoChange('aplicarDescontoVenda', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('aplicarDescontoVenda')}
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
                    onChange={e => handlePermissaoChange('aplicarAcrescimoProduto', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('aplicarAcrescimoProduto')}
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
                    onChange={e => handlePermissaoChange('aplicarAcrescimoVenda', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('aplicarAcrescimoVenda')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir aplicar acréscimo na venda' }}
                  />

              </div>

              <div className="my-2 h-px w-full bg-gray-200" aria-hidden />

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Remover Produto Lançado?</span>
                <JiffyIconSwitch
                    checked={removerProdutoLancado}
                    onChange={e => handlePermissaoChange('removerProdutoLancado', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('removerProdutoLancado')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir remover produto lançado' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Remover Pagamento?</span>
                <JiffyIconSwitch
                    checked={removerPagamento}
                    onChange={e => handlePermissaoChange('removerPagamento', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('removerPagamento')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir remover pagamento' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Reimprimir?</span>
                <JiffyIconSwitch
                    checked={reimprimir}
                    onChange={e => handlePermissaoChange('reimprimir', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('reimprimir')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir reimprimir' }}
                  />

              </div>

              <div className="my-2 h-px w-full bg-gray-200" aria-hidden />

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Acesso à Visão Geral?</span>
                <JiffyIconSwitch
                    checked={acessoVisaoGeral}
                    onChange={e => handlePermissaoChange('acessoVisaoGeral', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('acessoVisaoGeral')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir acesso visão geral' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Acesso ao Histórico?</span>
                <JiffyIconSwitch
                    checked={acessoHistorico}
                    onChange={e => handlePermissaoChange('acessoHistorico', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('acessoHistorico')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir acesso histórico' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Acesso a Mesas?</span>
                <JiffyIconSwitch
                    checked={acessoMesa}
                    onChange={e => handlePermissaoChange('acessoMesa', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('acessoMesa')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir acesso mesas' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Acesso ao Balcão?</span>
                <JiffyIconSwitch
                    checked={acessoBalcao}
                    onChange={e => handlePermissaoChange('acessoBalcao', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('acessoBalcao')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir acesso balcão' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Acesso a Configurações?</span>
                <JiffyIconSwitch
                    checked={acessoConfiguracoes}
                    onChange={e => handlePermissaoChange('acessoConfiguracoes', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('acessoConfiguracoes')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir acesso configurações' }}
                  />

              </div>

              <div className="my-2 h-px w-full bg-gray-200" aria-hidden />

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">CRUD Cardápio?</span>
                <JiffyIconSwitch
                    checked={crudCardapio}
                    onChange={e => handlePermissaoChange('crudCardapio', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('crudCardapio')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir CRUD cardápio' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">CRUD Usuário?</span>
                <JiffyIconSwitch
                    checked={crudUsuario}
                    onChange={e => handlePermissaoChange('crudUsuario', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('crudUsuario')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir CRUD usuário' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">CRUD Cliente?</span>
                <JiffyIconSwitch
                    checked={crudCliente}
                    onChange={e => handlePermissaoChange('crudCliente', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('crudCliente')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir CRUD cliente' }}
                  />

              </div>

              <div className="my-2 h-px w-full bg-gray-200" aria-hidden />

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Encerrar Caixa?</span>
                <JiffyIconSwitch
                    checked={encerrarCaixa}
                    onChange={e => handlePermissaoChange('encerrarCaixa', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('encerrarCaixa')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir encerrar caixa' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Lançar Taxa?</span>
                <JiffyIconSwitch
                    checked={lancarTaxa}
                    onChange={e => handlePermissaoChange('lancarTaxa', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('lancarTaxa')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir lançar taxa' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Remover Taxa?</span>
                <JiffyIconSwitch
                    checked={removerTaxa}
                    onChange={e => handlePermissaoChange('removerTaxa', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('removerTaxa')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir remover taxa' }}
                  />

              </div>

              <div className="flex items-center justify-between p-1 bg-white">
                <span className="text-primary-text font-medium text-xs md:text-sm">Pode Remover Licença?</span>
                <JiffyIconSwitch
                    checked={removerLicenca}
                    onChange={e => handlePermissaoChange('removerLicenca', e.target.checked)}
                    disabled={isLoading || savingPermissoes.has('removerLicenca')}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{ 'aria-label': 'Permitir remover licença' }}
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
})

NovoPerfilUsuario.displayName = 'NovoPerfilUsuario'
