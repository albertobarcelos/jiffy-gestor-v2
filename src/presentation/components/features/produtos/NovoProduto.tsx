'use client'

import {
  useState,
  useEffect,
  useMemo,
  Suspense,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InformacoesProdutoStep } from './NovoProduto/InformacoesProdutoStep'
import { ConfiguracoesGeraisStep } from './NovoProduto/ConfiguracoesGeraisStep'
import { ConfiguracaoFiscalStep } from './NovoProduto/ConfiguracaoFiscalStep'
import { ProdutoFormWithPreviewLayout } from './preview/ProdutoFormWithPreviewLayout'
import { parsePrecoPreviewFromInput } from './preview/produtoPreviewModel'
import type { ProdutoPreviewImageUpload } from './preview/ProdutoSimplePreviewCard'
import {
  aplicarImagemProdutoNosMenus,
  buscarIdMenuPrincipal,
  buscarMenusDaEmpresa,
  buscarPrimeiraImagemProdutoNosMenus,
  extrairImagemUrlDoProdutoJson,
  extrairMenuIdsDoProdutoJson,
  unirMenuIds,
  vincularProdutoAosMenus,
} from '@/src/presentation/utils/uploadImagemProdutoMenus'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { Produto } from '@/src/domain/entities/Produto'
import { MdImage } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import {
  snapshotPropagavelDePatch,
  type DestinoAlteracaoProduto,
} from '@/src/shared/types/propagarAlteracaoProduto'

/** Snapshot serializado por `getFormSnapshot` — deve permanecer alinhado a esse método. */
interface BaselineSnapshotProduto {
  nomeProduto: string
  descricaoProduto: string
  precoVenda: string
  unidadeProduto: string | null
  grupoProduto: string | null
  codigoEanBarras: string
  favorito: boolean
  permiteDesconto: boolean
  permiteAcrescimo: boolean
  abreComplementos: boolean
  permiteAlterarPreco: boolean
  incideTaxa: boolean
  ativo: boolean
  grupoComplementosIds: string[]
  impressorasIds: string[]
  ncm: string
  cest: string
  origemMercadoria: string | null
  tipoProduto: string | null
  indicadorProducaoEscala: string | null
}

/** Formata valor para o input de preço (mesmo formato do load da API). */
function formatCurrencyValue(value: number | string): string {
  const numericValue =
    typeof value === 'number'
      ? value
      : Number(
          value
            .toString()
            .replace(/[^\d,.-]/g, '')
            .replace(',', '.')
        ) || 0

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericValue)
}

/** Hidrata o form com o produto da lista — evita inputs vazios enquanto o GET responde. */
function seedFormFromProduto(produto: Produto, isCopy: boolean) {
  const nome = produto.getNome() || ''
  return {
    nomeProduto: isCopy ? (nome ? `${nome} - Cópia` : 'Cópia ') : nome,
    precoVenda: produto.getValor() ? formatCurrencyValue(produto.getValor()) : '',
    unidadeProduto: (produto.getUnidadeMedida() as string | null) || null,
    grupoProduto: produto.getGrupoId() || null,
    favorito: produto.isFavorito(),
    permiteDesconto: produto.permiteDescontoAtivo(),
    permiteAcrescimo: produto.permiteAcrescimoAtivo(),
    abreComplementos: produto.abreComplementosAtivo(),
    permiteAlterarPreco: produto.permiteAlterarPrecoAtivo(),
    incideTaxa: produto.incideTaxaAtivo(),
    ativo: produto.isAtivo(),
    grupoComplementosIds: produto.getGruposComplementos().map(g => g.id),
    impressorasIds: produto.getImpressoras().map(i => i.id),
  }
}

function parsePrecoFormParaNumero(preco: string): number {
  return parseFloat(preco.replace(/[^\d,]/g, '').replace(',', '.')) || 0
}

/** Compara listas de ids ignorando string vs número (cardápio pode mandar id como número). */
function arraysIdsIguais(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  const norm = (arr: unknown[] | undefined) =>
    JSON.stringify([...(arr ?? [])].map(x => String(x)).sort())
  return norm(a) === norm(b)
}

/** Unidade vinda vazia/null/undefined deve bater com o estado normalizado no load (`x || null`). */
function unidadeMedidaIguaisParaPatch(a: unknown, b: unknown): boolean {
  const n = (x: unknown): string | null =>
    x === undefined || x === null || x === '' ? null : String(x)
  return n(a) === n(b)
}

/** Booleans da API podem vir como truthy numérico; o formulário usa boolean coerente com `|| false`. */
function booleanIguaisParaPatch(a: unknown, b: unknown): boolean {
  return Boolean(a) === Boolean(b)
}

/**
 * Cardápio pode expor o grupo só em `grupo.id` (sem `grupoId` no root). Baseline e estado precisam usar a mesma origem.
 */
function extrairGrupoProdutoIdDoJsonProduto(produto: Record<string, unknown>): string | null {
  const direto = produto.grupoId
  if (typeof direto === 'string' && direto.trim() !== '') return direto.trim()
  if (typeof direto === 'number' && Number.isFinite(direto)) return String(direto)
  const grupo = produto.grupo
  if (grupo && typeof grupo === 'object') {
    const id = (grupo as Record<string, unknown>).id
    if (typeof id === 'string' && id.trim() !== '') return id.trim()
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  }
  return null
}

/** Defaults de origem/tipo não contam como dados fiscais — o microserviço exige NCM. */
function fiscalDeveSerEnviado(fiscalData: Record<string, unknown>): boolean {
  return typeof fiscalData.ncm === 'string' && fiscalData.ncm.trim() !== ''
}

function extrairIdProdutoDaRespostaApi(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const root = payload as Record<string, unknown>
  const nested =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const candidates = [root.id, root.produtoId, nested?.id, nested?.produtoId]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim()
  }
  return undefined
}

/** Compara ids de grupo para o PATCH parcial (null, undefined e string vazia tratados como ausência). */
function grupoProdutoIdsIguaisParaPatch(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): string | null => {
    if (v === undefined || v === null) return null
    const s = String(v).trim()
    return s === '' ? null : s
  }
  return norm(a) === norm(b)
}

/** Evita enviar grupoId quando ainda é o mesmo do GET (backend pode incrementar ordem ao receber grupoId). */
function omitGrupoIdSeIgualAoCarregado(
  bodyCompleto: Record<string, unknown>,
  grupoIdReferenciaCarregamento: string | null
): Record<string, unknown> {
  if (!grupoProdutoIdsIguaisParaPatch(bodyCompleto.grupoId, grupoIdReferenciaCarregamento)) {
    return bodyCompleto
  }
  const out = { ...bodyCompleto }
  delete out.grupoId
  return out
}

/** Monta objeto fiscal “de referência” a partir do baseline (mesma lógica do bloco fiscal em handleSave). */
function montarFiscalReferenciaBaseline(
  base: BaselineSnapshotProduto,
  salvarSomenteDadosGerais: boolean,
  fiscalRef: {
    ncm?: string
    cest?: string
    origemMercadoria?: string
    tipoProduto?: string
    indicadorProducaoEscala?: string | null
  } | null,
  hasLoadedFiscal: boolean
): Record<string, unknown> {
  const fiscal: Record<string, unknown> = {}
  if (salvarSomenteDadosGerais && !hasLoadedFiscal && fiscalRef) {
    const ref = fiscalRef
    if (ref.ncm) fiscal.ncm = String(ref.ncm).trim()
    if (ref.cest) fiscal.cest = String(ref.cest).trim()
    if (
      ref.origemMercadoria !== undefined &&
      ref.origemMercadoria !== null &&
      String(ref.origemMercadoria) !== ''
    ) {
      fiscal.origemMercadoria =
        typeof ref.origemMercadoria === 'number'
          ? ref.origemMercadoria
          : parseInt(String(ref.origemMercadoria), 10)
    }
    if (ref.tipoProduto) fiscal.tipoProduto = ref.tipoProduto
    if (ref.indicadorProducaoEscala) fiscal.indicadorProducaoEscala = ref.indicadorProducaoEscala
  } else {
    if (base.ncm?.trim()) fiscal.ncm = base.ncm.trim()
    if (base.cest?.trim()) fiscal.cest = base.cest.trim()
    if (base.origemMercadoria) fiscal.origemMercadoria = parseInt(base.origemMercadoria, 10)
    if (base.tipoProduto) fiscal.tipoProduto = base.tipoProduto
    if (base.indicadorProducaoEscala) fiscal.indicadorProducaoEscala = base.indicadorProducaoEscala
  }
  return fiscal
}

/** Retorna apenas chaves do objeto fiscal que mudaram em relação ao baseline. */
function diffFiscalParcial(
  atual: Record<string, unknown>,
  referencia: Record<string, unknown>
): Record<string, unknown> | undefined {
  const keys = new Set([...Object.keys(atual), ...Object.keys(referencia)])
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    if (JSON.stringify(atual[k]) !== JSON.stringify(referencia[k])) {
      out[k] = atual[k]
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * PATCH de edição com apenas campos alterados em relação ao último baseline (carregar/salvar).
 * POST de criação continua com body completo — chamador só usa isto quando `isEditMode`.
 */
function montarPatchParcialEdicaoProduto(
  baselineSerialized: string | null,
  grupoIdReferenciaCarregamento: string | null,
  bodyCompleto: Record<string, unknown>,
  fiscalAtual: Record<string, unknown>,
  salvarSomenteDadosGerais: boolean,
  fiscalRef: {
    ncm?: string
    cest?: string
    origemMercadoria?: string
    tipoProduto?: string
    indicadorProducaoEscala?: string | null
  } | null,
  hasLoadedFiscal: boolean,
  incluirAtivo: boolean
): Record<string, unknown> {
  if (!baselineSerialized) {
    return omitGrupoIdSeIgualAoCarregado(bodyCompleto, grupoIdReferenciaCarregamento)
  }

  let base: BaselineSnapshotProduto
  try {
    base = JSON.parse(baselineSerialized) as BaselineSnapshotProduto
  } catch {
    return omitGrupoIdSeIgualAoCarregado(bodyCompleto, grupoIdReferenciaCarregamento)
  }

  const delta: Record<string, unknown> = {}

  if (String(bodyCompleto.nome ?? '') !== String(base.nomeProduto ?? '')) delta.nome = bodyCompleto.nome
  if (String(bodyCompleto.descricao ?? '') !== String(base.descricaoProduto ?? '')) {
    delta.descricao = bodyCompleto.descricao
  }

  const valorNovo = bodyCompleto.valor as number
  if (parsePrecoFormParaNumero(base.precoVenda) !== valorNovo) {
    delta.valor = valorNovo
  }

  if (!grupoProdutoIdsIguaisParaPatch(bodyCompleto.grupoId, grupoIdReferenciaCarregamento)) {
    delta.grupoId = bodyCompleto.grupoId
  }
  if (!unidadeMedidaIguaisParaPatch(bodyCompleto.unidadeMedida, base.unidadeProduto)) {
    delta.unidadeMedida = bodyCompleto.unidadeMedida
  }

  const eanAtual = String(bodyCompleto.codigoEan ?? '').trim()
  const eanBase = String(base.codigoEanBarras ?? '').trim()
  if (eanAtual !== eanBase) delta.codigoEan = bodyCompleto.codigoEan

  if (!booleanIguaisParaPatch(bodyCompleto.favorito, base.favorito)) delta.favorito = bodyCompleto.favorito
  if (!booleanIguaisParaPatch(bodyCompleto.permiteDesconto, base.permiteDesconto)) {
    delta.permiteDesconto = bodyCompleto.permiteDesconto
  }
  if (!booleanIguaisParaPatch(bodyCompleto.permiteAcrescimo, base.permiteAcrescimo)) {
    delta.permiteAcrescimo = bodyCompleto.permiteAcrescimo
  }
  if (!booleanIguaisParaPatch(bodyCompleto.abreComplementos, base.abreComplementos)) {
    delta.abreComplementos = bodyCompleto.abreComplementos
  }
  if (!booleanIguaisParaPatch(bodyCompleto.permiteAlterarPreco, base.permiteAlterarPreco)) {
    delta.permiteAlterarPreco = bodyCompleto.permiteAlterarPreco
  }
  if (!booleanIguaisParaPatch(bodyCompleto.incideTaxa, base.incideTaxa)) {
    delta.incideTaxa = bodyCompleto.incideTaxa
  }

  if (!arraysIdsIguais(bodyCompleto.gruposComplementosIds as unknown[], base.grupoComplementosIds)) {
    delta.gruposComplementosIds = bodyCompleto.gruposComplementosIds
  }
  if (!arraysIdsIguais(bodyCompleto.impressorasIds as unknown[], base.impressorasIds)) {
    delta.impressorasIds = bodyCompleto.impressorasIds
  }

  if (
    incluirAtivo &&
    bodyCompleto.ativo !== undefined &&
    !booleanIguaisParaPatch(bodyCompleto.ativo, base.ativo)
  ) {
    delta.ativo = bodyCompleto.ativo
  }

  // Step 1–2: não mexe em NCM/fiscal. Diff parcial sem NCM vira `fiscal: {}` no JSON
  // e o microserviço responde "Código NCM é obrigatório".
  if (!salvarSomenteDadosGerais) {
    const ncmCompatAtual = bodyCompleto.ncm as string | undefined
    const ncmCompatBase = base.ncm?.trim() ? base.ncm.trim() : undefined
    if (ncmCompatAtual !== ncmCompatBase && ncmCompatAtual) {
      delta.ncm = ncmCompatAtual
    }

    const fiscalRefBaseline = montarFiscalReferenciaBaseline(
      base,
      salvarSomenteDadosGerais,
      fiscalRef,
      hasLoadedFiscal
    )
    const fiscalDelta = diffFiscalParcial(fiscalAtual, fiscalRefBaseline)
    if (fiscalDelta && fiscalDeveSerEnviado(fiscalAtual)) {
      delta.fiscal = fiscalAtual
    }
  }

  return delta
}

export type NovoProdutoSaveOverrides = {
  grupoId?: string
  gruposComplementosIds?: string[]
  impressorasIds?: string[]
  menuIds?: string[]
}

/** API imperativa para o rodapé do `JiffySidePanelModal` (wizard 3 passos). */
export interface NovoProdutoHandle {
  goNext: () => void
  goBack: () => void
  /** Mesmo fluxo que “Salvar e fechar” nos passos 1–2 */
  savePartialAndClose: () => Promise<boolean>
  /** Salvar completo (passo fiscal ou cadastro inteiro) */
  saveFinal: (overrides?: NovoProdutoSaveOverrides) => Promise<boolean>
  /** Há alterações em relação ao último baseline (carregamento ou salvamento). */
  isDirty: () => boolean
  /** Valida o passo interno atual sem persistir (wizard do cardápio). */
  canAdvanceCurrentPage: () => boolean
}

export interface NovoProdutoProps {
  produtoId?: string
  /**
   * Produto já conhecido (lista / modal) — hidrata o form na abertura sem esperar o GET.
   * O fetch ainda confirma descrição, EAN, fiscal etc. em background.
   */
  initialProduto?: Produto
  isCopyMode?: boolean
  defaultGrupoProdutoId?: string
  initialStep?: 0 | 1 | 2
  onClose?: () => void
  onSuccess?: (produtoData?: { produtoId: string; produtoData: any }) => void
  /** Modo painel lateral: sem cabeçalho interno duplicado; ações no rodapé externo */
  isEmbedded?: boolean
  hideEmbeddedHeader?: boolean
  /** Omite botões inferiores dos passos (Anterior / Próximo / Salvar e fechar) */
  hideEmbeddedFormActions?: boolean
  /**
   * Na criação, envia `menuIds` no POST para já vincular o produto a esses cardápios
   * (em vez de só o menu principal).
   */
  menuIds?: string[]
  /** Trava a categoria (definida no passo anterior do wizard do cardápio). */
  lockGrupoProduto?: boolean
  lockedGrupoLabel?: string
  onWizardStepChange?: (step: 0 | 1 | 2) => void
  onWizardSavingChange?: (saving: boolean) => void
  /** Passo 2 com fiscal indisponível: só “Voltar” no fluxo interno */
  onFiscalUnavailableChange?: (onlyBack: boolean) => void
  /** Preview de celular à direita (padrão: true no painel embutido). */
  showMobilePreview?: boolean
  /** Imagem exibida no preview (ex.: snapshot do cardápio). */
  previewImagemUrl?: string | null
  /** Cardápio extra para persistir a imagem (além dos menus já vinculados). */
  previewMenuId?: string
}

/**
 * Componente interno que usa useSearchParams
 */
const NovoProdutoContent = forwardRef<NovoProdutoHandle, NovoProdutoProps>(
  function NovoProdutoContent(
    {
      produtoId,
      initialProduto,
      isCopyMode = false,
      defaultGrupoProdutoId,
      initialStep = 0,
      onClose,
      onSuccess,
      isEmbedded = false,
      hideEmbeddedHeader = false,
      hideEmbeddedFormActions = false,
      menuIds,
      lockGrupoProduto = false,
      lockedGrupoLabel,
      onWizardStepChange,
      onWizardSavingChange,
      onFiscalUnavailableChange,
      showMobilePreview,
      previewImagemUrl = null,
      previewMenuId,
    },
    ref
  ) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const invalidate = useInvalidateTenantQueries()
    const [localPreviewImage, setLocalPreviewImage] = useState<string | null>(null)
    const [serverPreviewImage, setServerPreviewImage] = useState<string | null>(
      () => previewImagemUrl
    )
    const [menusVinculadosIds, setMenusVinculadosIds] = useState<string[]>(() =>
      initialProduto && produtoId && !isCopyMode
        ? initialProduto.getMenus().map(menu => menu.id)
        : []
    )
    const [uploadingPreviewImage, setUploadingPreviewImage] = useState(false)
    const pendingPreviewImageRef = useRef<File | null>(null)
    // Estado do step atual (0 = Informações, 1 = Configurações, 2 = Configuração Fiscal)
    const [selectedPage, setSelectedPage] = useState<0 | 1 | 2>(initialStep)

    const formSeed =
      initialProduto && produtoId && initialProduto.getId() === produtoId
        ? seedFormFromProduto(initialProduto, isCopyMode)
        : null
    const hasFormSeedRef = useRef(Boolean(formSeed))

    // Estados do formulário (seed da lista evita inputs brancos com backend lento)
    const [nomeProduto, setNomeProduto] = useState(() => formSeed?.nomeProduto ?? '')
    const [descricaoProduto, setDescricaoProduto] = useState('')
    const [precoVenda, setPrecoVenda] = useState(() => formSeed?.precoVenda ?? '')
    const [unidadeProduto, setUnidadeProduto] = useState<string | null>(
      () => formSeed?.unidadeProduto ?? null
    )
    const [grupoProduto, setGrupoProduto] = useState<string | null>(
      () => formSeed?.grupoProduto ?? defaultGrupoProdutoId ?? null
    )
    const [codigoEanBarras, setCodigoEanBarras] = useState('')
    const [favorito, setFavorito] = useState(() => formSeed?.favorito ?? false)
    const [permiteDesconto, setPermiteDesconto] = useState(
      () => formSeed?.permiteDesconto ?? false
    )
    const [permiteAcrescimo, setPermiteAcrescimo] = useState(
      () => formSeed?.permiteAcrescimo ?? false
    )
    const [abreComplementos, setAbreComplementos] = useState(
      () => formSeed?.abreComplementos ?? false
    )
    const [permiteAlterarPreco, setPermiteAlterarPreco] = useState(
      () => formSeed?.permiteAlterarPreco ?? false
    )
    const [incideTaxa, setIncideTaxa] = useState(() => formSeed?.incideTaxa ?? false)
    const [ativo, setAtivo] = useState(() => formSeed?.ativo ?? true)
    const [grupoComplementosIds, setGrupoComplementosIds] = useState<string[]>(
      () => formSeed?.grupoComplementosIds ?? []
    )
    const [impressorasIds, setImpressorasIds] = useState<string[]>(
      () => formSeed?.impressorasIds ?? []
    )
    // Guardar os grupos originais para comparar na remoção
    const [originalGrupoComplementosIds, setOriginalGrupoComplementosIds] = useState<string[]>(
      () => formSeed?.grupoComplementosIds ?? []
    )

    // Estados fiscais
    const [ncm, setNcm] = useState('')
    const [cest, setCest] = useState('')
    const [origemMercadoria, setOrigemMercadoria] = useState<string | null>('0') // Padrão: 0 - Nacional
    const [tipoProduto, setTipoProduto] = useState<string | null>('00') // Padrão: 00 - Mercadoria para Revenda
    const [indicadorProducaoEscala, setIndicadorProducaoEscala] = useState<string | null>(null)
    // Status de disponibilidade do microsserviço fiscal (retornado pelo backend)
    const [fiscalStatus, setFiscalStatus] = useState<'available' | 'unavailable' | undefined>(
      undefined
    )

    // Estado de validação do NCM via API do backend
    const [ncmValidation, setNcmValidation] = useState<{
      codigo: string
      valido: boolean
      descricao?: string
      mensagem: string
    } | null>(null)
    const [isValidatingNcm, setIsValidatingNcm] = useState(false)
    const ncmValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Armazena o último NCM validado para evitar chamadas duplicadas
    const lastValidatedNcmRef = useRef<string>('')

    // Estado de validação do CEST e lista de CESTs compatíveis com o NCM
    const [cestsDisponiveis, setCestsDisponiveis] = useState<
      { codigo: string; descricao: string; segmento: string; numeroAnexo?: string }[]
    >([])
    const [isLoadingCests, setIsLoadingCests] = useState(false)
    const [cestValidation, setCestValidation] = useState<{
      codigo: string
      valido: boolean
      descricao?: string
      segmento?: string
      mensagem: string
    } | null>(null)
    const [isValidatingCest, setIsValidatingCest] = useState(false)
    const lastFetchedNcmForCestsRef = useRef<string>('')

    // Estados de loading
    const [isLoadingProduto, setIsLoadingProduto] = useState(false)

    /** Página avulsa: confirmação antes de voltar à lista sem salvar */
    const [showDiscardDialog, setShowDiscardDialog] = useState(false)
    /** Snapshot JSON do formulário no último “ponto salvo” (carregar ou salvar com sucesso) */
    const baselineSerializedRef = useRef<string | null>(null)
    const createBaselineCommittedRef = useRef(false)
    /** grupoId do último GET bem-sucedido (ou após salvar) — diff de grupo não usa só o snapshot JSON. */
    const grupoProdutoIdCarregadoRef = useRef<string | null>(formSeed?.grupoProduto ?? null)

    // Verificar se é modo cópia via query param
    // Extrair o valor uma vez e usar como string estável
    const copyFromIdValue = searchParams.get('copyFrom')
    const copyFromId = useMemo(() => copyFromIdValue, [copyFromIdValue])
    const effectiveProdutoId = useMemo(() => produtoId || copyFromId, [produtoId, copyFromId])
    const effectiveIsCopyMode = useMemo(() => isCopyMode || !!copyFromId, [isCopyMode, copyFromId])
    /** Id persistido nesta sessão de criação (evita segundo POST se o fiscal falhar depois do create). */
    const [idCriadoNestaSessao, setIdCriadoNestaSessao] = useState<string | undefined>()
    const idPersistidoParaSave =
      (produtoId && !effectiveIsCopyMode ? produtoId : undefined) || idCriadoNestaSessao
    const { pedirConfirmacao, aplicarNosDestinos, aplicarImagemNosDestinos, dialog: dialogPropagacao } =
      usePropagarAlteracaoProduto()

    const resolverDestinosPadraoImagem = useCallback(
      async (token: string, extras: Iterable<string> = []) => {
        const principalId = await buscarIdMenuPrincipal(token)
        // Sempre inclui o principal + menus já escolhidos (wizard) / extras.
        return unirMenuIds(previewMenuId, principalId, extras)
      },
      [previewMenuId]
    )

    const perguntarCopiaImagemCadastroBase = useCallback(
      async (produtoIdAlvo: string, file: File, jaAplicados: string[]) => {
        // Pergunta de imagem só na edição a partir do cadastro base (não no wizard de menu).
        if (previewMenuId) return
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        const idsJa = unirMenuIds(jaAplicados)
        let menusJaSalvos: Array<{ id: string; nome: string }> = []
        if (token && idsJa.length > 0) {
          const todos = await buscarMenusDaEmpresa({ token })
          const setIds = new Set(idsJa)
          menusJaSalvos = todos.filter(m => setIds.has(m.id)).map(m => ({ id: m.id, nome: m.nome }))
        }
        const destinos = await pedirConfirmacao({
          origem: 'cadastroBase',
          produtoId: produtoIdAlvo,
          variante: 'imagem',
          excluirMenuIds: idsJa,
          fonteMenus: 'empresa',
          menusJaSalvos,
        })
        if (!destinos || destinos.menuIds.length === 0) return
        await aplicarImagemNosDestinos({
          produtoId: produtoIdAlvo,
          file,
          destinos,
          vincularSeAusente: true,
        })
      },
      [previewMenuId, pedirConfirmacao, aplicarImagemNosDestinos]
    )

    const perguntarVinculoOutrosMenusAposCriacao = useCallback(
      async (produtoIdAlvo: string, menuIdsJaSalvos: string[], fileImagem?: File | null) => {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) return

        const todosMenus = await buscarMenusDaEmpresa({ token })
        const idsJa = new Set(unirMenuIds(menuIdsJaSalvos))
        const menusJaSalvos = todosMenus
          .filter(m => idsJa.has(m.id))
          .map(m => ({ id: m.id, nome: m.nome }))

        const destinos = await pedirConfirmacao({
          origem: 'cadastroBase',
          produtoId: produtoIdAlvo,
          variante: 'vinculoMenus',
          excluirMenuIds: [...idsJa],
          fonteMenus: 'empresa',
          menusJaSalvos,
        })
        if (!destinos || destinos.menuIds.length === 0) return

        if (fileImagem) {
          await aplicarImagemNosDestinos({
            produtoId: produtoIdAlvo,
            file: fileImagem,
            destinos,
            vincularSeAusente: true,
          })
        } else {
          await vincularProdutoAosMenus({
            token,
            produtoId: produtoIdAlvo,
            menuIds: destinos.menuIds,
          })
          await invalidate(['menu-produtos'])
          await invalidate(['produtos-imagens-cadastro'])
        }
      },
      [pedirConfirmacao, aplicarImagemNosDestinos, invalidate]
    )

    const persistPreviewImage = useCallback(
      async (produtoIdAlvo: string, file: File, destinos: string[]) => {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) throw new Error('Token não encontrado')
        const ids = unirMenuIds(destinos)
        if (ids.length === 0) {
          throw new Error('Não foi possível identificar o menu para salvar a imagem')
        }
        // Garante vínculo antes do POST da imagem (senão o menu responde 404).
        await aplicarImagemProdutoNosMenus({
          token,
          produtoId: produtoIdAlvo,
          menuIds: ids,
          file,
          vincularSeAusente: true,
        })
        pendingPreviewImageRef.current = null
        await invalidate(['menus'])
        await invalidate(['produtos-imagens-cadastro'])
        await Promise.all(ids.map(id => invalidate(['menu-produtos', id])))
      },
      [invalidate]
    )

    /** Snapshot só dos dados do produto (sem passo do wizard) — trocar de etapa não é “alteração”. */
    const getFormSnapshot = useCallback(() => {
      return JSON.stringify({
        nomeProduto,
        descricaoProduto,
        precoVenda,
        unidadeProduto,
        grupoProduto,
        codigoEanBarras,
        favorito,
        permiteDesconto,
        permiteAcrescimo,
        abreComplementos,
        permiteAlterarPreco,
        incideTaxa,
        ativo,
        grupoComplementosIds: [...grupoComplementosIds].sort(),
        impressorasIds: [...impressorasIds].sort(),
        ncm: ncm.trim(),
        cest: cest.trim(),
        origemMercadoria,
        tipoProduto,
        indicadorProducaoEscala,
      })
    }, [
      nomeProduto,
      descricaoProduto,
      precoVenda,
      unidadeProduto,
      grupoProduto,
      codigoEanBarras,
      favorito,
      permiteDesconto,
      permiteAcrescimo,
      abreComplementos,
      permiteAlterarPreco,
      incideTaxa,
      ativo,
      grupoComplementosIds,
      impressorasIds,
      ncm,
      cest,
      origemMercadoria,
      tipoProduto,
      indicadorProducaoEscala,
    ])

    const commitBaseline = useCallback(() => {
      baselineSerializedRef.current = getFormSnapshot()
    }, [getFormSnapshot])

    /** Ref sempre aponta para o commit mais recente — evita baseline com snapshot desatualizado em async/setTimeout */
    const commitBaselineLatestRef = useRef(commitBaseline)
    commitBaselineLatestRef.current = commitBaseline

    useEffect(() => {
      if (effectiveProdutoId || effectiveIsCopyMode) {
        return
      }
      if (defaultGrupoProdutoId && defaultGrupoProdutoId !== grupoProduto) {
        setGrupoProduto(defaultGrupoProdutoId)
      }
    }, [defaultGrupoProdutoId, effectiveProdutoId, effectiveIsCopyMode, grupoProduto])

    // Baseline inicial em modo criação (após grupo opcional do contexto)
    useEffect(() => {
      if (effectiveProdutoId || effectiveIsCopyMode) {
        createBaselineCommittedRef.current = false
        return
      }
      if (createBaselineCommittedRef.current) return
      if (defaultGrupoProdutoId && !grupoProduto) return
      const id = requestAnimationFrame(() => {
        commitBaselineLatestRef.current()
        createBaselineCommittedRef.current = true
      })
      return () => cancelAnimationFrame(id)
    }, [
      effectiveProdutoId,
      effectiveIsCopyMode,
      defaultGrupoProdutoId,
      grupoProduto,
      commitBaseline,
    ])

    // Refs para evitar loops infinitos
    const hasLoadedProdutoRef = useRef(false)
    const loadedProdutoIdRef = useRef<string | null>(null)
    const lastProdutoIdRef = useRef<string | null | undefined>(null)
    const lastIsCopyModeRef = useRef<boolean>(false)
    // Ref para armazenar dados fiscais do produto carregado (sem preencher campos ainda)
    const fiscalDataFromProductRef = useRef<{
      ncm?: string
      cest?: string
      origemMercadoria?: string
      tipoProduto?: string
      indicadorProducaoEscala?: string | null
      fiscalStatus?: 'available' | 'unavailable' | undefined
    } | null>(null)
    // Ref para controlar se os dados fiscais já foram carregados no passo 3
    const hasLoadedFiscalDataRef = useRef(false)

    // Carregar grupos de produtos usando React Query (com cache)
    const formatCurrency = useCallback((value: number | string) => {
      return formatCurrencyValue(value)
    }, [])

    /**
     * Baseline imediato após GET do produto — mesmo conteúdo que `getFormSnapshot()` após hidratar o estado,
     * sem esperar o flush do React nem o `setTimeout(100)`. Evita PATCH completo quando o usuário salva rápido
     * (baseline ainda null → `montarPatchParcialEdicaoProduto` devolvia `bodyCompleto`).
     */
    const baselineSerializedFromProdutoApi = useCallback(
      (produto: Record<string, unknown>, effectiveIsCopyMode: boolean): string => {
        // Espelha exatamente as expressões usadas em loadProduto ao hidratar o estado (evita diff falso no PATCH).
        const nomeProduto = effectiveIsCopyMode
          ? (produto.nome || '')
            ? `${produto.nome} - Cópia`
            : 'Cópia '
          : produto.nome || ''
        const descricaoProduto = produto.descricao || ''
        const precoVenda = produto.valor ? formatCurrency(produto.valor as number | string) : ''
        const unidadeProduto = (produto.unidadeMedida || null) as string | null
        const grupoProduto = extrairGrupoProdutoIdDoJsonProduto(produto)
        const eanRaw =
          produto.codigoEan ?? produto.codigoBarras ?? produto.ean ?? produto.codigoEanBarras
        const codigoEanBarras =
          typeof eanRaw === 'string' || typeof eanRaw === 'number'
            ? String(eanRaw).replace(/\D/g, '').slice(0, 14)
            : ''
        const gruposComp = produto.gruposComplementos
        const gruposIds = Array.isArray(gruposComp)
          ? gruposComp.map((g: { id?: unknown }) => (g as { id: unknown }).id)
          : []
        const impressorasRaw = produto.impressoras
        const impressorasIdsArr = Array.isArray(impressorasRaw)
          ? impressorasRaw.map((i: { id?: unknown }) => (i as { id: unknown }).id)
          : []

        const snapshot: BaselineSnapshotProduto = {
          nomeProduto: String(nomeProduto),
          descricaoProduto: String(descricaoProduto),
          precoVenda,
          unidadeProduto,
          grupoProduto,
          codigoEanBarras,
          favorito: !!(produto.favorito || false),
          permiteDesconto: !!(produto.permiteDesconto || false),
          permiteAcrescimo: !!(produto.permiteAcrescimo || false),
          abreComplementos: !!(produto.abreComplementos || false),
          permiteAlterarPreco: !!(produto.permiteAlterarPreco ?? false),
          incideTaxa: !!(produto.incideTaxa ?? false),
          // Mesma semântica que `setAtivo(produto.ativo ?? true)` — unknown precisa virar boolean explícito
          ativo: produto.ativo === false ? false : true,
          grupoComplementosIds: [...gruposIds].map(id => String(id)).sort(),
          impressorasIds: [...impressorasIdsArr].map(id => String(id)).sort(),
          // Antes do passo 3: igual ao estado inicial do formulário (alinhado a `getFormSnapshot` pós-load)
          ncm: '',
          cest: '',
          origemMercadoria: '0',
          tipoProduto: '00',
          indicadorProducaoEscala: null,
        }
        return JSON.stringify(snapshot)
      },
      [formatCurrency]
    )

    const { data: grupos = [], isLoading: isLoadingGrupos } = useGruposProdutos({
      limit: 100,
      /** Painel lateral: evita refetch ao voltar o foco ao browser (mantém lista estável durante edição). */
      refetchOnWindowFocus: isEmbedded ? false : undefined,
    })

    // Carregar dados do produto se estiver editando ou copiando (apenas uma vez por produtoId)
    useEffect(() => {
      // Calcular valores dentro do useEffect para evitar dependências instáveis
      const currentCopyFromId = searchParams.get('copyFrom')
      const currentEffectiveProdutoId = produtoId || currentCopyFromId
      const currentEffectiveIsCopyMode = isCopyMode || !!currentCopyFromId

      // Se não tem produtoId, não carrega
      if (!currentEffectiveProdutoId) {
        // Resetar flags se não há produtoId
        if (lastProdutoIdRef.current !== null) {
          hasLoadedProdutoRef.current = false
          loadedProdutoIdRef.current = null
          lastProdutoIdRef.current = null
          lastIsCopyModeRef.current = false
          grupoProdutoIdCarregadoRef.current = null
        }
        return
      }

      // Verificar se o produtoId ou modo cópia realmente mudaram
      const produtoIdChanged = lastProdutoIdRef.current !== currentEffectiveProdutoId
      const copyModeChanged = lastIsCopyModeRef.current !== currentEffectiveIsCopyMode

      // Se não mudou nada, não recarrega
      if (!produtoIdChanged && !copyModeChanged && hasLoadedProdutoRef.current) {
        return
      }

      // Se mudou, resetar flags e atualizar refs
      if (produtoIdChanged || copyModeChanged) {
        hasLoadedProdutoRef.current = false
        loadedProdutoIdRef.current = null
        lastProdutoIdRef.current = currentEffectiveProdutoId
        lastIsCopyModeRef.current = currentEffectiveIsCopyMode
      }

      // Se já está carregando ou já carregou este produto no mesmo modo, não carrega novamente
      const cacheKey = `${currentEffectiveProdutoId}-${currentEffectiveIsCopyMode}`
      if (hasLoadedProdutoRef.current && loadedProdutoIdRef.current === cacheKey) {
        return
      }

      // Marcar como carregando antes de fazer a requisição para evitar múltiplas chamadas
      hasLoadedProdutoRef.current = true
      loadedProdutoIdRef.current = cacheKey

      const loadProduto = async () => {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) {
          // Se não tem token, reseta as flags
          hasLoadedProdutoRef.current = false
          loadedProdutoIdRef.current = null
          grupoProdutoIdCarregadoRef.current = null
          return
        }

        setIsLoadingProduto(!hasFormSeedRef.current)
        try {
          const response = await fetchGestorApi(`/api/produtos/${currentEffectiveProdutoId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const produto = await response.json()

            // Preenche os campos com os dados do produto
            setPrecoVenda(produto.valor ? formatCurrency(produto.valor) : '')
            setUnidadeProduto(produto.unidadeMedida || null)
            setGrupoProduto(extrairGrupoProdutoIdDoJsonProduto(produto as Record<string, unknown>))
            const eanRaw =
              produto.codigoEan ?? produto.codigoBarras ?? produto.ean ?? produto.codigoEanBarras
            setCodigoEanBarras(
              typeof eanRaw === 'string' || typeof eanRaw === 'number'
                ? String(eanRaw).replace(/\D/g, '').slice(0, 14)
                : ''
            )
            setFavorito(produto.favorito || false)
            setPermiteDesconto(produto.permiteDesconto || false)
            setPermiteAcrescimo(produto.permiteAcrescimo || false)
            setAbreComplementos(produto.abreComplementos || false)
            setPermiteAlterarPreco(produto.permiteAlterarPreco ?? false)
            setIncideTaxa(produto.incideTaxa ?? false)
            setAtivo(produto.ativo ?? true)
            const gruposIds = produto.gruposComplementos?.map((g: any) => g.id) || []
            setGrupoComplementosIds(gruposIds)
            setOriginalGrupoComplementosIds(gruposIds) // Guardar os grupos originais
            setImpressorasIds(produto.impressoras?.map((i: any) => i.id) || [])

            const menuIdsLoaded = extrairMenuIdsDoProdutoJson(produto)
            setMenusVinculadosIds(menuIdsLoaded)
            const imagemLegado = extrairImagemUrlDoProdutoJson(produto)
            if (imagemLegado) setServerPreviewImage(imagemLegado)
            const principalId = await buscarIdMenuPrincipal(token)
            const ordemImagem = unirMenuIds(previewMenuId, principalId, menuIdsLoaded)
            if (ordemImagem.length > 0) {
              const imagemMenu = await buscarPrimeiraImagemProdutoNosMenus({
                token,
                produtoId: currentEffectiveProdutoId,
                menuIds: ordemImagem,
              })
              if (imagemMenu) setServerPreviewImage(imagemMenu)
            }

            // IMPORTANTE: Não preencher campos fiscais imediatamente para evitar chamadas ao microserviço fiscal
            // Os dados fiscais serão carregados apenas quando o usuário chegar no passo 3 (ConfiguracaoFiscalStep)
            // Armazenar dados fiscais em uma ref para uso posterior
            const dadosFiscais = produto.fiscal || {}
            fiscalDataFromProductRef.current = {
              ncm: dadosFiscais.ncm || produto.ncm || '',
              cest: dadosFiscais.cest || '',
              origemMercadoria:
                dadosFiscais.origemMercadoria?.toString() ||
                produto.origemMercadoria?.toString() ||
                '',
              tipoProduto: dadosFiscais.tipoProduto || produto.tipoProduto || '',
              indicadorProducaoEscala:
                dadosFiscais.indicadorProducaoEscala || produto.indicadorProducaoEscala || null,
              fiscalStatus: produto.fiscalStatus || undefined,
            }
            // Resetar flag de carregamento fiscal quando produto muda
            hasLoadedFiscalDataRef.current = false

            baselineSerializedRef.current = baselineSerializedFromProdutoApi(
              produto as Record<string, unknown>,
              currentEffectiveIsCopyMode
            )
            grupoProdutoIdCarregadoRef.current = extrairGrupoProdutoIdDoJsonProduto(
              produto as Record<string, unknown>
            )

            if (currentEffectiveIsCopyMode) {
              const nomeOriginal = produto.nome || ''
              setNomeProduto(nomeOriginal ? `${nomeOriginal} - Cópia` : 'Cópia ')
              setDescricaoProduto(produto.descricao || '')
            } else {
              setNomeProduto(produto.nome || '')
              setDescricaoProduto(produto.descricao || '')
            }

            // Após o React aplicar o estado vindo da API (debounce curto evita baseline antes do flush)
            setTimeout(() => {
              commitBaselineLatestRef.current()
            }, 100)
          } else {
            // Se a requisição falhou, reseta as flags para permitir nova tentativa
            hasLoadedProdutoRef.current = false
            loadedProdutoIdRef.current = null
            grupoProdutoIdCarregadoRef.current = null
          }
        } catch (error) {
          console.error('Erro ao carregar produto:', error)
          // Se houve erro, reseta as flags para permitir nova tentativa
          hasLoadedProdutoRef.current = false
          loadedProdutoIdRef.current = null
          grupoProdutoIdCarregadoRef.current = null
        } finally {
          setIsLoadingProduto(false)
        }
      }

      loadProduto()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [produtoId, isCopyMode]) // Apenas quando produtoId ou isCopyMode mudarem (valores estáveis das props)

    // Carregar dados fiscais apenas quando o usuário chegar no passo 3 (ConfiguracaoFiscalStep)
    // Isso evita chamadas desnecessárias ao microserviço fiscal durante o carregamento inicial
    useEffect(() => {
      // Só carregar dados fiscais se estivermos no passo 3 e ainda não carregamos
      if (selectedPage !== 2 || hasLoadedFiscalDataRef.current) {
        return
      }

      // Se temos dados fiscais armazenados do produto carregado, preencher os campos
      if (fiscalDataFromProductRef.current) {
        const fiscalData = fiscalDataFromProductRef.current
        setNcm(fiscalData.ncm || '')
        setCest(fiscalData.cest || '')
        setOrigemMercadoria(fiscalData.origemMercadoria || '0')
        setTipoProduto(fiscalData.tipoProduto || '00')
        setIndicadorProducaoEscala(fiscalData.indicadorProducaoEscala || null)
        setFiscalStatus(fiscalData.fiscalStatus || undefined)
        hasLoadedFiscalDataRef.current = true
        // Alinha baseline aos fiscais hidratados (antes: só passo 1–2 no baseline → falso “dirty” ao abrir passo 3)
        setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 0)
      } else if (effectiveProdutoId) {
        // Se não temos dados fiscais armazenados mas estamos editando, buscar do produto
        // Isso pode acontecer se o usuário navegou diretamente para o passo 3
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) return

        const loadFiscalData = async () => {
          try {
            const response = await fetchGestorApi(`/api/produtos/${effectiveProdutoId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })

            if (response.ok) {
              const produto = await response.json()
              const dadosFiscais = produto.fiscal || {}
              setNcm(dadosFiscais.ncm || produto.ncm || '')
              setCest(dadosFiscais.cest || '')
              setOrigemMercadoria(
                dadosFiscais.origemMercadoria?.toString() ||
                  produto.origemMercadoria?.toString() ||
                  '0'
              )
              setTipoProduto(dadosFiscais.tipoProduto || produto.tipoProduto || '00')
              setIndicadorProducaoEscala(
                dadosFiscais.indicadorProducaoEscala || produto.indicadorProducaoEscala || null
              )
              setFiscalStatus(produto.fiscalStatus || undefined)
              hasLoadedFiscalDataRef.current = true
              setTimeout(() => {
                commitBaselineLatestRef.current()
              }, 0)
            }
          } catch (error) {
            console.error('Erro ao carregar dados fiscais:', error)
          }
        }

        loadFiscalData()
      }
    }, [selectedPage, effectiveProdutoId])

    // Validação do NCM via API do backend (com debounce de 600ms)
    // IMPORTANTE: Só valida se estivermos no passo 3 (ConfiguracaoFiscalStep) para evitar chamadas desnecessárias
    // Fluxo: Frontend → Backend → Microserviço Fiscal (frontend nunca se comunica diretamente com o fiscal)
    useEffect(() => {
      // Não validar se não estivermos no passo fiscal
      if (selectedPage !== 2) {
        return
      }

      // Limpar timer anterior
      if (ncmValidationTimerRef.current) {
        clearTimeout(ncmValidationTimerRef.current)
      }

      const ncmTrimmed = ncm.trim()

      // Se vazio, limpar validação sem chamar API
      if (!ncmTrimmed) {
        setNcmValidation(null)
        setIsValidatingNcm(false)
        lastValidatedNcmRef.current = ''
        return
      }

      // Se não tem 8 dígitos numéricos, mostrar erro local (sem chamar API)
      if (!/^\d{8}$/.test(ncmTrimmed)) {
        setNcmValidation(null)
        setIsValidatingNcm(false)
        lastValidatedNcmRef.current = ''
        return
      }

      // Se já validamos esse mesmo NCM, verificar se o estado está sincronizado
      if (lastValidatedNcmRef.current === ncmTrimmed) {
        // Se o estado ncmValidation não corresponde ao NCM atual, limpar e revalidar
        // Isso pode acontecer se o usuário voltar para um NCM anteriormente validado
        if (ncmValidation && ncmValidation.codigo !== ncmTrimmed) {
          // Estado dessincronizado - limpar e permitir revalidação
          setNcmValidation(null)
          lastValidatedNcmRef.current = ''
          // Continuar o fluxo para revalidar
        } else if (ncmValidation && ncmValidation.codigo === ncmTrimmed) {
          // Estado sincronizado - usar cache
          return
        }
      }

      // Debounce: aguardar 600ms após parar de digitar
      setIsValidatingNcm(true)
      ncmValidationTimerRef.current = setTimeout(async () => {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) {
          setIsValidatingNcm(false)
          return
        }

        // Timeout de 5 segundos para evitar espera longa se microserviço fiscal estiver off
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetchGestorApi(`/api/v1/fiscal/configuracoes/ncms/validar/${ncmTrimmed}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            const result = await response.json()
            setNcmValidation(result)
            lastValidatedNcmRef.current = ncmTrimmed
          } else {
            // Se erro de comunicação com fiscal, não bloquear o usuário
            setNcmValidation(null)
            lastValidatedNcmRef.current = ''
          }
        } catch (error) {
          clearTimeout(timeoutId)
          // Erro de rede ou timeout — não bloquear o usuário
          if (error instanceof DOMException && error.name === 'AbortError') {
            // Timeout: microserviço fiscal pode estar off
            console.warn('Timeout ao validar NCM - microserviço fiscal pode estar indisponível')
          }
          setNcmValidation(null)
          lastValidatedNcmRef.current = ''
        } finally {
          setIsValidatingNcm(false)
        }
      }, 600)

      // Cleanup do timer ao desmontar ou re-executar
      return () => {
        if (ncmValidationTimerRef.current) {
          clearTimeout(ncmValidationTimerRef.current)
        }
      }
    }, [ncm, selectedPage])

    // Buscar CESTs compatíveis quando o NCM é validado com sucesso
    // Fluxo: Frontend → Backend → Microserviço Fiscal (frontend nunca se comunica diretamente com o fiscal)
    // IMPORTANTE: Só busca se estivermos no passo 3 (ConfiguracaoFiscalStep) para evitar chamadas desnecessárias
    useEffect(() => {
      // Não buscar se não estivermos no passo fiscal
      if (selectedPage !== 2) {
        return
      }

      const ncmTrimmed = ncm.trim()

      // Se NCM não está validado como válido, limpar lista de CESTs
      // IMPORTANTE: Verificar se o código do NCM validado corresponde ao NCM atual
      if (
        !ncmValidation ||
        !ncmValidation.valido ||
        ncmTrimmed.length !== 8 ||
        ncmValidation.codigo !== ncmTrimmed
      ) {
        setCestsDisponiveis([])
        setCestValidation(null)
        lastFetchedNcmForCestsRef.current = ''
        return
      }

      // Se já buscamos CESTs para este NCM, não buscar novamente
      if (lastFetchedNcmForCestsRef.current === ncmTrimmed) {
        return
      }

      const fetchCests = async () => {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) return

        setIsLoadingCests(true)
        // Timeout de 5 segundos para evitar espera longa se microserviço fiscal estiver off
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetchGestorApi(`/api/v1/fiscal/configuracoes/cests/por-ncm/${ncmTrimmed}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            const result = await response.json()
            setCestsDisponiveis(Array.isArray(result) ? result : [])
            lastFetchedNcmForCestsRef.current = ncmTrimmed
          } else {
            // Se erro de comunicação com fiscal, não bloquear o usuário
            setCestsDisponiveis([])
            lastFetchedNcmForCestsRef.current = ''
          }
        } catch (error) {
          clearTimeout(timeoutId)
          // Erro de rede ou timeout — não bloquear o usuário
          if (error instanceof DOMException && error.name === 'AbortError') {
            // Timeout: microserviço fiscal pode estar off
            console.warn('Timeout ao buscar CESTs - microserviço fiscal pode estar indisponível')
          }
          setCestsDisponiveis([])
          lastFetchedNcmForCestsRef.current = ''
        } finally {
          setIsLoadingCests(false)
        }
      }

      fetchCests()
    }, [ncmValidation, ncm, selectedPage])

    // Validar CEST selecionado via API do backend (com debounce de 400ms)
    // Inclui validação de compatibilidade CEST x NCM quando o NCM está disponível.
    // Usa AbortController para cancelar requisições pendentes se o CEST/NCM mudar.
    // IMPORTANTE: Só valida se estivermos no passo 3 (ConfiguracaoFiscalStep) para evitar chamadas desnecessárias
    useEffect(() => {
      // Não validar se não estivermos no passo fiscal
      if (selectedPage !== 2) {
        return
      }

      const cestTrimmed = cest.trim()
      const ncmTrimmed = ncm.trim()

      // Se CEST vazio, limpar validação
      if (!cestTrimmed) {
        setCestValidation(null)
        setIsValidatingCest(false)
        return
      }

      // Se não tem 7 dígitos numéricos, não chamar API
      if (!/^\d{7}$/.test(cestTrimmed)) {
        setCestValidation(null)
        setIsValidatingCest(false)
        return
      }

      // Se o CEST está na lista de disponíveis para o NCM atual, já sabemos que é compatível
      const cestDisponivel = cestsDisponiveis.find(c => c.codigo === cestTrimmed)
      if (cestDisponivel) {
        setCestValidation({
          codigo: cestTrimmed,
          valido: true,
          descricao: cestDisponivel.descricao,
          segmento: cestDisponivel.segmento,
          mensagem: 'CEST válido (compatível com o NCM informado)',
        })
        setIsValidatingCest(false)
        return
      }

      // Se não está na lista, validar via API (com verificação de compatibilidade NCM)
      const abortController = new AbortController()
      setIsValidatingCest(true)

      const timer = setTimeout(async () => {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) {
          setIsValidatingCest(false)
          return
        }

        // Timeout de 5 segundos para evitar espera longa se microserviço fiscal estiver off
        const timeoutId = setTimeout(() => abortController.abort(), 5000)

        try {
          // Se temos um NCM válido, validar compatibilidade CEST x NCM diretamente
          const hasValidNcm = /^\d{8}$/.test(ncmTrimmed) && ncmValidation?.valido
          const url = hasValidNcm
            ? `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}/ncm/${ncmTrimmed}`
            : `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}`

          const response = await fetchGestorApi(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: abortController.signal,
          })

          clearTimeout(timeoutId)

          if (abortController.signal.aborted) return

          if (response.ok) {
            const result = await response.json()

            // Normalizar a resposta (endpoints retornam campos diferentes)
            if (hasValidNcm) {
              // Resposta de compatibilidade: { cestCodigo, ncmCodigo, compativel, descricaoCest, mensagem }
              setCestValidation({
                codigo: result.cestCodigo || cestTrimmed,
                valido: result.compativel ?? false,
                descricao: result.descricaoCest,
                mensagem:
                  result.mensagem ||
                  (result.compativel
                    ? 'CEST compatível com o NCM informado'
                    : 'CEST não é compatível com o NCM informado'),
              })
            } else {
              // Resposta de validação simples: { codigo, valido, descricao, segmento, mensagem }
              setCestValidation(result)
            }
          } else {
            // Erro de comunicação: não bloquear o usuário
            setCestValidation(null)
          }
        } catch (error) {
          clearTimeout(timeoutId)
          // Ignorar erros de abort (cancelamento intencional ou timeout)
          if (error instanceof DOMException && error.name === 'AbortError') {
            // Timeout: microserviço fiscal pode estar off
            console.warn('Timeout ao validar CEST - microserviço fiscal pode estar indisponível')
            return
          }
          setCestValidation(null)
        } finally {
          if (!abortController.signal.aborted) {
            setIsValidatingCest(false)
          }
        }
      }, 400)

      return () => {
        clearTimeout(timer)
        abortController.abort()
      }
    }, [cest, ncm, ncmValidation, cestsDisponiveis, selectedPage])

    // Preencher automaticamente o Indicador de Produção em Escala Relevante quando CEST for preenchido
    useEffect(() => {
      if (cest && cest.trim() !== '') {
        // Se CEST foi preenchido e o indicador está vazio, preenche automaticamente com "Produzido em Escala Relevante"
        if (!indicadorProducaoEscala) {
          setIndicadorProducaoEscala('1')
        }
      }
      // Não limpa o indicador quando CEST é removido - o usuário pode querer manter
    }, [cest]) // Apenas monitora o CEST, não o indicador

    // Função de retry: recarrega os dados do produto (resetando cache para forçar nova busca fiscal)
    const handleRetryFiscal = useCallback(() => {
      hasLoadedProdutoRef.current = false
      loadedProdutoIdRef.current = null
      // Forçar re-execução do useEffect mudando a ref interna
      const currentCopyFromId = searchParams.get('copyFrom')
      const currentEffectiveProdutoId = produtoId || currentCopyFromId
      const currentEffectiveIsCopyMode = isCopyMode || !!currentCopyFromId

      if (!currentEffectiveProdutoId) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return

      setIsLoadingProduto(true)
      fetchGestorApi(`/api/produtos/${currentEffectiveProdutoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(async response => {
          if (response.ok) {
            const produto = await response.json()
            const dadosFiscais = produto.fiscal || {}
            setNcm(dadosFiscais.ncm || produto.ncm || '')
            setCest(dadosFiscais.cest || '')
            setOrigemMercadoria(
              dadosFiscais.origemMercadoria?.toString() ||
                produto.origemMercadoria?.toString() ||
                ''
            )
            setTipoProduto(dadosFiscais.tipoProduto || produto.tipoProduto || '')
            setIndicadorProducaoEscala(
              dadosFiscais.indicadorProducaoEscala || produto.indicadorProducaoEscala || null
            )
            setFiscalStatus(produto.fiscalStatus || undefined)

            // Marcar como carregado para não duplicar
            hasLoadedProdutoRef.current = true
            loadedProdutoIdRef.current = `${currentEffectiveProdutoId}-${currentEffectiveIsCopyMode}`
          }
        })
        .catch(error => {
          console.error('Erro ao recarregar dados fiscais:', error)
        })
        .finally(() => {
          setIsLoadingProduto(false)
        })
    }, [produtoId, isCopyMode, searchParams])

    const handleNext = () => {
      if (selectedPage < 2) {
        setSelectedPage((selectedPage + 1) as 0 | 1 | 2)
      }
    }

    const handleBack = () => {
      if (selectedPage > 0) {
        setSelectedPage((selectedPage - 1) as 0 | 1 | 2)
      }
    }

    const handleBackFromFiscal = () => {
      setSelectedPage(1)
    }

    const handleNextFromFiscal = () => {
      handleSave()
    }

    const handleCancel = () => {
      // Painel lateral: o pai intercepta e exibe confirmação quando houver alterações
      if (onClose) {
        onClose()
        return
      }
      const dirty =
        baselineSerializedRef.current !== null &&
        getFormSnapshot() !== baselineSerializedRef.current
      if (!dirty) {
        router.push('/produtos')
        return
      }
      setShowDiscardDialog(true)
    }

    const handleSave = async (
      opcoes?: { salvarSomenteDadosGerais?: boolean } & NovoProdutoSaveOverrides
    ) => {
      const salvarSomenteDadosGerais = opcoes?.salvarSomenteDadosGerais === true
      const grupoIdFinal = opcoes?.grupoId ?? grupoProduto
      const gruposComplementosIdsFinal = opcoes?.gruposComplementosIds ?? grupoComplementosIds
      const impressorasIdsFinal = opcoes?.impressorasIds ?? impressorasIds
      const menuIdsFinal = opcoes?.menuIds ?? menuIds

      if (salvarSomenteDadosGerais) {
        if (!nomeProduto?.trim()) {
          showToast.error('Informe o nome do produto.')
          return false
        }
        if (!grupoIdFinal) {
          showToast.error('Selecione a categoria do produto.')
          return false
        }
        if (!unidadeProduto) {
          showToast.error('Selecione a unidade de medida.')
          return false
        }
      }

      // Validação do Preço de Venda
      const precoVendaNum = parseFloat(precoVenda.replace(/[^\d,]/g, '').replace(',', '.'))
      if (!precoVenda || precoVendaNum === 0) {
        showToast.error('O campo "Preço de Venda" não pode ser vazio ou zero.')
        return false
      }
      if (!nomeProduto?.trim()) {
        showToast.error('Informe o nome do produto.')
        return false
      }
      if (!grupoIdFinal) {
        showToast.error('Selecione a categoria do produto.')
        return false
      }

      // Validação do NCM: deve ter exatamente 8 dígitos numéricos quando preenchido
      if (!salvarSomenteDadosGerais && ncm && ncm.trim() !== '') {
        const ncmTrimmed = ncm.trim()
        if (!/^\d{8}$/.test(ncmTrimmed)) {
          showToast.error('O código NCM deve conter exatamente 8 dígitos numéricos.')
          return false
        }
        // Bloquear se a validação da API indicou NCM inválido
        if (ncmValidation && !ncmValidation.valido) {
          showToast.error(ncmValidation.mensagem || 'O código NCM informado não é válido.')
          return false
        }
        // Bloquear se ainda está validando
        if (isValidatingNcm) {
          showToast.error('Aguarde a validação do NCM antes de salvar.')
          return false
        }
      }

      // Validação do CEST: deve ter exatamente 7 dígitos numéricos quando preenchido
      if (!salvarSomenteDadosGerais && cest && cest.trim() !== '') {
        const cestTrimmed = cest.trim()
        if (!/^\d{7}$/.test(cestTrimmed)) {
          showToast.error('O código CEST deve conter exatamente 7 dígitos numéricos.')
          return false
        }
        // Bloquear se a validação da API indicou CEST inválido
        if (cestValidation && !cestValidation.valido) {
          showToast.error(cestValidation.mensagem || 'O código CEST informado não é válido.')
          return false
        }
        // Bloquear se ainda está validando
        if (isValidatingCest) {
          showToast.error('Aguarde a validação do CEST antes de salvar.')
          return false
        }
      }

      // Validação: Se o Indicador de Produção em Escala Relevante estiver preenchido, o CEST deve estar preenchido
      if (!salvarSomenteDadosGerais && indicadorProducaoEscala && (!cest || cest.trim() === '')) {
        showToast.error(
          'A informação sobre a "Produção em Escala Relevante" foi preenchida sem preencher o código CEST'
        )
        return false
      }

      let destinosPropagacao: DestinoAlteracaoProduto = {
        aplicarNoCadastroBase: false,
        menuIds: [],
      }
      const formularioSujo =
        baselineSerializedRef.current !== null &&
        getFormSnapshot() !== baselineSerializedRef.current
      if (idPersistidoParaSave && formularioSujo) {
        const resposta = await pedirConfirmacao({
          origem: 'cadastroBase',
          produtoId: idPersistidoParaSave,
        })
        if (resposta === null) return false
        destinosPropagacao = resposta
      }

      const toastId = showToast.loading(
        idPersistidoParaSave ? 'Salvando alterações...' : 'Cadastrando produto...'
      )

      onWizardSavingChange?.(true)
      const jaExistiaAntesDoSave = Boolean(idPersistidoParaSave)

      try {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) {
          showToast.errorLoading(toastId, 'Token não encontrado')
          return false
        }

        const fiscalData: Record<string, unknown> = {}
        let ncmCompatBody: string | undefined

        if (!salvarSomenteDadosGerais) {
          if (ncm && ncm.trim() !== '') fiscalData.ncm = ncm.trim()
          if (cest && cest.trim() !== '') fiscalData.cest = cest.trim()
          if (origemMercadoria !== null && origemMercadoria !== '') {
            fiscalData.origemMercadoria = parseInt(origemMercadoria, 10)
          }
          if (tipoProduto) fiscalData.tipoProduto = tipoProduto
          if (indicadorProducaoEscala) fiscalData.indicadorProducaoEscala = indicadorProducaoEscala
          ncmCompatBody = ncm?.trim() ? ncm.trim() : undefined
        }

        const isEditMode = Boolean(idPersistidoParaSave)

        const body: Record<string, unknown> = {
          nome: nomeProduto,
          descricao: descricaoProduto,
          valor: precoVendaNum,
          grupoId: grupoIdFinal,
          unidadeMedida: unidadeProduto,
          codigoEan: codigoEanBarras.trim(),
          favorito,
          abreComplementos,
          permiteAcrescimo,
          permiteDesconto,
          permiteAlterarPreco,
          incideTaxa,
          gruposComplementosIds: gruposComplementosIdsFinal,
          impressorasIds: impressorasIdsFinal,
          ...(ncmCompatBody ? { ncm: ncmCompatBody } : {}),
          ...(idPersistidoParaSave ? { ativo } : {}),
          ...(!isEditMode && menuIdsFinal && menuIdsFinal.length > 0 ? { menuIds: menuIdsFinal } : {}),
        }

        if (fiscalDeveSerEnviado(fiscalData)) {
          body.fiscal = fiscalData
        }

        const patchParcialEdicao = isEditMode
          ? montarPatchParcialEdicaoProduto(
              baselineSerializedRef.current,
              grupoProdutoIdCarregadoRef.current,
              body,
              fiscalDeveSerEnviado(fiscalData) ? fiscalData : {},
              salvarSomenteDadosGerais,
              fiscalDataFromProductRef.current,
              hasLoadedFiscalDataRef.current,
              Boolean(idPersistidoParaSave)
            )
          : body

        const url = isEditMode ? `/api/produtos/${idPersistidoParaSave}` : '/api/produtos'

        const method = isEditMode ? 'PATCH' : 'POST'

        // Se for edição e gruposComplementosIds estiver vazio, precisamos remover
        // os grupos individualmente usando DELETE, pois a API externa não processa array vazio
        const shouldRemoveGruposIndividually =
          isEditMode &&
          Array.isArray(grupoComplementosIds) &&
          grupoComplementosIds.length === 0 &&
          originalGrupoComplementosIds.length > 0

        const precisaSalvarProduto =
          !isEditMode ||
          shouldRemoveGruposIndividually ||
          Object.keys(patchParcialEdicao).length > 0

        const bodyToSend = shouldRemoveGruposIndividually
          ? { ...patchParcialEdicao, gruposComplementosIds: undefined }
          : patchParcialEdicao

        if (isEditMode && !precisaSalvarProduto) {
          const imagemPendente = pendingPreviewImageRef.current
          if (imagemPendente && idPersistidoParaSave) {
            try {
              const destinos = await resolverDestinosPadraoImagem(token)
              if (destinos.length === 0) {
                showToast.errorLoading(
                  toastId,
                  'Produto salvo. Vincule-o a um cardápio para enviar a imagem.'
                )
                return false
              }
              await persistPreviewImage(idPersistidoParaSave, imagemPendente, destinos)
              await perguntarCopiaImagemCadastroBase(
                idPersistidoParaSave,
                imagemPendente,
                destinos
              )
              showToast.successLoading(toastId, 'Imagem atualizada')
            } catch (imgErr) {
              showToast.errorLoading(
                toastId,
                imgErr instanceof Error ? imgErr.message : 'Erro ao enviar imagem'
              )
              return false
            }
          } else {
            showToast.successLoading(toastId, 'Nenhuma alteração para salvar.')
          }
          commitBaselineLatestRef.current()
          if (onSuccess) {
            onSuccess(undefined)
          }
          return true
        }

        const response = await fetchGestorApi(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyToSend),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const idJaCriado = extrairIdProdutoDaRespostaApi(error)
          if (!isEditMode && idJaCriado) {
            setIdCriadoNestaSessao(idJaCriado)
          }
          const errorMessage = error.message || 'Erro ao salvar produto'
          showToast.errorLoading(toastId, errorMessage)
          return false
        }

        const payloadSucesso = await response.json().catch(() => ({}))
        const idDaResposta = extrairIdProdutoDaRespostaApi(payloadSucesso)
        if (!isEditMode && idDaResposta) {
          setIdCriadoNestaSessao(idDaResposta)
        }
        const idSalvo = idPersistidoParaSave || idDaResposta

        // Se precisar remover grupos individualmente (quando array está vazio)
        if (shouldRemoveGruposIndividually) {
          try {
            // Remover cada grupo individualmente usando DELETE
            const deletePromises = originalGrupoComplementosIds.map(grupoId =>
              fetchGestorApi(`/api/produtos/${idSalvo}/grupos-complementos/${grupoId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
            )

            const deleteResults = await Promise.allSettled(deletePromises)

            // Verificar se alguma remoção falhou
            const failedDeletes = deleteResults.filter(
              result =>
                result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)
            )

            if (failedDeletes.length > 0) {
              console.error('Alguns grupos não puderam ser removidos:', failedDeletes)
              // Não falha o salvamento, apenas loga o erro
            }
          } catch (error) {
            console.error('Erro ao remover grupos de complementos:', error)
            // Não falha o salvamento, apenas loga o erro
          }
        }

        // Buscar o produto atualizado para atualizar o cache (apenas quando houve PATCH)
        let produtoAtualizado = null
        if (isEditMode && precisaSalvarProduto && idSalvo) {
          try {
            const produtoResponse = await fetchGestorApi(`/api/produtos/${idSalvo}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            if (produtoResponse.ok) {
              produtoAtualizado = await produtoResponse.json()
            }
          } catch (error) {
            console.error('Erro ao buscar produto atualizado:', error)
            // Continua mesmo se falhar ao buscar
          }
        }

        showToast.successLoading(
          toastId,
          isEditMode ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!'
        )

        const snapPropagar = snapshotPropagavelDePatch(
          (bodyToSend ?? {}) as Record<string, unknown>
        )
        if (snapPropagar && idSalvo && destinosPropagacao.menuIds.length > 0) {
          try {
            await aplicarNosDestinos({
              produtoId: idSalvo,
              snapshot: snapPropagar,
              destinos: {
                aplicarNoCadastroBase: false,
                menuIds: destinosPropagacao.menuIds,
              },
            })
          } catch (propErr) {
            showToast.error(
              propErr instanceof Error
                ? propErr.message
                : 'Produto salvo, mas não foi possível atualizar os cardápios selecionados'
            )
          }
        }

        const imagemPendente = pendingPreviewImageRef.current
        let menusComImagem = unirMenuIds(menuIdsFinal)
        if (imagemPendente && idSalvo) {
          try {
            const destinosImagem = await resolverDestinosPadraoImagem(
              token,
              menuIdsFinal ?? []
            )
            if (destinosImagem.length > 0) {
              await persistPreviewImage(idSalvo, imagemPendente, destinosImagem)
              menusComImagem = destinosImagem
              if (jaExistiaAntesDoSave) {
                await perguntarCopiaImagemCadastroBase(idSalvo, imagemPendente, destinosImagem)
              }
            } else {
              showToast.error('Produto salvo. Vincule-o a um cardápio para enviar a imagem.')
            }
          } catch (imgErr) {
            showToast.error(
              imgErr instanceof Error
                ? imgErr.message
                : 'Produto salvo, mas não foi possível enviar a imagem'
            )
          }
        }

        if (!jaExistiaAntesDoSave && idSalvo) {
          try {
            await perguntarVinculoOutrosMenusAposCriacao(
              idSalvo,
              menusComImagem.length > 0 ? menusComImagem : menuIdsFinal ?? [],
              imagemPendente
            )
          } catch (vinculoErr) {
            showToast.error(
              vinculoErr instanceof Error
                ? vinculoErr.message
                : 'Produto salvo, mas não foi possível vincular a outros cardápios'
            )
          }
        }
        grupoProdutoIdCarregadoRef.current = produtoAtualizado
          ? extrairGrupoProdutoIdDoJsonProduto(produtoAtualizado as Record<string, unknown>)
          : extrairGrupoProdutoIdDoJsonProduto({
              grupoId: grupoProduto ?? undefined,
            } as Record<string, unknown>)
        commitBaselineLatestRef.current()
        if (onSuccess) {
          // Passar dados do produto para atualização otimista do cache
          onSuccess(
            idSalvo
              ? {
                  produtoId: idSalvo,
                  produtoData: produtoAtualizado ?? payloadSucesso?.data ?? payloadSucesso,
                }
              : undefined
          )
        } else {
          setTimeout(() => {
            router.push('/produtos')
          }, 500)
        }
        return true
      } catch (error) {
        console.error('Erro ao salvar produto:', error)
        const errorMessage = handleApiError(error)
        showToast.errorLoading(toastId, errorMessage)
        return false
      } finally {
        onWizardSavingChange?.(false)
      }
    }

    const handleSaveRef = useRef(handleSave)
    handleSaveRef.current = handleSave

    useImperativeHandle(
      ref,
      () => ({
        goNext: () => {
          setSelectedPage(p => (p < 2 ? ((p + 1) as 0 | 1 | 2) : p))
        },
        goBack: () => {
          setSelectedPage(p => {
            if (p === 2) return 1
            if (p === 1) return 0
            return p
          })
        },
        savePartialAndClose: () => handleSaveRef.current({ salvarSomenteDadosGerais: true }),
        saveFinal: overrides => handleSaveRef.current(overrides),
        isDirty: () => {
          if (isLoadingProduto) return false
          if (baselineSerializedRef.current === null) return false
          return getFormSnapshot() !== baselineSerializedRef.current
        },
        canAdvanceCurrentPage: () => {
          const precoNum = parseFloat(
            precoVenda.replace(/[^\d,]/g, '').replace(',', '.')
          )
          if (!nomeProduto?.trim()) return false
          if (!precoVenda || precoNum <= 0) return false
          if (!unidadeProduto) return false
          const isEditMode = Boolean(effectiveProdutoId) && !effectiveIsCopyMode
          // Criação/cópia: categoria obrigatória. Edição: campo oculto, grupo já vem do produto.
          if (!isEditMode && !lockGrupoProduto && !grupoProduto) return false
          return true
        },
      }),
      [
        getFormSnapshot,
        isLoadingProduto,
        nomeProduto,
        precoVenda,
        unidadeProduto,
        grupoProduto,
        lockGrupoProduto,
        effectiveProdutoId,
        effectiveIsCopyMode,
      ]
    )

    useEffect(() => {
      onWizardStepChange?.(selectedPage)
    }, [selectedPage, onWizardStepChange])

    useEffect(() => {
      const onlyBack = fiscalStatus === 'unavailable' && selectedPage === 2
      onFiscalUnavailableChange?.(onlyBack)
    }, [fiscalStatus, selectedPage, onFiscalUnavailableChange])

    const getPageTitle = () => {
      if (effectiveIsCopyMode) {
        return 'Copiando Produto'
      }
      if (effectiveProdutoId) {
        return 'Editar Produto'
      }
      return 'Cadastrar Novo Produto'
    }

    const displayNome = nomeProduto?.trim() || 'Nome do Produto'
    const displayDescricao = descricaoProduto?.trim() || 'Descrição do Produto'
    const canToggleAtivo = Boolean(effectiveProdutoId)
    const canManageAtivo = Boolean(effectiveProdutoId)

    const hideLocalStepFooter = Boolean(isEmbedded && hideEmbeddedFormActions)
    const showInnerProdutoHeader = !(isEmbedded && hideEmbeddedHeader)
    const exibirPreviewMobile = showMobilePreview ?? true

    useEffect(() => {
      return () => {
        if (localPreviewImage?.startsWith('blob:')) {
          URL.revokeObjectURL(localPreviewImage)
        }
      }
    }, [localPreviewImage])

    const handlePreviewImageUpload = useCallback(
      async (file: File) => {
        pendingPreviewImageRef.current = file
        const blobUrl = URL.createObjectURL(file)
        setLocalPreviewImage(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return blobUrl
        })

        const produtoIdAlvo = idPersistidoParaSave
        if (!produtoIdAlvo) return

        setUploadingPreviewImage(true)
        try {
          const token = useAuthStore.getState().tenantAuth?.getAccessToken()
          if (!token) throw new Error('Token não encontrado')
          const destinos = await resolverDestinosPadraoImagem(token, menuIds ?? [])
          if (destinos.length === 0) return
          await persistPreviewImage(produtoIdAlvo, file, destinos)
          await perguntarCopiaImagemCadastroBase(produtoIdAlvo, file, destinos)
          showToast.success(
            destinos.length > 1
              ? 'Imagem atualizada no cardápio atual e no menu principal'
              : 'Imagem atualizada no menu principal'
          )
        } catch (err) {
          showToast.error(err instanceof Error ? err.message : 'Erro ao enviar imagem')
        } finally {
          setUploadingPreviewImage(false)
        }
      },
      [idPersistidoParaSave, menuIds, persistPreviewImage, resolverDestinosPadraoImagem, perguntarCopiaImagemCadastroBase]
    )

    const previewImageUpload = useMemo((): ProdutoPreviewImageUpload | undefined => {
      if (!exibirPreviewMobile) return undefined
      return {
        enabled: !uploadingPreviewImage,
        busy: uploadingPreviewImage,
        hint: 'Arraste ou clique para recortar e enviar',
        disabledHint: 'Enviando imagem…',
        onUpload: handlePreviewImageUpload,
      }
    }, [exibirPreviewMobile, uploadingPreviewImage, handlePreviewImageUpload])

    const previewProduto = useMemo(
      () => ({
        nome: nomeProduto,
        preco: parsePrecoPreviewFromInput(precoVenda),
        descricao: descricaoProduto,
        imagemUrl: localPreviewImage ?? serverPreviewImage ?? previewImagemUrl,
      }),
      [nomeProduto, precoVenda, descricaoProduto, localPreviewImage, serverPreviewImage, previewImagemUrl]
    )

    return (
      <div
        className={
          isEmbedded
            ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
            : 'flex h-full flex-col'
        }
      >
        {/* Cabeçalho interno — omitido no painel lateral (título no shell do modal) */}
        {showInnerProdutoHeader ? (
          <div className="sticky top-0 z-10 rounded-tl-lg bg-primary-bg/90 shadow-md backdrop-blur-sm">
            <div className="px-1 py-[4px] md:px-[30px]">
              <div className="rounded-lg border border-[#E0E4F3] bg-gradient-to-br from-[#F6F7FF] to-[#EEF1FB] px-6 py-3 shadow-[0_15px_45px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    {/*<div className="h-14 w-14 rounded-lg bg-white flex items-center justify-center shadow-inner text-primary">
                  <MdImage className="text-2xl" />
                </div>*/}
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        {getPageTitle()}
                      </p>
                      <h2 className="text-lg font-bold leading-tight text-primary md:text-xl">
                        {displayNome}
                      </h2>
                      <p className="text-xs text-secondary-text md:text-sm">
                        {displayDescricao}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {canToggleAtivo && (
                      <button
                        type="button"
                        onClick={() => setAtivo(prev => !prev)}
                        className="flex h-8 items-center gap-1 rounded-lg border border-[#D4D8EB] bg-info px-1.5 py-1 shadow-sm transition-colors hover:border-primary/40 md:px-3"
                      >
                        <span className="text-xs font-semibold text-secondary-text md:text-sm">
                          Visível no Jiffy POS
                        </span>
                        <span
                          className={`relative inline-flex h-5 w-12 items-center rounded-full transition-colors ${
                            ativo ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              ativo ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleCancel}
                      className="h-8 rounded-lg border border-[#D7DBEC] bg-white px-4 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-[#f4f6ff] md:px-8 md:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Indicador de steps — clicáveis para navegação direta */}
        <div className={`py-1 ${showInnerProdutoHeader ? 'px-5' : 'px-2'}`}>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedPage(0)}
              title="Ir para Informações"
              className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-all hover:scale-110 hover:shadow-md ${
                selectedPage >= 0 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-primary'
              }`}
            >
              1
            </button>
            <div
              className={`h-[2px] w-28 transition-colors ${
                selectedPage >= 1 ? 'bg-[#B7E246]' : 'bg-[#CEDCF8]'
              }`}
            />
            <button
              type="button"
              onClick={() => setSelectedPage(1)}
              title="Ir para Configurações"
              className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-all hover:scale-110 hover:shadow-md ${
                selectedPage >= 1 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-[#1D3B53]'
              }`}
            >
              2
            </button>
            <div
              className={`h-[2px] w-28 transition-colors ${
                selectedPage >= 2 ? 'bg-[#B7E246]' : 'bg-[#CEDCF8]'
              }`}
            />
            <button
              type="button"
              onClick={() => setSelectedPage(2)}
              title="Ir para Configuração Fiscal"
              className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-all hover:scale-110 hover:shadow-md ${
                selectedPage >= 2 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-[#1D3B53]'
              }`}
            >
              3
            </button>
          </div>
        </div>

        {/* Conteúdo das etapas + preview fixo à direita */}
        <ProdutoFormWithPreviewLayout
          showPreview={exibirPreviewMobile}
          preview={previewProduto}
          imageUpload={previewImageUpload}
          className={isEmbedded ? 'min-h-0 flex-1 px-2 md:px-4' : 'min-h-0 flex-1 px-1 md:px-5'}
        >
          <div className="pb-4">
          {selectedPage === 0 ? (
            <InformacoesProdutoStep
              nomeProduto={nomeProduto}
              onNomeProdutoChange={setNomeProduto}
              descricaoProduto={descricaoProduto}
              onDescricaoProdutoChange={setDescricaoProduto}
              precoVenda={precoVenda}
              onPrecoVendaChange={setPrecoVenda}
              unidadeProduto={unidadeProduto}
              onUnidadeProdutoChange={setUnidadeProduto}
              grupoProduto={grupoProduto}
              onGrupoProdutoChange={setGrupoProduto}
              lockGrupoProduto={lockGrupoProduto}
              lockedGrupoLabel={lockedGrupoLabel}
              showCategoriaField={!(!!effectiveProdutoId && !effectiveIsCopyMode)}
              codigoEanBarras={codigoEanBarras}
              onCodigoEanBarrasChange={setCodigoEanBarras}
              grupos={grupos}
              isLoadingGrupos={isLoadingGrupos}
              onNext={handleNext}
              onSaveAndClose={() => void handleSave({ salvarSomenteDadosGerais: true })}
              hideStepFooter={hideLocalStepFooter}
            />
          ) : selectedPage === 1 ? (
            <ConfiguracoesGeraisStep
              favorito={favorito}
              onFavoritoChange={setFavorito}
              permiteDesconto={permiteDesconto}
              onPermiteDescontoChange={setPermiteDesconto}
              permiteAcrescimo={permiteAcrescimo}
              onPermiteAcrescimoChange={setPermiteAcrescimo}
              abreComplementos={abreComplementos}
              onAbreComplementosChange={setAbreComplementos}
              permiteAlterarPreco={permiteAlterarPreco}
              onPermiteAlterarPrecoChange={setPermiteAlterarPreco}
              incideTaxa={incideTaxa}
              onIncideTaxaChange={setIncideTaxa}
              grupoComplementosIds={grupoComplementosIds}
              onGrupoComplementosIdsChange={setGrupoComplementosIds}
              impressorasIds={impressorasIds}
              onImpressorasIdsChange={setImpressorasIds}
              ativo={ativo}
              onAtivoChange={setAtivo}
              isEditMode={!!effectiveProdutoId && !effectiveIsCopyMode}
              canManageAtivo={canManageAtivo}
              onBack={handleBack}
              onSave={handleNext}
              onSaveAndClose={() => void handleSave({ salvarSomenteDadosGerais: true })}
              saveButtonText="Próximo"
              hideStepFooter={hideLocalStepFooter}
            />
          ) : (
            <ConfiguracaoFiscalStep
              fiscalStatus={fiscalStatus}
              onRetryFiscal={handleRetryFiscal}
              isLoadingFiscal={isLoadingProduto}
              ncm={ncm}
              onNcmChange={setNcm}
              ncmValidation={ncmValidation}
              isValidatingNcm={isValidatingNcm}
              cest={cest}
              onCestChange={setCest}
              cestsDisponiveis={cestsDisponiveis}
              isLoadingCests={isLoadingCests}
              cestValidation={cestValidation}
              isValidatingCest={isValidatingCest}
              origemMercadoria={origemMercadoria}
              onOrigemMercadoriaChange={setOrigemMercadoria}
              tipoProduto={tipoProduto}
              onTipoProdutoChange={setTipoProduto}
              indicadorProducaoEscala={indicadorProducaoEscala}
              onIndicadorProducaoEscalaChange={setIndicadorProducaoEscala}
              onBack={handleBackFromFiscal}
              onNext={handleNextFromFiscal}
              hideStepFooter={hideLocalStepFooter}
            />
          )}
          </div>
        </ProdutoFormWithPreviewLayout>

        {/* Confirmação ao sair sem salvar (páginas /produtos/novo e /editar — sem onClose do painel) */}
        {showDiscardDialog ? (
          <div
            className={cn(
              'fixed inset-0 flex items-center justify-center bg-black/50 md:p-4',
              isEmbedded ? 'z-[1400]' : 'z-50'
            )}
            role="presentation"
          >
            <div
              className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby="novo-produto-discard-title"
            >
              <h3
                id="novo-produto-discard-title"
                className="mb-4 text-lg font-semibold text-primary-text"
              >
                Alterações não salvas
              </h3>
              <p className="mb-6 text-sm text-secondary-text">
                Deseja sair sem salvar? As alterações serão perdidas.
              </p>
              <div className="flex flex-col justify-end gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowDiscardDialog(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardDialog(false)
                    router.push('/produtos')
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Sair sem salvar
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {dialogPropagacao}
      </div>
    )
  }
)

NovoProdutoContent.displayName = 'NovoProdutoContent'

/**
 * Componente principal para criação/edição de produtos
 * Replica exatamente o design e lógica do Flutter NovoProdutoWidget
 */
export const NovoProduto = forwardRef<NovoProdutoHandle, NovoProdutoProps>(
  function NovoProduto(props, ref) {
    return (
      <Suspense
        fallback={<div className="flex h-full items-center justify-center">Carregando...</div>}
      >
        <NovoProdutoContent {...props} ref={ref} />
      </Suspense>
    )
  }
)

NovoProduto.displayName = 'NovoProduto'
