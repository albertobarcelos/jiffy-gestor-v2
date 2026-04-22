'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { MdPhone, MdSearch } from 'react-icons/md'

/** Labels outlined em preto — igual NovoComplemento / NovaImpressora */
const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiFormLabel-asterisk': {
    color: 'var(--color-error)',
  },
} as const

const entradaCompactaInput = {
  padding: '10px',
  fontSize: '0.875rem',
} as const

const entradaCompactaSelect = {
  padding: '10px',
  fontSize: '0.875rem',
  minHeight: '1.5em',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
} as const

const sxEntradaCompactaTaxa = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiSelect-select': entradaCompactaSelect,
} as const

/** Grid desktop: checkbox | terminal | quatro flags (alinhado ao padrão NovaImpressora). */
const DESKTOP_TAXA_TERMINAL_GRID =
  'grid grid-cols-[auto_minmax(0,1fr)_repeat(4,minmax(4.5rem,1fr))] items-center gap-2 px-2'

const PAGE_SIZE_TERMINAIS = 100

/** Debounce do termo enviado ao GET `/api/terminais?q=` (backend: preferencias/terminais). */
const BUSCA_TERMINAL_DEBOUNCE_MS = 480

/** Botões de ação em lote na grade 4×2 (Config. por Terminal). */
const BULK_TERMINAL_BTN_CLASS =
  'w-full rounded-lg border border-primary/70 bg-primary/10 px-1.5 py-1.5 font-exo text-[11px] font-semibold leading-tight text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-2 sm:text-xs'

const DEFAULT_CFG = {
  ativo: true,
  automatico: true,
  mesa: true,
  balcao: true,
} as const

/** Somente cadastro novo: automático inicia desligado (edição usa DEFAULT_CFG antes do merge com API). */
const DEFAULT_CFG_NOVA_TAXA = {
  ...DEFAULT_CFG,
  automatico: false,
} as const

export interface NovaTaxaHandle {
  isDirty: () => boolean
  saveNovaTaxaAndClose: () => Promise<void>
}

interface NovaTaxaProps {
  /** Quando definido, carrega GET /api/taxas/:id e salva com PATCH. */
  taxaEditId?: string | null
  isEmbedded?: boolean
  hideEmbeddedHeader?: boolean
  embeddedFormId?: string
  hideEmbeddedFormActions?: boolean
  onEmbedFormStateChange?: (state: { isSubmitting: boolean; canSubmit: boolean }) => void
  onSaved?: () => void
  onCancel?: () => void
}

type TipoTaxaForm = 'percentual' | 'fixo' | 'entrega'

type ConfigTerminal = {
  ativo: boolean
  automatico: boolean
  mesa: boolean
  balcao: boolean
}

type TerminalListaItem = {
  terminalId: string
  nome: string
}

function snapshotTerminais(map: Record<string, ConfigTerminal>): string {
  const keys = Object.keys(map).sort()
  return JSON.stringify(keys.map(k => [k, map[k]]))
}

function parsePercentualDigitadoParaApi(texto: string): number {
  const t = texto.replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return 0
  return n / 100
}

/** Normaliza tipo retornado pela API (ex.: valor_fixo). */
function normalizeTipoTaxaApi(raw: unknown): TipoTaxaForm {
  const t = String(raw ?? '').toLowerCase()
  if (t === 'fixo' || t === 'valor_fixo') return 'fixo'
  if (t === 'entrega') return 'entrega'
  return 'percentual'
}

/** Exibe percentual armazenado como decimal na API (0,2 → "20"). */
function formatPercentualApiParaCampo(valor: number): string {
  if (!Number.isFinite(valor)) return '0'
  const pct = valor * 100
  const rounded = Math.round(pct * 1e6) / 1e6
  if (Number.isInteger(rounded)) return String(rounded)
  return String(rounded)
}

/**
 * Criação de taxa — um único POST com `terminaisConfig` (sem segunda requisição, ao contrário do fluxo de impressora).
 * Seção de terminais espelha o padrão visual de NovaImpressora (grade, seleção, ações rápidas).
 */
export const NovaTaxa = forwardRef<NovaTaxaHandle, NovaTaxaProps>(function NovaTaxa(
  {
    taxaEditId = null,
    isEmbedded = false,
    hideEmbeddedHeader = false,
    embeddedFormId,
    hideEmbeddedFormActions,
    onEmbedFormStateChange,
    onSaved,
    onCancel,
  },
  ref
) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  const formId = embeddedFormId ?? 'nova-taxa-form'

  const [terminaisLista, setTerminaisLista] = useState<TerminalListaItem[]>([])
  const [carregandoTerminais, setCarregandoTerminais] = useState(false)
  const hasLoadedTerminaisRef = useRef(false)

  const [buscaTerminalDraft, setBuscaTerminalDraft] = useState('')
  const [buscaTerminalQ, setBuscaTerminalQ] = useState('')
  /** Ref síncrona — `fetchListaTerminais` lê o q atual sem recriar callbacks que disparariam reload da taxa no modo edição. */
  const buscaTerminalQRef = useRef('')
  buscaTerminalQRef.current = buscaTerminalQ.trim()

  const [selectedTerminalIds, setSelectedTerminalIds] = useState<Set<string>>(new Set())

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoTaxaForm>('percentual')
  const [valorPercentualTexto, setValorPercentualTexto] = useState('0')
  const [valorMoeda, setValorMoeda] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [tributado, setTributado] = useState(false)
  const [ncm, setNcm] = useState('')
  const [porTerminal, setPorTerminal] = useState<Record<string, ConfigTerminal>>({})
  const [enviando, setEnviando] = useState(false)
  const [carregandoTaxaEdit, setCarregandoTaxaEdit] = useState(false)

  /** Eco do GET — enviado no PATCH como `dataAtualizacao`. */
  const dataAtualizacaoServidorRef = useRef<string | null>(null)

  const baselineSerializedRef = useRef('')
  const commitBaselineLatestRef = useRef(() => {})
  const scrollListaRef = useRef<HTMLDivElement>(null)

  const formatValorInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''
    const numberValue = parseInt(digits, 10)
    return (numberValue / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }, [])

  const parseValorToNumber = useCallback((value: string): number => {
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    const parsed = parseFloat(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }, [])

  const valorApi = useMemo(() => {
    if (tipo === 'percentual') {
      return parsePercentualDigitadoParaApi(valorPercentualTexto)
    }
    return parseValorToNumber(valorMoeda)
  }, [tipo, valorPercentualTexto, valorMoeda])

  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      nome: nome.trim(),
      tipo,
      valorPercentualTexto,
      valorMoeda,
      ativo,
      tributado,
      ncm: ncm.trim(),
      terminais: snapshotTerminais(porTerminal),
      selecao: [...selectedTerminalIds].sort().join(','),
    })
  }, [nome, tipo, valorPercentualTexto, valorMoeda, ativo, tributado, ncm, porTerminal, selectedTerminalIds])

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  commitBaselineLatestRef.current = commitBaseline

  useEffect(() => {
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setBuscaTerminalQ(buscaTerminalDraft.trim())
    }, BUSCA_TERMINAL_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [buscaTerminalDraft])

  /** Lista paginada de terminais — reutilizada na criação e na edição (merge com GET taxa). Usa `buscaTerminalQRef` para o parâmetro `q`. */
  const fetchListaTerminais = useCallback(async (bearerToken: string): Promise<TerminalListaItem[]> => {
    const acumulado: TerminalListaItem[] = []
    let offset = 0
    let hasMore = true
    let iterations = 0
    const maxIterations = 200
    const q = buscaTerminalQRef.current

    while (hasMore && iterations < maxIterations) {
      iterations++
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE_TERMINAIS),
        offset: String(offset),
      })
      if (q) {
        params.set('q', q)
      }

      const response = await fetch(`/api/terminais?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) break

      const data = await response.json()
      const items = data.items || []
      for (const terminal of items) {
        const id = String(terminal.id || terminal._id || '')
        if (!id) continue
        acumulado.push({
          terminalId: id,
          nome: terminal.nome || terminal.name || terminal.codigoInterno || 'Terminal sem nome',
        })
      }

      hasMore = items.length === PAGE_SIZE_TERMINAIS
      if (hasMore) offset += items.length
      else hasMore = false
    }

    acumulado.sort((a, b) =>
      a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' })
    )
    return acumulado
  }, [])

  /**
   * Carrega todos os terminais com paginação — mesmo critério de NovaImpressora.loadAllTerminais.
   */
  const loadAllTerminais = useCallback(async () => {
    const t = auth?.getAccessToken()
    if (!t) {
      setCarregandoTerminais(false)
      hasLoadedTerminaisRef.current = true
      return
    }

    setCarregandoTerminais(true)
    setTerminaisLista([])
    hasLoadedTerminaisRef.current = false

    try {
      const acumulado = await fetchListaTerminais(t)
      setTerminaisLista(acumulado)

      setPorTerminal(prev => {
        const next = { ...prev }
        for (const row of acumulado) {
          if (!next[row.terminalId]) {
            next[row.terminalId] = { ...DEFAULT_CFG_NOVA_TAXA }
          }
        }
        return next
      })
    } catch (e) {
      console.error('Erro ao carregar terminais (taxa):', e)
    } finally {
      setCarregandoTerminais(false)
      hasLoadedTerminaisRef.current = true
    }
  }, [auth, fetchListaTerminais])

  /** GET /api/taxas/:id em paralelo com a lista de PDVs — preenche o formulário e `terminaisConfig`. */
  const carregarEdicaoTaxa = useCallback(
    async (editId: string) => {
      const t = auth?.getAccessToken()
      if (!t) {
        setCarregandoTaxaEdit(false)
        hasLoadedTerminaisRef.current = true
        return
      }

      setCarregandoTaxaEdit(true)
      setCarregandoTerminais(true)
      hasLoadedTerminaisRef.current = false
      setTerminaisLista([])
      setSelectedTerminalIds(new Set())

      try {
        const [lista, taxaRes] = await Promise.all([
          fetchListaTerminais(t),
          fetch(`/api/taxas/${encodeURIComponent(editId)}`, {
            headers: {
              Authorization: `Bearer ${t}`,
              'Content-Type': 'application/json',
            },
          }),
        ])

        if (!taxaRes.ok) {
          const err = await taxaRes.json().catch(() => ({}))
          const msg =
            (typeof err.error === 'string' && err.error) ||
            (typeof err.message === 'string' && err.message) ||
            'Taxa não encontrada'
          throw new Error(msg)
        }

        const detalhe = (await taxaRes.json()) as Record<string, unknown>

        setTerminaisLista(lista)

        const map: Record<string, ConfigTerminal> = {}
        for (const row of lista) {
          map[row.terminalId] = { ...DEFAULT_CFG }
        }

        const tcRaw = detalhe.terminaisConfig
        if (Array.isArray(tcRaw)) {
          for (const item of tcRaw) {
            if (!item || typeof item !== 'object') continue
            const o = item as Record<string, unknown>
            const tid = o.terminalId != null ? String(o.terminalId) : ''
            if (!tid || !map[tid]) continue
            map[tid] = {
              ativo: o.ativo === true || o.ativo === 'true',
              automatico: o.automatico === true || o.automatico === 'true',
              mesa: o.mesa === true || o.mesa === 'true',
              balcao: o.balcao === true || o.balcao === 'true',
            }
          }
        }
        setPorTerminal(map)

        const tipoNorm = normalizeTipoTaxaApi(detalhe.tipo)
        setTipo(tipoNorm)
        setNome(String(detalhe.nome ?? ''))
        setAtivo(detalhe.ativo === true || detalhe.ativo === 'true')
        setTributado(detalhe.tributado === true || detalhe.tributado === 'true')
        setNcm(detalhe.ncm != null && detalhe.ncm !== '' ? String(detalhe.ncm) : '')

        const vr = detalhe.valor
        const valorNum =
          typeof vr === 'number' ? vr : parseFloat(vr != null ? String(vr) : '0')
        const valorSeguro = Number.isFinite(valorNum) ? valorNum : 0

        if (tipoNorm === 'percentual') {
          setValorPercentualTexto(formatPercentualApiParaCampo(valorSeguro))
          setValorMoeda('')
        } else {
          setValorPercentualTexto('0')
          setValorMoeda(formatValorInput(String(Math.round(valorSeguro * 100))))
        }

        dataAtualizacaoServidorRef.current =
          typeof detalhe.dataAtualizacao === 'string' && detalhe.dataAtualizacao
            ? detalhe.dataAtualizacao
            : new Date().toISOString()

        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 150)

        hasLoadedTerminaisRef.current = true
      } catch (e) {
        console.error('Erro ao carregar taxa para edição:', e)
        showToast.error(e instanceof Error ? e.message : 'Erro ao carregar taxa')
        dataAtualizacaoServidorRef.current = null
      } finally {
        setCarregandoTaxaEdit(false)
        setCarregandoTerminais(false)
      }
    },
    [auth, fetchListaTerminais, formatValorInput]
  )

  useEffect(() => {
    if (!isAuthenticated) return
    if (taxaEditId) {
      void carregarEdicaoTaxa(taxaEditId)
    } else {
      dataAtualizacaoServidorRef.current = null
      void loadAllTerminais()
    }
  }, [isAuthenticated, taxaEditId, carregarEdicaoTaxa, loadAllTerminais])

  /** Recarrega só a lista de terminais quando o termo debounced muda (criação ou edição), sem novo GET da taxa. */
  useEffect(() => {
    if (!isAuthenticated) return
    if (!hasLoadedTerminaisRef.current) return
    void loadAllTerminais()
  }, [buscaTerminalQ, isAuthenticated, loadAllTerminais])

  const emitEmbedFormState = useCallback(() => {
    onEmbedFormStateChange?.({
      isSubmitting: enviando,
      canSubmit: nome.trim().length > 0,
    })
  }, [enviando, nome, onEmbedFormStateChange])

  useEffect(() => {
    emitEmbedFormState()
  }, [emitEmbedFormState])

  const atualizarTerminal = useCallback((terminalId: string, patch: Partial<ConfigTerminal>) => {
    setPorTerminal(prev => ({
      ...prev,
      [terminalId]: {
        ...(prev[terminalId] ?? { ...DEFAULT_CFG }),
        ...patch,
      },
    }))
  }, [])

  const toggleTerminalSelection = useCallback((terminalId: string) => {
    setSelectedTerminalIds(prev => {
      const next = new Set(prev)
      if (next.has(terminalId)) next.delete(terminalId)
      else next.add(terminalId)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedTerminalIds(prev => {
      if (prev.size === terminaisLista.length) return new Set()
      return new Set(terminaisLista.map(t => t.terminalId))
    })
  }, [terminaisLista])

  const clearSelection = useCallback(() => {
    setSelectedTerminalIds(new Set())
  }, [])

  const isTerminalSelected = useCallback(
    (id: string) => selectedTerminalIds.has(id),
    [selectedTerminalIds]
  )

  const isAllSelected =
    terminaisLista.length > 0 && selectedTerminalIds.size === terminaisLista.length

  const applyBulkToSelected = useCallback(
    (patch: Partial<ConfigTerminal>) => {
      if (selectedTerminalIds.size === 0) {
        showToast.error('Selecione pelo menos um terminal')
        return
      }
      setPorTerminal(prev => {
        const next = { ...prev }
        for (const id of selectedTerminalIds) {
          next[id] = { ...(next[id] ?? { ...DEFAULT_CFG }), ...patch }
        }
        return next
      })
      showToast.success(`Aplicado a ${selectedTerminalIds.size} terminal(is)`)
    },
    [selectedTerminalIds]
  )

  const persistNovaTaxa = useCallback(async () => {
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      showToast.error('Informe o nome da taxa.')
      return
    }
    if (!Number.isFinite(valorApi) || valorApi < 0) {
      showToast.error('Informe um valor válido.')
      return
    }

    const ncmNorm = ncm.trim()
    const terminaisConfig = terminaisLista.map(row => {
      const cfg = porTerminal[row.terminalId] ?? { ...DEFAULT_CFG }
      return {
        terminalId: row.terminalId,
        ativo: cfg.ativo,
        automatico: cfg.automatico,
        mesa: cfg.mesa,
        balcao: cfg.balcao,
      }
    })

    const dataAtualizacao =
      dataAtualizacaoServidorRef.current ?? new Date().toISOString()

    setEnviando(true)
    try {
      if (taxaEditId) {
        const response = await fetch(`/api/taxas/${encodeURIComponent(taxaEditId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: nomeTrim,
            valor: valorApi,
            tipo,
            ativo,
            tributado,
            ncm: ncmNorm ? ncmNorm : null,
            dataAtualizacao,
            terminaisConfig: terminaisConfig.length > 0 ? terminaisConfig : undefined,
          }),
        })
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          const msg =
            (typeof err.error === 'string' && err.error) ||
            (typeof err.message === 'string' && err.message) ||
            'Erro ao atualizar taxa'
          throw new Error(msg)
        }
        const atualizado = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null
        if (atualizado && typeof atualizado.dataAtualizacao === 'string') {
          dataAtualizacaoServidorRef.current = atualizado.dataAtualizacao
        }
        showToast.success('Taxa atualizada com sucesso!')
      } else {
        const response = await fetch('/api/taxas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: nomeTrim,
            valor: valorApi,
            tipo,
            ativo,
            tributado,
            ncm: ncmNorm ? ncmNorm : null,
            terminaisConfig: terminaisConfig.length > 0 ? terminaisConfig : undefined,
          }),
        })
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          const msg =
            (typeof err.error === 'string' && err.error) ||
            (typeof err.message === 'string' && err.message) ||
            'Erro ao criar taxa'
          throw new Error(msg)
        }
        showToast.success('Taxa criada com sucesso!')
      }

      commitBaselineLatestRef.current()
      await queryClient.invalidateQueries({ queryKey: ['taxas'], exact: false })
      clearSelection()
      if (isEmbedded) {
        onSaved?.()
      } else {
        router.push('/cadastros/taxas')
      }
    } catch (er) {
      console.error(taxaEditId ? 'Erro ao atualizar taxa:' : 'Erro ao criar taxa:', er)
      showToast.error(
        er instanceof Error
          ? er.message
          : taxaEditId
            ? 'Erro ao atualizar taxa'
            : 'Erro ao criar taxa'
      )
    } finally {
      setEnviando(false)
    }
  }, [
    token,
    nome,
    valorApi,
    tipo,
    ativo,
    tributado,
    ncm,
    terminaisLista,
    porTerminal,
    queryClient,
    isEmbedded,
    onSaved,
    router,
    clearSelection,
    taxaEditId,
  ])

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (carregandoTaxaEdit) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      saveNovaTaxaAndClose: () => persistNovaTaxa(),
    }),
    [getFormSnapshot, persistNovaTaxa, carregandoTaxaEdit]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await persistNovaTaxa()
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/taxas')
    }
  }

  const renderCampoValor = () =>
    tipo === 'percentual' ? (
      <Input
        label="Valor (%) — ex.: 20 para 20%"
        value={valorPercentualTexto}
        onChange={e => setValorPercentualTexto(e.target.value)}
        size="small"
        className="bg-white"
        sx={sxEntradaCompactaTaxa}
        inputProps={{
          inputMode: 'decimal',
          autoComplete: 'off',
        }}
      />
    ) : (
      <Input
        label={tipo === 'entrega' ? 'Valor da entrega (R$)' : 'Valor (R$)'}
        value={valorMoeda}
        onChange={e => setValorMoeda(formatValorInput(e.target.value))}
        size="small"
        placeholder="R$ 0,00"
        className="bg-white"
        sx={sxEntradaCompactaTaxa}
        inputProps={{
          inputMode: 'decimal',
          autoComplete: 'off',
        }}
      />
    )

  if (taxaEditId && carregandoTaxaEdit) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-12">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col',
        isEmbedded && hideEmbeddedHeader ? 'min-h-0 flex-1 overflow-hidden' : 'h-full min-h-0'
      )}
    >
      {!(isEmbedded && hideEmbeddedHeader) ? (
        <div className="sticky top-0 z-10 shrink-0 rounded-tl-[20px] bg-primary-bg py-4 shadow-md md:px-[30px] px-2">
          <div className="flex items-center justify-between">
            <h1 className="font-exo text-sm font-semibold text-primary md:text-lg">
              {taxaEditId ? 'Editar taxa' : 'Nova taxa'}
            </h1>
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="h-8 rounded-lg border-primary/15 bg-primary/10 px-[26px] text-primary hover:bg-primary/20"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          isEmbedded && hideEmbeddedHeader ? 'px-4 md:px-4' : 'px-1 md:px-2'
        )}
      >
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-2"
        >
          {/* Dados gerais até NCM */}
          <div className="shrink-0 rounded-[10px] bg-info px-2 md:px-3">
            <div className="mb-2 flex items-center gap-5">
              <h2 className="font-exo text-xl font-semibold text-primary">Dados da taxa</h2>
              <div className="h-px flex-1 bg-primary/70" />
            </div>

            <div className="space-y-3">
              <div className=" w-full grid grid-cols-4 items-center">
              <Input
                label="Nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                size="small"
                placeholder="Nome da taxa"
                className="bg-white col-span-3"
                sx={sxEntradaCompactaTaxa}
                InputLabelProps={{ required: true }}
              />
              <JiffyIconSwitch
                  checked={ativo}
                  onChange={e => setAtivo(e.target.checked)}
                  label={ativo ? 'Ativo' : 'Inativo'}
                  bordered={false}
                  size="sm"
                  className="shrink-0 justify-end"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
                <FormControl
                  fullWidth
                  size="small"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
                    ...sxEntradaCompactaTaxa,
                  }}
                >
                  <InputLabel id="nova-taxa-tipo-label">Tipo</InputLabel>
                  <Select
                    labelId="nova-taxa-tipo-label"
                    id="nova-taxa-tipo"
                    label="Tipo"
                    size="small"
                    value={tipo}
                    onChange={e => setTipo(e.target.value as TipoTaxaForm)}
                  >
                    <MenuItem value="percentual">Percentual</MenuItem>
                    <MenuItem value="fixo">Fixo (R$)</MenuItem>
                    <MenuItem value="entrega">Entrega</MenuItem>
                  </Select>
                </FormControl>

                <div className="min-w-0">{renderCampoValor()}</div>
              </div>
              <div className="grid grid-cols-2 items-center">

              <Input
                label="NCM (opcional)"
                value={ncm}
                onChange={e => setNcm(e.target.value)}
                size="small"
                placeholder="Somente números, se aplicável"
                className="bg-white"
                sx={sxEntradaCompactaTaxa}
              />
              <JiffyIconSwitch
                  checked={tributado}
                  onChange={e => setTributado(e.target.checked)}
                  label="Tributado"
                  bordered={false}
                  size="sm"
                  className="shrink-0 items-center justify-end"
                />
                </div>
            </div>
          </div>

          {/* Config. por Terminal — ocupa o restante da altura (modal), rolagem só na lista */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-info md:w-full">
            <div className="shrink-0 border-b border-primary px-4">
              <h2 className="font-exo text-lg font-semibold text-primary">Config. por Terminal</h2>
            </div>

            <div className="shrink-0 border-b border-primary px-2 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 flex-1 font-nunito text-sm font-medium text-primary-text">
                  {selectedTerminalIds.size === 0
                    ? 'Nenhum terminal selecionado'
                    : `${selectedTerminalIds.size} terminal(is) selecionado(s)`}
                </span>
                <div className="flex min-w-0 flex-[1_1_14rem] flex-wrap items-center justify-end gap-2 sm:flex-initial">
                  <div className="relative w-full min-w-[12rem] max-w-sm flex-1 sm:w-60">
                    <MdSearch
                      className="pointer-events-none absolute left-2.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-secondary-text"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={buscaTerminalDraft}
                      onChange={e => setBuscaTerminalDraft(e.target.value)}
                      placeholder="Buscar terminal por nome..."
                      autoComplete="off"
                      className="font-nunito h-8 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                      aria-label="Buscar terminal por nome"
                    />
                  </div>
                  {selectedTerminalIds.size > 0 ? (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="shrink-0 rounded-lg border border-primary/70 bg-primary/10 px-3 py-1.5 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      Limpar seleção
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-1 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
                <div className="grid min-w-[260px] grid-cols-4 gap-x-2 gap-y-1">
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ ativo: true })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Ativar
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ automatico: true })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Automático ON
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ mesa: true })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Mesa ON
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ balcao: true })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Balcão ON
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ ativo: false })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Desativar
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ automatico: false })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Automático OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ mesa: false })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Mesa OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkToSelected({ balcao: false })}
                    disabled={selectedTerminalIds.size === 0}
                    className={BULK_TERMINAL_BTN_CLASS}
                  >
                    Balcão OFF
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-2 hidden shrink-0 rounded-lg bg-custom-2 py-2 md:block">
              <div className={DESKTOP_TAXA_TERMINAL_GRID}>
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-primary bg-info text-primary focus:ring-2 focus:ring-primary"
                    aria-label="Selecionar todos os terminais"
                  />
                </div>
                <div className="min-w-0 font-nunito text-sm font-semibold text-primary-text">
                  Terminal
                </div>
                <div className="flex w-full justify-center">
                  <span className="font-nunito text-center text-xs font-semibold text-primary-text">
                    Ativo
                  </span>
                </div>
                <div className="flex w-full justify-center">
                  <span className="font-nunito text-center text-xs font-semibold text-primary-text">
                    Automático
                  </span>
                </div>
                <div className="flex w-full justify-center">
                  <span className="font-nunito text-center text-xs font-semibold text-primary-text">
                    Mesa
                  </span>
                </div>
                <div className="flex w-full justify-center">
                  <span className="font-nunito text-center text-xs font-semibold text-primary-text">
                    Balcão
                  </span>
                </div>
              </div>
            </div>

            <div
              ref={scrollListaRef}
              className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 pb-2"
            >
              {carregandoTerminais && terminaisLista.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <JiffyLoading />
                </div>
              ) : null}

              {!carregandoTerminais &&
              hasLoadedTerminaisRef.current &&
              terminaisLista.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <MdPhone className="text-secondary-text" size={48} />
                  <p className="text-lg font-semibold text-primary-text">Nenhum terminal cadastrado</p>
                  <p className="max-w-xs text-center text-sm text-secondary-text">
                    Cadastre terminais em Configurações para vincular esta taxa aos PDVs.
                  </p>
                </div>
              ) : null}

              {terminaisLista.map((row, index) => {
                const cfg = porTerminal[row.terminalId] ?? { ...DEFAULT_CFG }
                const isZebraEven = index % 2 === 0
                const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'
                const sel = isTerminalSelected(row.terminalId)

                return (
                  <div key={row.terminalId} className="px-0 md:px-0">
                    <div
                      className={cn(
                        'hidden rounded-lg border border-transparent md:block',
                        bgClass,
                      )}
                    >
                      <div
                        className={cn(
                          DESKTOP_TAXA_TERMINAL_GRID,
                          'py-2 transition-colors hover:bg-primary/10'
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleTerminalSelection(row.terminalId)}
                            className="h-4 w-4 cursor-pointer rounded border-primary bg-info text-primary focus:ring-2 focus:ring-primary"
                            onClick={e => e.stopPropagation()}
                            aria-label={`Selecionar ${row.nome}`}
                          />
                        </div>
                        <div className="font-nunito min-w-0 truncate text-sm text-primary-text">
                          {row.nome}
                        </div>
                        <div className="flex w-full justify-center">
                          <JiffyIconSwitch
                            checked={cfg.ativo}
                            onChange={e => atualizarTerminal(row.terminalId, { ativo: e.target.checked })}
                            size="xs"
                            className="justify-center gap-0 px-0 py-0"
                            inputProps={{ 'aria-label': `Ativo — ${row.nome}` }}
                          />
                        </div>
                        <div className="flex w-full justify-center">
                          <JiffyIconSwitch
                            checked={cfg.automatico}
                            onChange={e =>
                              atualizarTerminal(row.terminalId, { automatico: e.target.checked })
                            }
                            size="xs"
                            className="justify-center gap-0 px-0 py-0"
                            inputProps={{ 'aria-label': `Automático — ${row.nome}` }}
                          />
                        </div>
                        <div className="flex w-full justify-center">
                          <JiffyIconSwitch
                            checked={cfg.mesa}
                            onChange={e => atualizarTerminal(row.terminalId, { mesa: e.target.checked })}
                            size="xs"
                            className="justify-center gap-0 px-0 py-0"
                            inputProps={{ 'aria-label': `Mesa — ${row.nome}` }}
                          />
                        </div>
                        <div className="flex w-full justify-center">
                          <JiffyIconSwitch
                            checked={cfg.balcao}
                            onChange={e =>
                              atualizarTerminal(row.terminalId, { balcao: e.target.checked })
                            }
                            size="xs"
                            className="justify-center gap-0 px-0 py-0"
                            inputProps={{ 'aria-label': `Balcão — ${row.nome}` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div
                      className={cn(
                        'rounded-lg border border-primary/20 p-3 md:hidden',
                        bgClass,
                        sel && 'ring-2 ring-primary'
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleTerminalSelection(row.terminalId)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-primary bg-info text-primary focus:ring-2 focus:ring-primary"
                        />
                        <span className="font-nunito min-w-0 flex-1 truncate text-sm font-medium text-primary-text">
                          {row.nome}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="flex flex-col items-center gap-1">
                          <span className="font-nunito text-[10px] text-secondary-text">Ativo</span>
                          <JiffyIconSwitch
                            checked={cfg.ativo}
                            onChange={e =>
                              atualizarTerminal(row.terminalId, { ativo: e.target.checked })
                            }
                            size="sm"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-1">
                          <span className="font-nunito text-[10px] text-secondary-text">Automático</span>
                          <JiffyIconSwitch
                            checked={cfg.automatico}
                            onChange={e =>
                              atualizarTerminal(row.terminalId, { automatico: e.target.checked })
                            }
                            size="sm"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-1">
                          <span className="font-nunito text-[10px] text-secondary-text">Mesa</span>
                          <JiffyIconSwitch
                            checked={cfg.mesa}
                            onChange={e =>
                              atualizarTerminal(row.terminalId, { mesa: e.target.checked })
                            }
                            size="sm"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-1">
                          <span className="font-nunito text-[10px] text-secondary-text">Balcão</span>
                          <JiffyIconSwitch
                            checked={cfg.balcao}
                            onChange={e =>
                              atualizarTerminal(row.terminalId, { balcao: e.target.checked })
                            }
                            size="sm"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {hideEmbeddedFormActions ? null : (
            <div className="flex shrink-0 justify-end pt-2">
              <Button
                type="submit"
                disabled={enviando || !nome.trim()}
                sx={{ backgroundColor: 'var(--color-primary)' }}
                className="h-8 w-32 text-white hover:bg-primary/80"
              >
                {enviando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
})

NovaTaxa.displayName = 'NovaTaxa'
