'use client'

import {
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import Modal from '@mui/material/Modal'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import { MdClose, MdRestaurant, MdAttachMoney, MdCancel } from 'react-icons/md'
import {
  CircularProgress,
  TextField,
  Button,
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions,
} from '@mui/material'
import { PainelPedidoBackdrop } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { TipoVendaIcon } from './TipoVendaIcon'
import { useCancelarVendaGestor } from '@/src/presentation/hooks/useVendas'
import { StatusFiscalBadge } from '@/src/presentation/components/features/nfe/StatusFiscalBadge'
import {
  abrirDocumentoFiscalPdf,
  tipoDocFiscalFromModelo,
} from '@/src/presentation/utils/abrirDocumentoFiscalPdf'

// Tipos
interface VendaDetalhes {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa' | 'gestor'
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataCancelamento?: string
  dataFinalizacao?: string
  canceladoPorId?: string
  ultimoResponsavelId?: string
  statusMesa?: string
  clienteId?: string
  identificacao?: string
  troco?: number
  produtosLancados: ProdutoLancado[]
  /** Taxas aplicadas na venda (ex.: serviço, couvert) — exibidas após os produtos. */
  taxasLancadas?: TaxaLancada[]
  /** Desconto / acréscimo sobre o total da venda (além do item). */
  totalDesconto?: number
  totalAcrescimo?: number
  tipoDesconto?: string | null
  valorDesconto?: number | null
  tipoAcrescimo?: string | null
  valorAcrescimo?: number | null
  pagamentos: Pagamento[]
  // Campos fiscais
  statusVenda?: string | null
  origem?: string | null
  solicitarEmissaoFiscal?: boolean | null
  statusFiscal?: string | null
  documentoFiscalId?: string | null
  retornoSefaz?: string | null
  /** Objeto na raiz do JSON (`resumoFiscal`) — detalhes consolidados para a aba Fiscal. */
  resumoFiscal?: ResumoFiscal | null
}

/** Grupo `resumoFiscal` na raiz da API de detalhes da venda. */
interface ResumoFiscal {
  id: string
  chaveFiscal: string | null
  codigoRetorno: string | null
  terminalId: string | null
  dataCriacao: string | null
  dataEmissao: string | null
  dataUltimaModificacao: string | null
  documentoFiscalId: string | null
  empresaId: string | null
  modelo: number | null
  numero: string | number | null
  retornoSefaz: string | null
  serie: string | number | null
  status: string | null
  vendaId: string | null
}

interface TaxaLancada {
  id: string
  vendaId?: string
  taxaId?: string
  nome: string
  tipo: string
  valor: number
  quantidade: number
  valorCalculado: number
  lancadoAutomatico?: boolean
  lancadoPorId?: string
  removidoPorId?: string
  dataLancamento?: string
  dataRemocao?: string
}

interface ProdutoLancado {
  id?: string
  nomeProduto: string
  quantidade: number
  valorUnitario: number
  /** Quando true, indica que houve incidência de taxa sobre o item (útil para contexto com `taxasLancadas`). */
  incidiuTaxa?: boolean
  desconto?: string | number
  tipoDesconto?: 'porcentagem' | 'fixo'
  acrescimo?: string | number
  tipoAcrescimo?: 'porcentagem' | 'fixo'
  complementos: Complemento[]
  dataLancamento: string
  lancadoPorId: string
  vendaId: string
  removido: boolean
  removidoPorId?: string
  dataRemocao?: string
}

interface Complemento {
  nomeComplemento: string
  quantidade: number
  valorUnitario: number
  tipoImpactoPreco: 'aumenta' | 'diminui' | 'nenhum'
}

interface Pagamento {
  meioPagamentoId: string
  valor: number
  dataCriacao: string
  realizadoPorId: string
  canceladoPorId?: string
  cancelado: boolean
  dataCancelamento?: string
  isTefUsed?: boolean // Adicionado
  isTefConfirmed?: boolean // Adicionado
}

interface MeioPagamentoDetalhes {
  id: string
  nome: string
  formaPagamentoFiscal?: string
}

interface UsuarioPDVDetalhes {
  id: string
  nome: string
}

interface ClienteDetalhes {
  id: string
  nome: string
}

interface DetalhesVendasProps {
  vendaId: string
  open: boolean
  onClose: () => void
  /** Chamado após o painel terminar de deslizar para fora — use para limpar `vendaId` no pai sem cortar a animação. */
  onAfterClose?: () => void
  tabelaOrigem?: 'venda' | 'venda_gestor' // Indica de qual tabela buscar
}

/** Mesmos tempos do `JiffySidePanelModal` — entrada/saída pela direita. */
const PANEL_MS_DETALHES = { enter: 420, exit: 380 } as const

const DetalhesVendasPainelSlide = forwardRef(function DetalhesVendasPainelSlide(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide ref={ref} direction="left" {...props} />
})
DetalhesVendasPainelSlide.displayName = 'DetalhesVendasPainelSlide'

/** Igual ao `panelClassName` padrão do `JiffySidePanelModal` — largura estável ao abrir (loading ou com dados). */
const CLASSE_LARGURA_PAINEL_DETALHES_VENDA =
  'w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]'

/**
 * Indica se o tipo na raiz da venda deve exibir linha de desconto/acréscimo.
 * Ignora vazio e placeholder típico de contratos OpenAPI (`"string"`).
 */
function tipoAjusteVendaInformado(tipo: unknown): boolean {
  if (tipo == null) return false
  const s = String(tipo).trim()
  if (s.length === 0) return false
  if (s.toLowerCase() === 'string') return false
  return true
}

/** Taxa/ajuste percentual no contrato (ex.: "percentual", "porcentagem"). */
function tipoEhPercentual(tipo: unknown): boolean {
  const t = String(tipo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    t === 'percentual' ||
    t === 'porcentagem' ||
    t === 'percentage' ||
    t.includes('percent')
  )
}

/**
 * Sufixo do título "Desconto/Acréscimo na venda": `(20%)` se percentual (valor em decimal),
 * `(2,00)` se fixo — alinhado ao contrato da raiz da venda.
 */
function sufixoTituloAjusteVenda(tipo: unknown, valorConfigRaw: unknown): string {
  if (valorConfigRaw == null || valorConfigRaw === '') return ''
  const v =
    typeof valorConfigRaw === 'number'
      ? valorConfigRaw
      : Number(String(valorConfigRaw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(v)) return ''

  if (tipoEhPercentual(tipo)) {
    // Contrato pode enviar taxa como decimal (0,2 → 20%) ou pontos percentuais (20 → 20%).
    const pct = v >= 0 && v <= 1 ? Math.round(v * 100) : Math.round(v)
    return ` (${pct}%)`
  }
  return ` (${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)})`
}

/** Converte taxa percentual do contrato (0,2 ou 20) em multiplicador sobre a base. */
function multiplicadorPercentualContrato(valorArmazenado: number): number {
  if (!Number.isFinite(valorArmazenado) || valorArmazenado < 0) return 0
  return valorArmazenado <= 1 ? valorArmazenado : valorArmazenado / 100
}

/** Lê número de configuração de desconto/acréscimo na raiz da venda. */
function lerNumeroConfigAjusteVenda(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n =
    typeof raw === 'number' ? raw : Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Lê número finito na raiz do JSON (camelCase do contrato + fallback PascalCase). */
function lerNumeroCampoVendaRaiz(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    const v = raw[key]
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return 0
}

/** Normaliza desconto/acréscimo no total da venda a partir dos campos na raiz do JSON. */
function extrairAjustesTotaisVendaDaApi(dataRaw: Record<string, unknown>): {
  totalDesconto: number
  totalAcrescimo: number
  valorDesconto: number
  valorAcrescimo: number
  tipoDesconto: string | null
  tipoAcrescimo: string | null
} {
  const totalDesconto = lerNumeroCampoVendaRaiz(
    dataRaw,
    'totalDesconto',
    'TotalDesconto',
    'total_desconto'
  )
  const totalAcrescimo = lerNumeroCampoVendaRaiz(
    dataRaw,
    'totalAcrescimo',
    'TotalAcrescimo',
    'total_acrescimo'
  )
  const valorDesconto = lerNumeroCampoVendaRaiz(
    dataRaw,
    'valorDesconto',
    'ValorDesconto',
    'valor_desconto'
  )
  const valorAcrescimo = lerNumeroCampoVendaRaiz(
    dataRaw,
    'valorAcrescimo',
    'ValorAcrescimo',
    'valor_acrescimo'
  )

  const td = dataRaw.tipoDesconto ?? dataRaw.TipoDesconto ?? dataRaw.tipo_desconto
  const ta = dataRaw.tipoAcrescimo ?? dataRaw.TipoAcrescimo ?? dataRaw.tipo_acrescimo

  return {
    totalDesconto,
    totalAcrescimo,
    valorDesconto,
    valorAcrescimo,
    tipoDesconto: tipoAjusteVendaInformado(td) ? String(td).trim() : null,
    tipoAcrescimo: tipoAjusteVendaInformado(ta) ? String(ta).trim() : null,
  }
}

/**
 * Valor na raiz do JSON já calculado pelo backend: só é válido para uso se > 0.
 */
function valorRaizPositivo(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n =
    typeof raw === 'number'
      ? raw
      : Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Texto para exibição quando o campo fiscal é nulo ou vazio. */
function textoCampoFiscal(raw: unknown): string {
  if (raw == null || raw === '') return '—'
  return String(raw).trim() || '—'
}

/** Normaliza `resumoFiscal` da API — ausente ou inválido retorna `undefined`. */
function normalizarResumoFiscal(raw: unknown): ResumoFiscal | undefined {
  if (raw == null) return undefined
  // Algumas APIs enviam lista com um único resumo
  if (Array.isArray(raw)) {
    const primeiro = raw.find(item => item != null && typeof item === 'object')
    return primeiro ? normalizarResumoFiscal(primeiro) : undefined
  }
  if (typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>

  const str = (key: string): string | null => {
    const v = r[key]
    if (v == null || v === '') return null
    return String(v).trim()
  }

  const numOrNull = (key: string): number | null => {
    const v = r[key]
    if (v == null || v === '') return null
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }

  const numeroSerieRaw = r.numero ?? r.Numero
  const serieRaw = r.serie ?? r.Serie

  const id = str('id') ?? str('Id')
  if (!id) return undefined

  return {
    id,
    chaveFiscal: str('chaveFiscal') ?? str('ChaveFiscal'),
    codigoRetorno: str('codigoRetorno') ?? str('CodigoRetorno'),
    terminalId: str('terminalId') ?? str('TerminalId'),
    dataCriacao: str('dataCriacao') ?? str('DataCriacao'),
    dataEmissao: str('dataEmissao') ?? str('DataEmissao'),
    dataUltimaModificacao:
      str('dataUltimaModificacao') ?? str('DataUltimaModificacao'),
    documentoFiscalId: str('documentoFiscalId') ?? str('DocumentoFiscalId'),
    empresaId: str('empresaId') ?? str('EmpresaId'),
    modelo: numOrNull('modelo') ?? numOrNull('Modelo'),
    numero:
      numeroSerieRaw != null && numeroSerieRaw !== ''
        ? typeof numeroSerieRaw === 'number'
          ? numeroSerieRaw
          : String(numeroSerieRaw)
        : null,
    retornoSefaz: str('retornoSefaz') ?? str('RetornoSefaz'),
    serie:
      serieRaw != null && serieRaw !== ''
        ? typeof serieRaw === 'number'
          ? serieRaw
          : String(serieRaw)
        : null,
    status: str('status') ?? str('Status'),
    vendaId: str('vendaId') ?? str('VendaId'),
  }
}

/** PDF DANFE/DANFCE só após autorização — mesmo critério do NovoPedidoModal / Kanban. */
function statusFiscalEhEmitida(
  resumoStatus: string | null | undefined,
  statusNaVenda: string | null | undefined
): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusNaVenda != null ? String(statusNaVenda).trim() : ''
  const s = (r !== '' ? r : u).toUpperCase()
  return s === 'EMITIDA'
}

/** Indica se há dados para exibir a aba Fiscal (objeto não vazio na raiz ou normalizado). */
function vendaPossuiResumoFiscalParaAba(v: VendaDetalhes | null): boolean {
  const rf = v?.resumoFiscal as unknown
  if (rf == null) return false
  if (Array.isArray(rf)) return rf.some(x => x != null && typeof x === 'object')
  if (typeof rf !== 'object') return false
  const o = rf as Record<string, unknown>
  return Object.keys(o).length > 0
}

/** Nome do terminal a partir do GET `/api/terminais/[id]/detalhes`. */
function nomeTerminalDeDetalhesApi(data: Record<string, unknown>): string | null {
  const raw =
    data.nome ??
    data.descricao ??
    data.codigoInterno ??
    data.codigo ??
    data.codigoTerminal ??
    data.code
  if (raw != null && String(raw).trim()) return String(raw).trim()
  return null
}

/** Nome da empresa a partir do GET `/api/empresas/[id]`. */
function nomeEmpresaDeApi(data: Record<string, unknown>): string | null {
  const raw = data.nome ?? data.razaoSocial ?? data.nomeFantasia ?? data.name
  if (raw != null && String(raw).trim()) return String(raw).trim()
  return null
}

/** Busca nome amigável do terminal para a aba Fiscal. */
async function buscarNomeTerminalParaResumoFiscal(
  token: string,
  terminalId: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/terminais/${encodeURIComponent(terminalId)}/detalhes`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const d = (await res.json()) as Record<string, unknown>
    return nomeTerminalDeDetalhesApi(d)
  } catch {
    return null
  }
}

/** Busca nome amigável da empresa para a aba Fiscal. */
async function buscarNomeEmpresaParaResumoFiscal(
  token: string,
  empresaId: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/empresas/${encodeURIComponent(empresaId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const d = (await res.json()) as Record<string, unknown>
    return nomeEmpresaDeApi(d)
  } catch {
    return null
  }
}

/**
 * Modal de detalhes da venda
 * Exibe informações completas da venda, produtos lançados e pagamentos
 */
export function DetalhesVendas({
  vendaId,
  open,
  onClose,
  onAfterClose,
  tabelaOrigem = 'venda',
}: DetalhesVendasProps) {
  const { auth } = useAuthStore()
  const [venda, setVenda] = useState<VendaDetalhes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({})
  const [nomesMeiosPagamento, setNomesMeiosPagamento] = useState<
    Record<string, MeioPagamentoDetalhes>
  >({})
  const [nomeCliente, setNomeCliente] = useState<string | null>(null)
  /** Nomes resolvidos via API para a aba Fiscal (`resumoFiscal`). */
  const [nomeTerminalResumoFiscal, setNomeTerminalResumoFiscal] = useState<string | null>(null)
  const [nomeEmpresaResumoFiscal, setNomeEmpresaResumoFiscal] = useState<string | null>(null)

  /** Aba ativa quando há `resumoFiscal`: 0 = Informações da Venda, 1 = Fiscal. */
  const [painelTabDetalhes, setPainelTabDetalhes] = useState(0)

  // Estados para modal de cancelamento
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const cancelarVenda = useCancelarVendaGestor()

  /** Mantém o `Modal` montado até o fim do slide de saída (igual ao `JiffySidePanelModal`). */
  const [internalOpen, setInternalOpen] = useState(open)

  useEffect(() => {
    if (open) setInternalOpen(true)
  }, [open])

  useEffect(() => {
    if (open) setPainelTabDetalhes(0)
  }, [open, vendaId])

  const handleSlideExited = useCallback(() => {
    setInternalOpen(false)
    onAfterClose?.()
  }, [onAfterClose])

  const handlePainelBackdropClose = useCallback(
    (_: object, reason: 'backdropClick' | 'escapeKeyDown') => {
      onClose()
    },
    [onClose]
  )

  /**
   * Formata valor como moeda brasileira
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  /**
   * Formata valor numérico sem símbolo de moeda (para uso entre parênteses)
   */
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  /**
   * Formata data/hora para exibição
   */
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Busca nome de usuário PDV
   */
  const fetchUsuarioNome = useCallback(
    async (usuarioId: string): Promise<string | null> => {
      const token = auth?.getAccessToken()
      if (!token) return null

      try {
        // Usa endpoint diferente dependendo da origem da venda
        const endpoint =
          tabelaOrigem === 'venda_gestor'
            ? `/api/pessoas/usuarios-gestor/${usuarioId}`
            : `/api/usuarios/${usuarioId}`

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return null

        const data = await response.json()
        return data.nome || data.name || null
      } catch (error) {
        console.error('Erro ao buscar nome do usuário:', error)
        return null
      }
    },
    [auth, tabelaOrigem]
  )

  /**
   * Busca detalhes do meio de pagamento
   */
  const fetchMeioPagamento = useCallback(
    async (meioId: string): Promise<MeioPagamentoDetalhes | null> => {
      const token = auth?.getAccessToken()
      if (!token) return null

      try {
        const response = await fetch(`/api/meios-pagamentos/${meioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return null

        const data = await response.json()
        const meio: MeioPagamentoDetalhes = {
          id: meioId,
          nome: data.nome || data.name || 'Sem nome',
          formaPagamentoFiscal: data.formaPagamentoFiscal || data.formaPagamento || '',
        }
        return meio
      } catch (error) {
        console.error('Erro ao buscar meio de pagamento:', error)
        return null
      }
    },
    [auth]
  )

  /**
   * Busca nome do cliente
   */
  const fetchClienteNome = useCallback(
    async (clienteId: string): Promise<string | null> => {
      const token = auth?.getAccessToken()
      if (!token) return null

      try {
        const response = await fetch(`/api/clientes/${clienteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return null

        const data = await response.json()
        return data.nome || data.name || null
      } catch (error) {
        console.error('Erro ao buscar nome do cliente:', error)
        return null
      }
    },
    [auth]
  )

  /**
   * Calcula valor total de um complemento
   */
  const calcularValorComplemento = useCallback((complemento: Complemento): number => {
    return complemento.valorUnitario * complemento.quantidade
  }, [])

  /**
   * Calcula valor total de um produto com descontos e acréscimos
   * NOTA: Não inclui complementos no cálculo - eles são exibidos separadamente
   * IMPORTANTE: O banco salva porcentagens como decimal (0.1 = 10%), não precisa dividir por 100
   */
  const calcularValorProduto = useCallback((produto: ProdutoLancado): number => {
    let valor = produto.valorUnitario * produto.quantidade

    // Aplica desconto
    if (produto.desconto) {
      const descontoValue =
        typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto
      if (produto.tipoDesconto === 'porcentagem') {
        // O banco salva porcentagem como decimal (0.1 = 10%), então usa diretamente
        valor -= valor * descontoValue
      } else {
        // Desconto fixo: subtrai o valor diretamente
        valor -= descontoValue
      }
    }

    // Aplica acréscimo
    if (produto.acrescimo) {
      const acrescimoValue =
        typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo
      if (produto.tipoAcrescimo === 'porcentagem') {
        // O banco salva porcentagem como decimal (0.1 = 10%), então usa diretamente
        valor += valor * acrescimoValue
      } else {
        // Acréscimo fixo: adiciona o valor diretamente
        valor += acrescimoValue
      }
    }

    // Complementos NÃO são incluídos aqui - são exibidos separadamente abaixo do valor do produto

    return valor
  }, [])

  /**
   * Base do item para o resumo financeiro: unitário × quantidade, sem desconto/acréscimo do produto.
   * Complementos são somados separadamente no resumo (mesma regra de impacto de preço).
   */
  const calcularValorBaseProdutoResumo = useCallback((produto: ProdutoLancado): number => {
    return produto.valorUnitario * produto.quantidade
  }, [])

  /**
   * Busca detalhes da venda
   */
  const fetchVendaDetalhes = useCallback(async () => {
    if (!vendaId || !open) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Usuário não autenticado.')
      onClose() // Fecha o modal se não houver token
      return
    }

    setIsLoading(true)
    setVenda(null) // Limpa venda anterior para evitar exibição de dados antigos durante o carregamento
    setNomeCliente(null) // Limpa cliente anterior
    setNomeTerminalResumoFiscal(null)
    setNomeEmpresaResumoFiscal(null)
    setNomesUsuarios({}) // Limpa usuários anteriores
    setNomesMeiosPagamento({}) // Limpa meios de pagamento anteriores

    try {
      // API exige `incluirFiscal=true` para trazer `resumoFiscal` no JSON (padrão do contrato: false)
      const queryFiscal = new URLSearchParams({ incluirFiscal: 'true' }).toString()
      const endpointBase =
        tabelaOrigem === 'venda_gestor' ? `/api/vendas/gestor/${vendaId}` : `/api/vendas/${vendaId}`
      const endpoint = `${endpointBase}?${queryFiscal}`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar detalhes da venda')
      }

      const dataRaw = await response.json()

      // Busca status fiscal atualizado para exibir motivo de rejeição no modal
      let statusFiscal = dataRaw.statusFiscal ?? null
      let documentoFiscalId = dataRaw.documentoFiscalId ?? null
      let retornoSefaz = dataRaw.retornoSefaz ?? null

      // Venda do gestor não possui terminal no modelo atual.
      // Evita warning falso-positivo e tentativa de lookup desnecessária.
      let codigoTerminal = ''
      if (tabelaOrigem === 'venda') {
        // Mapeia os dados da API para o formato esperado, garantindo que campos sejam capturados corretamente
        // Verifica diferentes possíveis estruturas do codigoTerminal na resposta da API
        codigoTerminal =
          dataRaw.codigoTerminal ||
          dataRaw.terminal?.codigo ||
          dataRaw.terminal?.codigoInterno ||
          dataRaw.terminal?.codigoTerminal ||
          dataRaw.terminal?.code ||
          dataRaw.terminalCodigo ||
          dataRaw.codigoInterno ||
          dataRaw.codigo ||
          dataRaw.code ||
          ''
      }

      // Se não encontrou o codigoTerminal e temos terminalId, busca os detalhes do terminal
      if (tabelaOrigem === 'venda' && !codigoTerminal && dataRaw.terminalId) {
        try {
          const terminalResponse = await fetch(`/api/terminais/${dataRaw.terminalId}/detalhes`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (terminalResponse.ok) {
            const terminalData = await terminalResponse.json()
            codigoTerminal =
              terminalData.codigo ||
              terminalData.codigoInterno ||
              terminalData.codigoTerminal ||
              terminalData.code ||
              String(dataRaw.terminalId) ||
              ''
          }
        } catch (error) {
          console.warn('Erro ao buscar código do terminal:', error)
          // Fallback: usa o terminalId como código se não conseguir buscar
          codigoTerminal = String(dataRaw.terminalId)
        }
      }

      // Se ainda não tem código, usa terminalId como fallback
      if (tabelaOrigem === 'venda' && !codigoTerminal && dataRaw.terminalId) {
        codigoTerminal = String(dataRaw.terminalId)
      }

      // Mapeia produtos lançados garantindo prioridade para os campos "valor*",
      // pois em algumas vendas abertas o backend envia desconto/acréscimo como 0
      // e o valor real em valorDesconto/valorAcrescimo.
      const parseNumberOrNull = (value: unknown): number | null => {
        if (value === null || value === undefined || value === '') return null
        const parsed = typeof value === 'number' ? value : Number(value)
        return Number.isNaN(parsed) ? null : parsed
      }

      const pickModifierValue = (
        preferredRaw: unknown,
        fallbackRaw: unknown
      ): number | undefined => {
        const preferred = parseNumberOrNull(preferredRaw)
        const fallback = parseNumberOrNull(fallbackRaw)

        // Regra: se preferred veio zerado e fallback tem valor > 0, usa fallback.
        if (preferred !== null && preferred > 0) return preferred
        if (fallback !== null && fallback > 0) return fallback
        if (preferred !== null) return preferred
        if (fallback !== null) return fallback
        return undefined
      }

      const produtosLancadosMapeados = (dataRaw.produtosLancados || dataRaw.produtos || []).map(
        (produto: any) => ({
          ...produto,
          desconto: pickModifierValue(
            produto.valorDesconto ?? produto.descontoValor ?? produto.valorDescontoProduto,
            produto.desconto
          ),
          tipoDesconto:
            produto.tipoDesconto ??
            produto.tipoDescontoValor ??
            produto.tipoDescontoProduto ??
            undefined,
          acrescimo: pickModifierValue(
            produto.valorAcrescimo ?? produto.acrescimoValor ?? produto.valorAcrescimoProduto,
            produto.acrescimo
          ),
          tipoAcrescimo:
            produto.tipoAcrescimo ??
            produto.tipoAcrescimoValor ??
            produto.tipoAcrescimoProduto ??
            undefined,
        })
      )

      const taxasLancadasNormalizadas: TaxaLancada[] = Array.isArray(dataRaw.taxasLancadas)
        ? dataRaw.taxasLancadas.map((t: Record<string, unknown>, idx: number) => ({
            id: String(t.id ?? `taxa-${idx}`),
            vendaId: t.vendaId != null ? String(t.vendaId) : undefined,
            taxaId: t.taxaId != null ? String(t.taxaId) : undefined,
            nome: String(t.nome ?? 'Taxa'),
            tipo: String(t.tipo ?? '—'),
            valor: Number(t.valor) || 0,
            quantidade: Number(t.quantidade) || 0,
            valorCalculado: Number(t.valorCalculado) || 0,
            lancadoAutomatico: Boolean(t.lancadoAutomatico),
            lancadoPorId: t.lancadoPorId != null ? String(t.lancadoPorId) : undefined,
            removidoPorId: t.removidoPorId != null ? String(t.removidoPorId) : undefined,
            dataLancamento: t.dataLancamento != null ? String(t.dataLancamento) : undefined,
            dataRemocao: t.dataRemocao != null ? String(t.dataRemocao) : undefined,
          }))
        : []

      const ajusteVendaApi = extrairAjustesTotaisVendaDaApi(dataRaw as Record<string, unknown>)
      const rawRecord = dataRaw as Record<string, unknown>
      const rawResumoFiscal =
        rawRecord.resumoFiscal ?? rawRecord.ResumoFiscal ?? rawRecord.resumo_fiscal
      const resumoFiscalNorm = normalizarResumoFiscal(rawResumoFiscal)

      const data: VendaDetalhes = {
        ...dataRaw,
        codigoTerminal: codigoTerminal,
        statusFiscal,
        documentoFiscalId,
        retornoSefaz,
        produtosLancados: produtosLancadosMapeados,
        taxasLancadas: taxasLancadasNormalizadas,
        totalDesconto: ajusteVendaApi.totalDesconto,
        totalAcrescimo: ajusteVendaApi.totalAcrescimo,
        valorDesconto: ajusteVendaApi.valorDesconto,
        valorAcrescimo: ajusteVendaApi.valorAcrescimo,
        tipoDesconto: ajusteVendaApi.tipoDesconto,
        tipoAcrescimo: ajusteVendaApi.tipoAcrescimo,
        // Só sobrescreve quando a normalização funciona; senão mantém `resumoFiscal` do `...dataRaw`
        ...(resumoFiscalNorm != null ? { resumoFiscal: resumoFiscalNorm } : {}),
      }

      // Debug: log para verificar se o campo está sendo capturado
      if (typeof window !== 'undefined' && tabelaOrigem === 'venda' && !codigoTerminal) {
        if (!codigoTerminal) {
          console.warn('DetalhesVendas: codigoTerminal não encontrado na resposta da API', {
            vendaId,
            dataRaw,
            terminal: dataRaw.terminal,
            terminalId: dataRaw.terminalId,
          })
        }
        // Debug: verifica produtos com desconto/acréscimo
        const produtosComModificacao = produtosLancadosMapeados.filter(
          (p: any) => (p.desconto && p.desconto > 0) || (p.acrescimo && p.acrescimo > 0)
        )
        if (produtosComModificacao.length > 0) {
          console.log(
            'DetalhesVendas: Produtos com desconto/acréscimo encontrados:',
            produtosComModificacao
          )
        } else {
          console.log(
            'DetalhesVendas: Nenhum produto com desconto/acréscimo encontrado. Produtos:',
            produtosLancadosMapeados
          )
        }
      }

      setVenda(data)

      const rfOpt = data.resumoFiscal as ResumoFiscal | undefined | null
      const terminalIdResumo = rfOpt?.terminalId?.trim() || null
      const empresaIdResumo = rfOpt?.empresaId?.trim() || null

      // Coleta todos os IDs de usuários únicos que precisam ser buscados
      const userIdsToFetch = new Set<string>()
      if (data.abertoPorId) userIdsToFetch.add(data.abertoPorId)
      if (data.canceladoPorId) userIdsToFetch.add(data.canceladoPorId)
      if (data.ultimoResponsavelId) userIdsToFetch.add(data.ultimoResponsavelId)
      data.produtosLancados?.forEach(p => {
        if (p.lancadoPorId) userIdsToFetch.add(p.lancadoPorId)
        if (p.removidoPorId) userIdsToFetch.add(p.removidoPorId)
      })
      data.pagamentos?.forEach(p => {
        if (p.realizadoPorId) userIdsToFetch.add(p.realizadoPorId)
        if (p.canceladoPorId) userIdsToFetch.add(p.canceladoPorId)
      })
      data.taxasLancadas?.forEach(t => {
        if (t.lancadoPorId) userIdsToFetch.add(t.lancadoPorId)
        if (t.removidoPorId) userIdsToFetch.add(t.removidoPorId)
      })

      // Coleta todos os IDs de meios de pagamento únicos que precisam ser buscados
      const meioIdsToFetch = new Set<string>()
      data.pagamentos?.forEach(p => {
        if (p.meioPagamentoId) meioIdsToFetch.add(p.meioPagamentoId)
      })

      // Executa todas as buscas de dados auxiliares em paralelo (inclui terminal/empresa para aba Fiscal)
      const [userNamesResolved, meioPagamentoResolved, clienteNomeResult, nomeTerminalRf, nomeEmpresaRf] =
        await Promise.all([
          Promise.all(Array.from(userIdsToFetch).map(id => fetchUsuarioNome(id))),
          Promise.all(Array.from(meioIdsToFetch).map(id => fetchMeioPagamento(id))),
          data.clienteId ? fetchClienteNome(data.clienteId) : Promise.resolve(null),
          terminalIdResumo
            ? buscarNomeTerminalParaResumoFiscal(token, terminalIdResumo)
            : Promise.resolve(null),
          empresaIdResumo
            ? buscarNomeEmpresaParaResumoFiscal(token, empresaIdResumo)
            : Promise.resolve(null),
        ])

      // Constrói e atualiza o estado de nomes de usuários
      const finalNomesUsuarios: Record<string, string> = {}
      Array.from(userIdsToFetch).forEach((id, index) => {
        const nome = userNamesResolved[index]
        if (nome) {
          finalNomesUsuarios[id] = nome
        }
      })
      setNomesUsuarios(finalNomesUsuarios)

      // Constrói e atualiza o estado de meios de pagamento
      const finalNomesMeiosPagamento: Record<string, MeioPagamentoDetalhes> = {}
      Array.from(meioIdsToFetch).forEach((id, index) => {
        const meio = meioPagamentoResolved[index]
        if (meio) {
          finalNomesMeiosPagamento[id] = meio
        }
      })
      setNomesMeiosPagamento(finalNomesMeiosPagamento)

      if (clienteNomeResult) {
        setNomeCliente(clienteNomeResult)
      }

      setNomeTerminalResumoFiscal(nomeTerminalRf)
      setNomeEmpresaResumoFiscal(nomeEmpresaRf)
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error)
      showToast.error('Erro ao buscar detalhes da venda')
      setNomeTerminalResumoFiscal(null)
      setNomeEmpresaResumoFiscal(null)
      setVenda(null) // Garante que a venda é limpa em caso de erro
      onClose() // Fecha o modal em caso de erro grave para evitar loop infinito
    } finally {
      setIsLoading(false)
    }
  }, [
    vendaId,
    open,
    auth,
    fetchUsuarioNome,
    fetchMeioPagamento,
    fetchClienteNome,
    onClose,
    tabelaOrigem,
  ])

  /**
   * Confirma cancelamento da venda
   */
  const handleConfirmarCancelamento = async () => {
    if (!venda) return

    if (justificativa.trim().length < 15) {
      showToast.error('Justificativa deve ter no mínimo 15 caracteres')
      return
    }

    try {
      await cancelarVenda.mutateAsync({
        id: venda.id,
        motivo: justificativa.trim(),
      })

      setIsCancelarModalOpen(false)
      setJustificativa('')
      onClose() // Fecha o modal de detalhes após cancelamento bem-sucedido
    } catch (error) {
      // Erro já tratado pelo hook
      console.error('Erro ao cancelar venda:', error)
    }
  }

  useEffect(() => {
    if (open && vendaId) {
      fetchVendaDetalhes()
    }
  }, [open, vendaId, fetchVendaDetalhes])

  // Após o slide fechar (`internalOpen` false), libera dados — evita sumir o conteúdo durante a animação
  useEffect(() => {
    if (!internalOpen) {
      setVenda(null)
      setNomeCliente(null)
      setNomeTerminalResumoFiscal(null)
      setNomeEmpresaResumoFiscal(null)
      setNomesUsuarios({})
      setNomesMeiosPagamento({})
      setIsCancelarModalOpen(false)
      setJustificativa('')
    }
  }, [internalOpen])

  /**
   * Resumo financeiro alinhado ao cupom:
   * A = soma (base do produto sem desc./acrésc. do item + complementos) para todas as linhas
   * Itens cancelados = mesma base + complementos nas linhas removidas ou em venda cancelada
   * Itens líquidos = A − cancelados; B = taxas; C/D = totalAcrescimo/totalDesconto (raiz); E = líquido + B + C − D
   */
  const resumoFinanceiro = useMemo(() => {
    if (!venda) {
      return {
        totalItensLancados: 0,
        totalItensCancelados: 0,
        totalItensEfetivos: 0,
        totalTaxas: 0,
        totalAcrescimoVenda: 0,
        totalDescontoVenda: 0,
        totalResumo: 0,
      }
    }

    const isVendaCancelada = !!venda.canceladoPorId
    const produtos = venda.produtosLancados ?? []

    let totalItensLancados = 0
    let totalItensCancelados = 0

    produtos.forEach(produto => {
      const valorTotalProduto = calcularValorBaseProdutoResumo(produto)

      let valorComplementos = 0
      if (produto.complementos && produto.complementos.length > 0) {
        produto.complementos.forEach(complemento => {
          if (complemento.tipoImpactoPreco === 'aumenta') {
            valorComplementos += calcularValorComplemento(complemento)
          } else if (complemento.tipoImpactoPreco === 'diminui') {
            valorComplementos -= calcularValorComplemento(complemento)
          }
        })
      }

      const valorTotalComComplementos = valorTotalProduto + valorComplementos

      // Sempre entra no total “lançado” (histórico completo)
      totalItensLancados += valorTotalComComplementos

      // Venda cancelada: tudo conta como cancelado; senão, só linhas removidas
      if (isVendaCancelada || produto.removido) {
        totalItensCancelados += valorTotalComComplementos
      }
    })

    const totalItensEfetivos = totalItensLancados - totalItensCancelados

    const totalTaxas = (venda.taxasLancadas ?? []).reduce((acc, taxa) => {
      const removida = Boolean(taxa.dataRemocao?.trim())
      if (removida) return acc
      return acc + (Number(taxa.valorCalculado) || 0)
    }, 0)

    // C e D: apenas campos total* da raiz (backend), sem recálculo — só entram se > 0
    const totalAcrescimoVenda = valorRaizPositivo(venda.totalAcrescimo) ?? 0
    const totalDescontoVenda = valorRaizPositivo(venda.totalDesconto) ?? 0

    const totalResumo = totalItensEfetivos + totalTaxas + totalAcrescimoVenda - totalDescontoVenda

    return {
      totalItensLancados,
      totalItensCancelados,
      totalItensEfetivos,
      totalTaxas,
      totalAcrescimoVenda,
      totalDescontoVenda,
      totalResumo,
    }
  }, [venda, calcularValorBaseProdutoResumo, calcularValorComplemento])

  /**
   * Calcula o troco baseado nos pagamentos válidos
   * Exclui pagamentos cancelados e pagamentos com isTefConfirmed: false
   * IMPORTANTE: Este hook deve ser chamado ANTES de qualquer return condicional
   */
  const trocoCalculado = useMemo(() => {
    if (!venda || !venda.pagamentos || venda.pagamentos.length === 0) {
      return 0
    }

    // Filtra pagamentos válidos (mesma lógica do filtro de exibição)
    const pagamentosValidos = venda.pagamentos.filter(p => {
      // Exclui pagamentos cancelados
      const isCancelado =
        p.cancelado === true || (p.dataCancelamento !== null && p.dataCancelamento !== undefined)

      // Verifica se o pagamento usa TEF e se está confirmado
      const usaTef = p.isTefUsed === true
      if (usaTef) {
        const tefConfirmado = p.isTefConfirmed === true
        if (!tefConfirmado) {
          return false // Exclui pagamentos TEF não confirmados
        }
      }

      return !isCancelado // Apenas pagamentos não cancelados e (não usa TEF ou TEF confirmado)
    })

    // Soma o total pago pelos pagamentos válidos
    const totalPago = pagamentosValidos.reduce((sum, pagamento) => sum + pagamento.valor, 0)

    // Calcula o troco: total pago - total da venda
    // Se der negativo, troco = 0 (não pode haver troco negativo)
    const troco = Math.max(0, totalPago - venda.valorFinal)

    return troco
  }, [venda])

  /**
   * Total da venda exibido no modal: sempre o campo `valorFinal` retornado pelo backend.
   */
  const totalVendaCalculado = useMemo(() => {
    return venda?.valorFinal ?? 0
  }, [venda])

  /**
   * Base para % de desconto/acréscimo na venda: soma de todas as linhas — total do item (já com
   * desconto/acréscimo do produto) + complementos que alteram preço.
   */
  const subtotalLinhasParaAjustePercentual = useMemo(() => {
    if (!venda?.produtosLancados?.length) return 0
    let soma = 0
    for (const produto of venda.produtosLancados) {
      let valorComplementos = 0
      if (produto.complementos && produto.complementos.length > 0) {
        produto.complementos.forEach(complemento => {
          if (complemento.tipoImpactoPreco === 'aumenta') {
            valorComplementos += calcularValorComplemento(complemento)
          } else if (complemento.tipoImpactoPreco === 'diminui') {
            valorComplementos -= calcularValorComplemento(complemento)
          }
        })
      }
      soma += calcularValorProduto(produto) + valorComplementos
    }
    return soma
  }, [venda, calcularValorProduto, calcularValorComplemento])

  /**
   * Acréscimo/desconto na venda: tipo fixo usa valor monetário da raiz (backend); tipo percentual
   * exibe o valor em R$ calculado sobre a soma dos totais das linhas (subtotalLinhasParaAjustePercentual).
   */
  const ajustesTotaisVenda = useMemo(() => {
    if (!venda) {
      return {
        mostrarSecao: false,
        temDesconto: false,
        temAcrescimo: false,
        valorDescontoExibir: null as number | null,
        valorAcrescimoExibir: null as number | null,
      }
    }

    const base = subtotalLinhasParaAjustePercentual

    let valorDescontoExibir: number | null = null
    let temDesconto = false
    if (tipoAjusteVendaInformado(venda.tipoDesconto)) {
      if (tipoEhPercentual(venda.tipoDesconto)) {
        const taxa = lerNumeroConfigAjusteVenda(venda.valorDesconto)
        if (taxa != null) {
          valorDescontoExibir =
            Math.round(base * multiplicadorPercentualContrato(taxa) * 100) / 100
          temDesconto = true
        }
      } else {
        valorDescontoExibir = valorRaizPositivo(venda.valorDesconto)
        temDesconto = valorDescontoExibir != null
      }
    }

    let valorAcrescimoExibir: number | null = null
    let temAcrescimo = false
    if (tipoAjusteVendaInformado(venda.tipoAcrescimo)) {
      if (tipoEhPercentual(venda.tipoAcrescimo)) {
        const taxa = lerNumeroConfigAjusteVenda(venda.valorAcrescimo)
        if (taxa != null) {
          valorAcrescimoExibir =
            Math.round(base * multiplicadorPercentualContrato(taxa) * 100) / 100
          temAcrescimo = true
        }
      } else {
        valorAcrescimoExibir = valorRaizPositivo(venda.valorAcrescimo)
        temAcrescimo = valorAcrescimoExibir != null
      }
    }

    return {
      mostrarSecao: temDesconto || temAcrescimo,
      temDesconto,
      temAcrescimo,
      valorDescontoExibir,
      valorAcrescimoExibir,
    }
  }, [venda, subtotalLinhasParaAjustePercentual])

  const temResumoFiscal = useMemo(() => vendaPossuiResumoFiscalParaAba(venda), [venda])

  /** Normalizado; se a API mandou objeto bruto ainda compatível, reutiliza para a aba Fiscal. */
  const resumoFiscalParaExibicao = useMemo((): ResumoFiscal | null => {
    if (!venda?.resumoFiscal) return null
    const n = normalizarResumoFiscal(venda.resumoFiscal as unknown)
    if (n) return n
    const raw = venda.resumoFiscal
    if (Array.isArray(raw) || typeof raw !== 'object' || raw === null) return null
    return raw as ResumoFiscal
  }, [venda?.resumoFiscal])

  if (!internalOpen) return null

  const statusVenda = venda?.canceladoPorId
    ? 'CANCELADA'
    : venda?.dataFinalizacao
      ? 'FINALIZADA'
      : 'EM ABERTO'

  const statusColor =
    statusVenda === 'CANCELADA'
      ? 'bg-error'
      : statusVenda === 'FINALIZADA'
        ? 'bg-success'
        : 'bg-warning'

  return (
    <Modal
      open={internalOpen}
      onClose={handlePainelBackdropClose}
      closeAfterTransition
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        zIndex: 1300,
        '& .MuiBackdrop-root': {
          zIndex: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
      }}
    >
      <DetalhesVendasPainelSlide
        in={open}
        timeout={{ enter: PANEL_MS_DETALHES.enter, exit: PANEL_MS_DETALHES.exit }}
        onExited={handleSlideExited}
        appear
        mountOnEnter
        unmountOnExit={false}
      >
        <div
          className={`absolute right-0 top-0 z-[1] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-bl-xl rounded-tl-xl bg-white shadow-xl outline-none ${CLASSE_LARGURA_PAINEL_DETALHES_VENDA}`}
          role="dialog"
          aria-modal
          aria-labelledby="detalhes-vendas-titulo-appbar"
        >
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-0">
        {/* AppBar */}
        <div className="flex w-full shrink-0 items-center gap-3 rounded-t-lg bg-primary py-3 md:px-4">
          <div className="flex flex-1 items-center justify-center gap-2">
            {venda && (
              <TipoVendaIcon
                tipoVenda={tabelaOrigem === 'venda_gestor' ? 'gestor' : venda.tipoVenda}
                numeroMesa={venda.numeroMesa}
                containerScale={0.9}
                className="flex-shrink-0"
                corPrincipal="#FFFFFF"
                corSecundaria="rgba(255, 255, 255, 0.3)"
                corTexto="var(--color-primary-text)"
                corBorda="rgba(255, 255, 255, 0.5)"
                corFundo="var(--color-primary-background)"
                corBalcao="var(--color-info)"
                corGestor="var(--color-info)"
              />
            )}
            <div className="flex flex-col" id="detalhes-vendas-titulo-appbar">
              <span className="font-exo text-xl font-semibold text-white">
                Venda Nº. {venda?.numeroVenda}
              </span>
              <span className="font-nunito text-lg text-white">#{venda?.codigoVenda}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Abas fora do scroll: evita conteúdo rolado aparecer no vão entre header e tabs (sticky+padding). */}
        {!isLoading && venda && temResumoFiscal && (
          <div className="z-[2] w-full shrink-0 border-b border-gray-200 bg-info md:px-2">
            <div className="flex flex-wrap gap-1 px-2 pb-0 pt-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={painelTabDetalhes === 0}
                onClick={() => setPainelTabDetalhes(0)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  painelTabDetalhes === 0
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                }`}
              >
                Informações da Venda
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={painelTabDetalhes === 1}
                onClick={() => setPainelTabDetalhes(1)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  painelTabDetalhes === 1
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                }`}
              >
                Fiscal
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo — flex-col: seções em coluna (evita flex padrão = row, que quebrava em 4 colunas) */}
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-info py-2 md:px-2">
          {isLoading ? (
            <div className="flex w-full min-w-0 flex-col items-center justify-center py-12">
              <JiffyLoading />
            </div>
          ) : venda ? (
            <>
              {(!temResumoFiscal || painelTabDetalhes === 0) && (
                <>
                  {/* Card Informações da Venda */}
                  <div className="mb-2 p-2">
                    <h2 className="font-exo text-lg font-semibold text-primary-text">
                      Informações da Venda
                    </h2>
                <div className="mb-2 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2 md:px-2">
                  {/* Status */}
                  <div
                    className={`flex justify-between rounded-lg px-3 py-2 ${statusColor} font-nunito text-xs text-white md:text-sm`}
                  >
                    Status: <span className="font-semibold">{statusVenda}</span>
                  </div>

                  {/* Aberto por */}
                  <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                    <span>Aberto por:</span>
                    <span>{nomesUsuarios[venda.abertoPorId] || venda.abertoPorId}</span>
                  </div>

                  {/* Última Alteração por - Só exibe quando statusMesa estiver aberta */}
                  {venda.ultimoResponsavelId && venda.statusMesa === 'aberta' && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Última Alteração por:</span>
                      <span>
                        {nomesUsuarios[venda.ultimoResponsavelId] || venda.ultimoResponsavelId}
                      </span>
                    </div>
                  )}

                  {/* Finalizado Por - Só exibe se a venda não foi cancelada e statusMesa não estiver aberta */}
                  {venda.ultimoResponsavelId &&
                    !venda.canceladoPorId &&
                    venda.statusMesa !== 'aberta' && (
                      <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                        <span>Finalizado Por:</span>
                        <span>
                          {nomesUsuarios[venda.ultimoResponsavelId] || venda.ultimoResponsavelId}
                        </span>
                      </div>
                    )}

                  {/* Cancelado Por */}
                  {venda.canceladoPorId && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-error md:text-sm">
                      <span>Cancelado Por:</span>
                      <span className="font-semibold">
                        {nomesUsuarios[venda.canceladoPorId] || venda.canceladoPorId}
                      </span>
                    </div>
                  )}

                  {/* Data/Hora de Cancelamento */}
                  {venda.dataCancelamento && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-error md:text-sm">
                      <span>Cancelado em:</span>
                      <span className="font-semibold">
                        {formatDateTime(venda.dataCancelamento)}
                      </span>
                    </div>
                  )}

                  {/* Código do Terminal */}
                  {venda.codigoTerminal && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Código do Terminal:</span>
                      <span>#{venda.codigoTerminal}</span>
                    </div>
                  )}

                  {/* Data/Hora de Criação */}
                  <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                    <span>Data/Hora Abertura:</span>
                    <span>{formatDateTime(venda.dataCriacao)}</span>
                  </div>

                  {/* Data/Hora de Finalização */}
                  {venda.dataFinalizacao && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Data/Hora Finalização:</span>
                      <span>{formatDateTime(venda.dataFinalizacao)}</span>
                    </div>
                  )}

                  {/* Cliente Vinculado */}
                  {venda.clienteId && nomeCliente && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Cliente Vinculado:</span>
                      <span>{nomeCliente}</span>
                    </div>
                  )}

                  {/* Identificação da Venda */}
                  {venda.identificacao && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Identificação da Venda:</span>
                      <span>{venda.identificacao}</span>
                    </div>
                  )}

                  {/* Origem da Venda */}
                  {venda.origem && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-3 text-sm text-primary-text">
                      <span>Origem:</span>
                      <span>{venda.origem}</span>
                    </div>
                  )}

                  {/* Status Fiscal */}
                  {venda.statusFiscal && (
                    <div className="font-nunito flex items-center justify-between rounded-lg bg-white px-3 text-sm text-primary-text">
                      <span>Status Fiscal:</span>
                      <StatusFiscalBadge status={venda.statusFiscal} />
                    </div>
                  )}

                  {/* Documento Fiscal ID */}
                  {venda.documentoFiscalId && (
                    <div className="font-nunito flex justify-between rounded-lg bg-green-50 px-3 text-sm text-primary-text">
                      <span>Documento Fiscal ID:</span>
                      <span className="font-mono text-xs">{venda.documentoFiscalId}</span>
                    </div>
                  )}

                  {/* Retorno SEFAZ (motivo da rejeição/autorização) */}
                  {venda.retornoSefaz && (
                    <div
                      className={`font-nunito rounded-lg px-3 py-2 text-sm ${
                        venda.statusFiscal === 'REJEITADA'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-primary-text'
                      }`}
                    >
                      <span className="font-semibold">Retorno SEFAZ: </span>
                      <span>{venda.retornoSefaz}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Produtos Lançados */}
              <div className="mb-2 p-2">
                <h2 className="font-exo text-lg font-semibold text-primary-text">Produtos Lançados</h2>
                <div className="mb-2 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2">
                  {venda.produtosLancados?.map((produto, index) => {
                    const valorTotal = calcularValorProduto(produto)
                    const isRemovido = produto.removido
                    const isVendaCancelada = statusVenda === 'CANCELADA'
                    // Se a venda está cancelada, todos os produtos são considerados cancelados
                    const isCancelado = isVendaCancelada || isRemovido
                    // Sempre exibe o valor total, mesmo quando removido (com risco)

                    // Debug: verifica se os campos de desconto/acréscimo estão presentes (apenas para produtos com modificações)
                    if (process.env.NODE_ENV === 'development') {
                      const descontoValue =
                        produto.desconto !== undefined && produto.desconto !== null
                          ? typeof produto.desconto === 'string'
                            ? parseFloat(produto.desconto)
                            : produto.desconto
                          : 0
                      const acrescimoValue =
                        produto.acrescimo !== undefined && produto.acrescimo !== null
                          ? typeof produto.acrescimo === 'string'
                            ? parseFloat(produto.acrescimo)
                            : produto.acrescimo
                          : 0

                      if (descontoValue > 0 || acrescimoValue > 0) {
                        console.log('Produto com desconto/acréscimo:', {
                          nome: produto.nomeProduto,
                          desconto: produto.desconto,
                          descontoValue,
                          tipoDesconto: produto.tipoDesconto,
                          acrescimo: produto.acrescimo,
                          acrescimoValue,
                          tipoAcrescimo: produto.tipoAcrescimo,
                          produtoCompleto: produto,
                        })
                      }
                    }

                    return (
                      <div
                        key={index}
                        className={`rounded-lg px-1 md:px-3 ${
                          isCancelado ? 'bg-error/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {/* Linha do produto principal */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-2 items-center gap-2">
                              <span className="font-nunito text-xs font-semibold text-primary-text md:text-sm">
                                {produto.quantidade}x {produto.nomeProduto} (
                                {formatNumber(produto.valorUnitario)})
                              </span>
                            </div>
                            {/* Exibe acréscimo e/ou desconto se existirem */}
                            <div className="font-nunito flex flex-1 flex-col justify-start gap-1 text-xs text-secondary-text md:flex-row md:text-sm">
                              {(() => {
                                // Tenta obter acréscimo de diferentes possíveis campos
                                const acrescimoRaw =
                                  (produto as any).acrescimo ??
                                  (produto as any).valorAcrescimo ??
                                  (produto as any).acrescimoValor ??
                                  null
                                const tipoAcrescimoRaw =
                                  produto.tipoAcrescimo ??
                                  (produto as any).tipoAcrescimoValor ??
                                  (produto as any).tipoAcrescimoProduto ??
                                  null

                                // Tenta obter desconto de diferentes possíveis campos
                                const descontoRaw =
                                  produto.desconto ??
                                  (produto as any).valorDesconto ??
                                  (produto as any).descontoValor ??
                                  null
                                const tipoDescontoRaw =
                                  produto.tipoDesconto ??
                                  (produto as any).tipoDescontoValor ??
                                  (produto as any).tipoDescontoProduto ??
                                  null

                                const acrescimoValue =
                                  acrescimoRaw !== undefined &&
                                  acrescimoRaw !== null &&
                                  acrescimoRaw !== ''
                                    ? typeof acrescimoRaw === 'string'
                                      ? parseFloat(acrescimoRaw)
                                      : acrescimoRaw
                                    : null
                                const descontoValue =
                                  descontoRaw !== undefined &&
                                  descontoRaw !== null &&
                                  descontoRaw !== ''
                                    ? typeof descontoRaw === 'string'
                                      ? parseFloat(descontoRaw)
                                      : descontoRaw
                                    : null

                                const elementos = []

                                // Exibe acréscimo se existir e for maior que 0
                                if (
                                  acrescimoValue !== null &&
                                  !isNaN(acrescimoValue) &&
                                  acrescimoValue > 0
                                ) {
                                  const tipoAcrescimo = tipoAcrescimoRaw || 'fixo' // Default para fixo se não especificado
                                  const valorExibir =
                                    tipoAcrescimo === 'porcentagem'
                                      ? `${Math.round(acrescimoValue * 100)}%`
                                      : formatNumber(acrescimoValue)
                                  elementos.push(
                                    <span key="acrescimo" className="text-success">
                                      Acresc. +{valorExibir}
                                    </span>
                                  )
                                }

                                // Exibe desconto se existir e for maior que 0
                                if (
                                  descontoValue !== null &&
                                  !isNaN(descontoValue) &&
                                  descontoValue > 0
                                ) {
                                  const tipoDesconto = tipoDescontoRaw || 'fixo' // Default para fixo se não especificado
                                  const valorExibir =
                                    tipoDesconto === 'porcentagem'
                                      ? `${Math.round(descontoValue * 100)}%`
                                      : formatNumber(descontoValue)
                                  elementos.push(
                                    <span key="desconto" className="text-error">
                                      Desc. -{valorExibir}
                                    </span>
                                  )
                                }

                                return elementos.length > 0 ? elementos : null
                              })()}
                            </div>
                            <div
                              className={`font-nunito flex flex-1 items-center justify-end text-sm font-semibold text-primary-text ${isCancelado ? 'line-through' : ''}`}
                            >
                              {formatCurrency(valorTotal)}
                            </div>
                          </div>

                          {/* Linhas dos complementos */}
                          {produto.complementos && produto.complementos.length > 0 ? (
                            <div className="ml-2 space-y-1 md:ml-7">
                              {produto.complementos.map((complemento, compIndex) => {
                                console.log(
                                  `  🎨 Renderizando complemento ${compIndex}:`,
                                  complemento
                                )

                                const valorTotalComplemento = calcularValorComplemento(complemento)
                                const temImpactoPreco = complemento.tipoImpactoPreco !== 'nenhum'

                                // Determina o prefixo baseado no tipo de impacto
                                let prefix = ''
                                if (temImpactoPreco) {
                                  prefix = complemento.tipoImpactoPreco === 'aumenta' ? '+ ' : '- '
                                }

                                return (
                                  <div
                                    key={compIndex}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="font-nunito text-xs text-secondary-text">
                                      {complemento.quantidade}x {complemento.nomeComplemento}
                                      {temImpactoPreco &&
                                        ` (${formatNumber(complemento.valorUnitario)})`}
                                    </span>
                                    <div
                                      className={`font-nunito text-xs font-semibold text-secondary-text ${isCancelado ? 'line-through' : ''}`}
                                    >
                                      {temImpactoPreco
                                        ? `${prefix}${formatCurrency(valorTotalComplemento)}`
                                        : '-'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}

                          {/* Informações de lançamento */}
                          <div className="mt-1 flex flex-col text-xs text-secondary-text md:ml-7 md:flex-row">
                            <span>Lançado: {formatDateTime(produto.dataLancamento)} |</span>{' '}
                            <span>
                              Usuário: {nomesUsuarios[produto.lancadoPorId] || produto.lancadoPorId}
                            </span>
                          </div>

                          {/* Informações de remoção (se produto foi removido) */}
                          {isRemovido && produto.removidoPorId && (
                            <div className="ml-7 mt-1 text-xs text-error">
                              Removido por:{' '}
                              {nomesUsuarios[produto.removidoPorId] || produto.removidoPorId}
                            </div>
                          )}
                          {isRemovido && produto.dataRemocao && (
                            <div className="ml-7 text-xs text-error">
                              Removido em: {formatDateTime(produto.dataRemocao)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {(venda.taxasLancadas?.length ?? 0) > 0 && (
                    <>
                      <div className="my-2 border-t border-dashed border-gray-400" />
                      <p className="font-nunito mb-1 text-lg font-semibold text-primary-text">
                        Taxas Lançadas
                      </p>
                      {(venda.taxasLancadas ?? []).map(taxa => {
                        const isVendaCancelada = statusVenda === 'CANCELADA'
                        const isTaxaRemovida = Boolean(taxa.dataRemocao?.trim())
                        const isCanceladoTaxa = isVendaCancelada || isTaxaRemovida
                        const valorUnitTaxa = Number(taxa.valor) || 0
                        const qtdTaxa = Number(taxa.quantidade) || 0
                        const totalTaxa = Number(taxa.valorCalculado) || 0
                        const textoUnitarioTaxa = tipoEhPercentual(taxa.tipo)
                          ? `${Math.round(valorUnitTaxa * 100)}%`
                          : formatNumber(valorUnitTaxa)

                        return (
                          <div
                            key={taxa.id || `${taxa.nome}-${taxa.dataLancamento}`}
                            className={`rounded-lg px-1 md:px-3 ${
                              isCanceladoTaxa ? 'bg-error/20' : 'bg-white'
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-nunito min-w-0 flex-1 text-xs font-semibold text-primary-text md:text-sm">
                                  {qtdTaxa}x {taxa.nome} ({textoUnitarioTaxa})
                                </span>
                                <span
                                  className={`font-nunito shrink-0 text-sm font-semibold text-primary-text ${isCanceladoTaxa ? 'line-through' : ''}`}
                                >
                                  {formatCurrency(totalTaxa)}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-col text-xs text-secondary-text md:ml-7 md:flex-row md:flex-wrap md:gap-x-1">
                                {taxa.dataLancamento && (
                                  <span>Lançado: {formatDateTime(taxa.dataLancamento)}</span>
                                )}
                                {taxa.dataLancamento && taxa.lancadoPorId && (
                                  <span className="hidden md:inline">|</span>
                                )}
                                {taxa.lancadoPorId && (
                                  <span>
                                    Usuário: {nomesUsuarios[taxa.lancadoPorId] || taxa.lancadoPorId}
                                  </span>
                                )}
                              </div>
                              {isTaxaRemovida && taxa.removidoPorId && (
                                <div className="ml-7 mt-1 text-xs text-error">
                                  Removido por:{' '}
                                  {nomesUsuarios[taxa.removidoPorId] || taxa.removidoPorId}
                                </div>
                              )}
                              {isTaxaRemovida && taxa.dataRemocao && (
                                <div className="ml-7 text-xs text-error">
                                  Removido em: {formatDateTime(taxa.dataRemocao)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {ajustesTotaisVenda.mostrarSecao && (
                    <>
                      <div className="my-2 border-t border-dashed border-gray-400" />
                      <p className="font-nunito mb-1 text-lg font-semibold text-primary-text">
                        Acréscimo/Desconto na Venda
                      </p>
                      {ajustesTotaisVenda.temDesconto && (
                        <div className="rounded-lg bg-white px-1 md:px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-nunito min-w-0 flex-1 text-xs font-semibold text-primary-text md:text-sm">
                                Desconto na venda
                                {sufixoTituloAjusteVenda(venda.tipoDesconto, venda.valorDesconto)}
                              </span>
                              <span className="font-nunito shrink-0 text-sm font-semibold text-error">
                                -{formatCurrency(ajustesTotaisVenda.valorDescontoExibir ?? 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {ajustesTotaisVenda.temAcrescimo && (
                        <div className="rounded-lg bg-white px-1 md:px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-nunito min-w-0 flex-1 text-xs font-semibold text-primary-text md:text-sm">
                                Acréscimo na venda
                                {sufixoTituloAjusteVenda(venda.tipoAcrescimo, venda.valorAcrescimo)}
                              </span>
                              <span className="font-nunito shrink-0 text-sm font-semibold text-primary-text">
                                {formatCurrency(ajustesTotaisVenda.valorAcrescimoExibir ?? 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Total da Venda */}
                  <div className="rounded-lg border-2 border-primary bg-primary/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-nunito text-base font-semibold text-primary-text">
                        Total da Venda:
                      </span>
                      <span
                        className={`font-nunito text-base font-semibold text-primary ${statusVenda === 'CANCELADA' ? 'line-through' : ''}`}
                      >
                        {formatCurrency(totalVendaCalculado)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Pagamentos Realizados */}
              <div className="mb-4 px-2">
                <h2 className="mb-2 font-exo text-lg font-semibold text-primary-text">
                  Pagamentos Realizados
                </h2>
                <div className="mb-3 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2">
                  {venda.pagamentos
                    ?.filter(p => {
                      const isCancelado =
                        p.cancelado === true ||
                        (p.dataCancelamento !== null && p.dataCancelamento !== undefined)

                      const usaTef = p.isTefUsed === true
                      // Oculta só TEF pendente de confirmação em pagamento ainda ativo
                      // (cancelados permanecem visíveis no histórico mesmo com TEF não confirmado)
                      if (usaTef && !isCancelado) {
                        const tefConfirmado = p.isTefConfirmed === true
                        if (!tefConfirmado) {
                          return false
                        }
                      }

                      return true
                    })
                    .map((pagamento, index) => {
                      const meio = nomesMeiosPagamento[pagamento.meioPagamentoId]
                      const formaPagamento = meio?.formaPagamentoFiscal || ''
                      const isCancelado =
                        pagamento.cancelado === true ||
                        (pagamento.dataCancelamento !== null &&
                          pagamento.dataCancelamento !== undefined)

                      const getIcon = () => {
                        if (formaPagamento.toLowerCase().includes('dinheiro')) return '💵'
                        if (
                          formaPagamento.toLowerCase().includes('credito') ||
                          formaPagamento.toLowerCase().includes('debito')
                        )
                          return '💳'
                        if (formaPagamento.toLowerCase().includes('pix')) return '📱'
                        return '💳'
                      }

                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                            isCancelado ? 'bg-error/20' : 'bg-[#4BD08A]'
                          }`}
                        >
                          <div
                            className={`flex h-[62px] w-[68px] flex-shrink-0 items-center justify-center rounded-lg ${
                              isCancelado ? 'bg-error/30' : 'bg-primary'
                            }`}
                          >
                            <span className="text-2xl text-white">{getIcon()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-nunito text-sm font-semibold text-primary-text">
                              {meio?.nome || 'Meio de pagamento desconhecido'}
                              {isCancelado && (
                                <span className="ml-2 text-xs font-semibold text-error">
                                  (CANCELADO)
                                </span>
                              )}
                            </div>
                            <div className="font-nunito text-xs text-secondary-text">
                              {formatDateTime(pagamento.dataCriacao)}
                            </div>
                            <div className="font-nunito text-sm font-semibold text-primary-text">
                              {formatCurrency(pagamento.valor)}
                            </div>
                            <div className="font-nunito text-xs text-secondary-text">
                              PDV Resp.:{' '}
                              {nomesUsuarios[pagamento.realizadoPorId] || pagamento.realizadoPorId}
                            </div>
                            {isCancelado && pagamento.canceladoPorId && (
                              <div className="font-nunito mt-1 text-xs text-error">
                                Cancelado por:{' '}
                                {nomesUsuarios[pagamento.canceladoPorId] ||
                                  pagamento.canceladoPorId}
                              </div>
                            )}
                            {isCancelado && pagamento.dataCancelamento && (
                              <div className="font-nunito text-xs text-error">
                                Cancelado em: {formatDateTime(pagamento.dataCancelamento)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                  {/* Troco - Código original comentado (vem da API) */}
                  {/* {venda.troco != null && Number(venda.troco) > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm font-semibold text-primary-text font-nunito">
                        Troco: {formatCurrency(venda.troco)}
                      </span>
                    </div>
                  )} */}

                  {/* Troco calculado no frontend */}
                  {trocoCalculado > 0 && (
                    <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                      <span className="font-nunito text-sm font-semibold text-primary-text">
                        Troco: {formatCurrency(trocoCalculado)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Resumo Financeiro */}
              <div className="mb-4 px-2">
                <h2 className="mb-2 font-exo text-sm font-semibold text-primary-text">
                  Resumo Financeiro
                </h2>
                <div className="border-t border-dashed border-gray-400"></div>

                <div className="space-y-1.5 rounded-lg px-4 py-2">
                  {/* A: todos os produtos lançados (inclui cancelados / removidos) */}
                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      A - Total itens lançados (+)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalItensLancados)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                     B - Itens cancelados (-)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800 line-through">
                      {formatNumber(resumoFinanceiro.totalItensCancelados)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      C - Total taxas (+)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalTaxas)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      D - Total acréscimos à venda (+)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalAcrescimoVenda)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      E - Total descontos à venda (-)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {resumoFinanceiro.totalDescontoVenda > 0
                        ? `-${formatNumber(resumoFinanceiro.totalDescontoVenda)}`
                        : formatNumber(resumoFinanceiro.totalDescontoVenda)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-gray-400 pt-1.5">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      F - Total (A − B + C + D − E)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalResumo)}
                    </span>
                  </div>
                </div>
              </div>
                </>
              )}

              {temResumoFiscal &&
                painelTabDetalhes === 1 &&
                resumoFiscalParaExibicao && (
                  <div className="mb-4 p-2">
                    <div className="flex flex-col gap-3 bg-gray-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="font-exo text-lg font-semibold text-primary-text">
                        Resumo Fiscal
                      </h2>
                      {Boolean(
                        resumoFiscalParaExibicao.documentoFiscalId &&
                          String(resumoFiscalParaExibicao.documentoFiscalId).trim() !== ''
                      ) &&
                        statusFiscalEhEmitida(
                          resumoFiscalParaExibicao.status,
                          venda.statusFiscal
                        ) && (
                          <button
                            type="button"
                            className="shrink-0 rounded-lg border-2 border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                            onClick={() => {
                              void abrirDocumentoFiscalPdf(
                                String(resumoFiscalParaExibicao.documentoFiscalId).trim(),
                                tipoDocFiscalFromModelo(resumoFiscalParaExibicao.modelo)
                              )
                            }}
                          >
                            Ver{' '}
                            {tipoDocFiscalFromModelo(resumoFiscalParaExibicao.modelo) === 'NFE'
                              ? 'NFe'
                              : 'NFCe'}
                          </button>
                        )}
                    </div>
                    <div className="mb-2 border-t border-dashed border-gray-400" />
                    <div className="flex flex-col gap-1 md:px-2">
                      {(
                        [
                          {
                            label: 'Retorno SEFAZ',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.retornoSefaz),
                            rowClassName:
                              resumoFiscalParaExibicao.status === 'REJEITADA'
                                ? 'bg-red-50 text-red-700'
                                : resumoFiscalParaExibicao.retornoSefaz
                                  ? 'bg-blue-50 text-primary-text'
                                  : undefined,
                            multilineValue: true,
                          },
                          {
                            label: 'Status',
                            value: resumoFiscalParaExibicao.status ? (
                              <StatusFiscalBadge status={resumoFiscalParaExibicao.status} />
                            ) : (
                              '—'
                            ),
                          },
                          {
                            label: 'Chave fiscal',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.chaveFiscal),
                          },
                          {
                            label: 'Código retorno',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.codigoRetorno),
                          },
                          {
                            label: 'Terminal',
                            value:
                              nomeTerminalResumoFiscal ??
                              textoCampoFiscal(resumoFiscalParaExibicao.terminalId),
                          },
                          {
                            label: 'Modelo',
                            value:
                              resumoFiscalParaExibicao.modelo != null
                                ? String(resumoFiscalParaExibicao.modelo)
                                : '—',
                          },
                          {
                            label: 'Número',
                            value:
                              resumoFiscalParaExibicao.numero != null
                                ? String(resumoFiscalParaExibicao.numero)
                                : '—',
                          },
                          {
                            label: 'Série',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.serie),
                          },
                          {
                            label: 'Empresa',
                            value:
                              nomeEmpresaResumoFiscal ??
                              textoCampoFiscal(resumoFiscalParaExibicao.empresaId),
                          },
                          {
                            label: 'Data criação',
                            value: resumoFiscalParaExibicao.dataCriacao
                              ? formatDateTime(resumoFiscalParaExibicao.dataCriacao)
                              : '—',
                          },
                          {
                            label: 'Data emissão',
                            value: resumoFiscalParaExibicao.dataEmissao
                              ? formatDateTime(resumoFiscalParaExibicao.dataEmissao)
                              : '—',
                          },
                          {
                            label: 'Última modificação',
                            value: resumoFiscalParaExibicao.dataUltimaModificacao
                              ? formatDateTime(resumoFiscalParaExibicao.dataUltimaModificacao)
                              : '—',
                          },
                        ] as {
                          label: string
                          value: ReactNode
                          rowClassName?: string
                          multilineValue?: boolean
                        }[]
                      ).map(({ label, value, rowClassName, multilineValue }, index) => {
                        const zebra =
                          rowClassName ??
                          (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')
                        return (
                          <div
                            key={label}
                            className={`font-nunito flex items-start justify-between gap-2 rounded-lg px-1 py-1.5 text-xs md:px-2 md:text-sm ${zebra} ${
                              rowClassName ? 'text-inherit' : 'text-primary-text'
                            }`}
                          >
                            <span className="shrink-0 pt-0.5">{label}:</span>
                            <span
                              className={`max-w-[65%] text-right font-medium break-words ${
                                multilineValue ? 'whitespace-pre-wrap' : ''
                              }`}
                            >
                              {value}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-secondary-text">Erro ao carregar detalhes da venda.</p>
            </div>
          )}
        </div>
          </div>

      {/* Modal de Justificativa de Cancelamento */}
      <MuiDialog
        open={isCancelarModalOpen}
        onClose={() => setIsCancelarModalOpen(false)}
        maxWidth="sm"
        sx={{ zIndex: 1400 }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: '500px',
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: 'var(--color-error)',
            color: 'white',
            fontFamily: 'Exo, sans-serif',
          }}
        >
          Cancelar Venda
        </DialogTitle>
        <MuiDialogContent sx={{ p: 3, backgroundColor: 'var(--color-info)' }}>
          <div className="space-y-4 pt-4">
            <p className="font-nunito text-sm text-secondary-text">
              Esta ação cancelará a venda e, se houver nota fiscal emitida, também a cancelará na
              SEFAZ.
            </p>
            <p className="font-nunito text-sm font-semibold text-error">
              Esta ação não pode ser desfeita!
            </p>
            <TextField
              label="Justificativa do Cancelamento"
              multiline
              rows={4}
              fullWidth
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Digite o motivo do cancelamento (mínimo 15 caracteres)"
              helperText={`${justificativa.length}/15 caracteres mínimos`}
              error={justificativa.length > 0 && justificativa.length < 15}
            />
          </div>
        </MuiDialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: 'var(--color-info)' }}>
          <Button
            onClick={() => {
              setIsCancelarModalOpen(false)
              setJustificativa('')
            }}
            variant="outlined"
            disabled={cancelarVenda.isPending}
          >
            Voltar
          </Button>
          <Button
            onClick={handleConfirmarCancelamento}
            variant="contained"
            color="error"
            disabled={cancelarVenda.isPending || justificativa.trim().length < 15}
            startIcon={cancelarVenda.isPending ? <CircularProgress size={20} /> : <MdCancel />}
          >
            {cancelarVenda.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </MuiDialog>
        </div>
      </DetalhesVendasPainelSlide>
    </Modal>
  )
}
