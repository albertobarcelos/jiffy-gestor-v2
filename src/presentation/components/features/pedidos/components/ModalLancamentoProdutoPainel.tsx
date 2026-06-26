'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from 'react'
import Modal from '@mui/material/Modal'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import { MdAdd, MdClose, MdRemove } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import {
  PainelPedidoBackdrop,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import {
  OBSERVACAO_PEDIDO_MAX_CHARS,
  observacaoTextoParcialInvalido,
  observacaoTextoValidoParaEnvio,
} from '@/src/shared/helpers/observacaoPedido'
import {
  formatarNumeroComMilhar,
  formatarValorComplemento,
  calcularTotalComplementos,
} from '@/src/domain/services/pedido/CalculadoraPedido'
import { transformarParaReal } from '@/src/shared/utils/formatters'

const PANEL_MS = { enter: 420, exit: 380 } as const

/** Label na borda (outlined), alinhado a NovoMeioPagamento / filtros da lista */
const sxValorPainelOutlined = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
    borderRadius: '8px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: 1,
    borderColor: 'var(--color-primary)',
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 10px',
    fontSize: '0.875rem',
    textAlign: 'right',
    fontWeight: 600,
  },
} as const

const LancamentoProdutoSlide = forwardRef(function LancamentoProdutoSlide(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide ref={ref} direction="left" {...props} />
})
LancamentoProdutoSlide.displayName = 'LancamentoProdutoSlide'

/** Mesmo contrato da linha do pedido em `NovoPedidoModal` */
export interface ComplementoLancamentoPainelPayload {
  id: string
  grupoId: string
  nome: string
  valor: number
  quantidade: number
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
}

export interface ModalLancamentoProdutoPainelConfirmPayload {
  valorUnitario: number
  complementos: ComplementoLancamentoPainelPayload[]
  observacao?: string
}

export type ModalLancamentoProdutoPainelModo = 'lancamento' | 'complementos' | 'observacao'

interface ModalLancamentoProdutoPainelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chamado após o slide de saída (pode limpar `produto` no pai sem cortar a animação) */
  onAfterClose?: () => void
  produto: Produto | null
  /** Cadastro `permiteAlterarPreco` — exibe input de valor */
  mostrarAlterarPreco: boolean
  /** Cadastro `abreComplementos` ou edição via carrinho — exibe seção de seleção de complementos */
  mostrarComplementos: boolean
  /** Complementos ainda sendo carregados (GET produto por id) */
  carregandoComplementos?: boolean
  /**
   * Lançamento pelo catálogo com `abreComplementos` desativado — orienta a usar o menu ⋮ no carrinho.
   * Não exibir no fluxo "Editar complementos" da linha do pedido.
   */
  mostrarAvisoComplementosManual?: boolean
  onConfirm: (data: ModalLancamentoProdutoPainelConfirmPayload) => void
  /** Título da faixa azul (cabeçalho) */
  tituloBarra?: string
  /**
   * Valor unitário inicial fora do cadastro (ex.: linha já lançada no pedido).
   * Se omitido, usa `produto.getValor()` para o campo e para confirmar quando não há alteração de preço.
   */
  valorUnitarioInicial?: number | null
  /**
   * Quantidades por chave `${grupoId}-${complementoId}` ao abrir (ex.: edição de linha no carrinho).
   * Complementos sem entrada iniciam em 0.
   */
  quantidadesComplementosIniciais?: Record<string, number>
  /** Exibe textarea de observação do item (modo edição de linha). */
  mostrarObservacao?: boolean
  observacaoInicial?: string
  /** Duplo clique na linha do complemento — abre edição do cadastro do complemento. */
  onComplementoDoubleClick?: (complementoId: string) => void
}

function produtoTemComplementosVinculados(produto: Produto): boolean {
  const grupos = produto.getGruposComplementos()
  if (!grupos || grupos.length === 0) return false
  return grupos.some(grupo => grupo.complementos && grupo.complementos.length > 0)
}

function buildMapQuantidadesComplementos(
  produto: Produto,
  iniciais?: Record<string, number>
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const grupo of produto.getGruposComplementos()) {
    for (const comp of grupo.complementos ?? []) {
      const chave = `${grupo.id}-${comp.id}`
      const qtd = iniciais?.[chave]
      map[chave] =
        qtd != null && Number.isFinite(qtd) ? Math.max(0, Math.floor(qtd)) : 0
    }
  }
  return map
}

function montarComplementosSelecionados(
  produto: Produto,
  quantidades: Record<string, number>
): ComplementoLancamentoPainelPayload[] {
  const out: ComplementoLancamentoPainelPayload[] = []
  produto.getGruposComplementos().forEach(grupo => {
    grupo.complementos.forEach(comp => {
      const chave = `${grupo.id}-${comp.id}`
      const quantidade = Math.max(0, Math.floor(quantidades[chave] ?? 0))
      if (quantidade < 1) return
      out.push({
        id: comp.id,
        grupoId: grupo.id,
        nome: comp.nome,
        valor: comp.valor || 0,
        quantidade,
        tipoImpactoPreco: comp.tipoImpactoPreco || 'nenhum',
      })
    })
  })
  return out
}

/**
 * Painel lateral (slide pela direita): em um único passo permite ajustar preço e/ou escolher complementos antes de lançar na venda.
 */
export function ModalLancamentoProdutoPainel({
  open,
  onOpenChange,
  onAfterClose,
  produto,
  mostrarAlterarPreco,
  mostrarComplementos,
  carregandoComplementos = false,
  mostrarAvisoComplementosManual = false,
  onConfirm,
  tituloBarra = 'Lançar na venda',
  valorUnitarioInicial,
  quantidadesComplementosIniciais,
  mostrarObservacao = false,
  observacaoInicial,
  onComplementoDoubleClick,
}: ModalLancamentoProdutoPainelProps) {
  const [internalOpen, setInternalOpen] = useState(open)
  const [valorInput, setValorInput] = useState('')
  const [quantidadesComplementos, setQuantidadesComplementos] = useState<Record<string, number>>(
    {}
  )
  const [observacaoInput, setObservacaoInput] = useState('')
  const painelJaAbertoRef = useRef(false)

  useEffect(() => {
    if (open) setInternalOpen(true)
  }, [open])

  const handleSlideExited = useCallback(() => {
    setInternalOpen(false)
    onAfterClose?.()
  }, [onAfterClose])

  // Inicializa preço/complementos ao abrir (uma vez por abertura — não sobrescreve toggles durante a edição)
  useEffect(() => {
    if (!open) {
      painelJaAbertoRef.current = false
      return
    }
    if (!produto) return
    if (painelJaAbertoRef.current) return
    painelJaAbertoRef.current = true

    const base =
      valorUnitarioInicial !== undefined && valorUnitarioInicial !== null
        ? valorUnitarioInicial
        : produto.getValor()
    setValorInput(formatarNumeroComMilhar(Number.isFinite(base) && base >= 0 ? base : 0))
    setQuantidadesComplementos(
      buildMapQuantidadesComplementos(produto, quantidadesComplementosIniciais)
    )
    setObservacaoInput(observacaoInicial ?? '')
  }, [open, produto, valorUnitarioInicial, quantidadesComplementosIniciais, observacaoInicial])

  const complementosSelecionadosPreview = useMemo(() => {
    if (!produto || !mostrarComplementos) return []
    return montarComplementosSelecionados(produto, quantidadesComplementos)
  }, [produto, mostrarComplementos, quantidadesComplementos])

  const totalComplementosPreview = useMemo(() => {
    if (!mostrarComplementos || complementosSelecionadosPreview.length === 0) return 0
    return calcularTotalComplementos({
      produtoId: '',
      nome: '',
      quantidade: 1,
      valorUnitario: 0,
      complementos: complementosSelecionadosPreview,
    })
  }, [mostrarComplementos, complementosSelecionadosPreview])

  const parseValorMoedaParaNumero = (texto: string): number | null => {
    const limpo = texto.replace(/\./g, '').replace(',', '.').trim()
    if (limpo === '') return null
    const n = parseFloat(limpo)
    return Number.isFinite(n) ? n : null
  }

  const handleConfirmar = () => {
    if (!produto) return

    if (mostrarObservacao) {
      const trimmed = observacaoInput.trim()
      if (trimmed && !observacaoTextoValidoParaEnvio(trimmed)) {
        showToast.error('Observação do item deve ter entre 3 e 100 caracteres.')
        return
      }

      let valorUnitario = produto.getValor()
      if (
        valorUnitarioInicial !== undefined &&
        valorUnitarioInicial !== null &&
        Number.isFinite(valorUnitarioInicial)
      ) {
        valorUnitario = valorUnitarioInicial
      }

      onConfirm({
        valorUnitario,
        complementos: [],
        observacao: trimmed || undefined,
      })
      onOpenChange(false)
      return
    }

    let valorUnitario = produto.getValor()
    if (mostrarAlterarPreco) {
      const v = parseValorMoedaParaNumero(valorInput)
      if (v === null || v < 0) {
        showToast.error('Informe um valor válido.')
        return
      }
      if (v === 0) {
        showToast.error('O valor unitário deve ser maior que zero.')
        return
      }
      valorUnitario = v
    } else if (
      valorUnitarioInicial !== undefined &&
      valorUnitarioInicial !== null &&
      Number.isFinite(valorUnitarioInicial)
    ) {
      // Linha já lançada sem edição de preço no cadastro: mantém o valor da linha
      valorUnitario = valorUnitarioInicial
    }

    const complementos = mostrarComplementos
      ? montarComplementosSelecionados(produto, quantidadesComplementos)
      : []

    onConfirm({ valorUnitario, complementos })
    onOpenChange(false)
  }

  const ajustarQuantidadeComplemento = (chave: string, delta: number) => {
    setQuantidadesComplementos(prev => {
      const atual = Math.max(0, Math.floor(prev[chave] ?? 0))
      return { ...prev, [chave]: Math.max(0, atual + delta) }
    })
  }

  if (!internalOpen) return null

  const tituloPainel = produto ? produto.getNome() : 'Produto'

  return (
    <Modal
      open={internalOpen}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onOpenChange(false)
        }
      }}
      closeAfterTransition
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        zIndex: 1400,
        '& .MuiBackdrop-root': {
          zIndex: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
      }}
    >
      <LancamentoProdutoSlide
        in={open}
        timeout={{ enter: PANEL_MS.enter, exit: PANEL_MS.exit }}
        onExited={handleSlideExited}
        appear
        mountOnEnter
        unmountOnExit={false}
      >
        <div
          className="absolute right-0 top-0 z-[1] flex h-[100dvh] max-h-[100dvh] w-[95vw] max-w-[100vw] flex-col overflow-hidden rounded-bl-xl rounded-tl-xl bg-white shadow-xl outline-none sm:w-[90vw] md:w-[min(900px,35vw)]"
          role="dialog"
          aria-modal
          aria-labelledby="modal-lancamento-produto-titulo"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <h2
              id="modal-lancamento-produto-titulo"
              className="font-exo min-w-0 flex-1 text-lg font-semibold text-primary-text sm:text-xl"
            >
              {tituloBarra}
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              aria-label="Fechar"
            >
              <MdClose size={22} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f9fafb] px-4 py-4">
            <div className="shrink-0">
              <p className="font-nunito mb-2 text-lg font-medium text-primary-text">{tituloPainel}</p>
              <div className="h-[1px] border-t-2 border-primary/70 flex-shrink-0"></div>
            </div>

            {mostrarAlterarPreco ? (
              <div className="w-full grid grid-cols-2 border-b border-gray-200 pb-4 items-center gap-2 mb-6 mt-4">
                <p className="col-span-1 mt-4 mb-4 text-base text-right font-medium text-primary">Definir preço manual:</p>
                <Input
                  id="vl-unit-lancamento"
                  label="Valor (R$)"
                  type="text"
                  inputMode="decimal"
                  value={valorInput}
                  onChange={e => {
                    const apenasNumeros = e.target.value.replace(/\D/g, '')
                    if (apenasNumeros === '') {
                      setValorInput('')
                      return
                    }
                    const valorCentavos = parseInt(apenasNumeros, 10)
                    const valorReais = valorCentavos / 100
                    setValorInput(formatarNumeroComMilhar(valorReais))
                  }}
                  size="small"
                  placeholder="0,00"
                  autoComplete="off"
                  InputLabelProps={{ shrink: true }}
                  sx={sxValorPainelOutlined}
                />
              </div>
            ) : null}

            {mostrarComplementos && produto ? (
              <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <h3 className="font-nunito mb-2 shrink-0 text-base font-semibold text-primary">
                  Complementos
                </h3>
                {carregandoComplementos ? (
                  <p className="text-sm text-secondary-text">Carregando complementos...</p>
                ) : produtoTemComplementosVinculados(produto) ? (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {produto.getGruposComplementos().map(grupo => (
                      <div key={grupo.id} className="rounded-md border border-gray-100 px-2 py-1.5">
                        <h4 className="mb-1 text-sm font-semibold text-gray-800">{grupo.nome}</h4>
                        {grupo.complementos && grupo.complementos.length > 0 ? (
                          <div className="space-y-0.5">
                            {grupo.complementos.map(comp => {
                              const chaveUnica = `${grupo.id}-${comp.id}`
                              const quantidade = Math.max(
                                0,
                                Math.floor(quantidadesComplementos[chaveUnica] ?? 0)
                              )
                              const valor = comp.valor || 0
                              const tipoIp = comp.tipoImpactoPreco || 'nenhum'
                              return (
                                <div
                                  key={chaveUnica}
                                  className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1"
                                >
                                  <span
                                    className={`font-nunito min-w-0 flex-1 truncate text-sm${
                                      onComplementoDoubleClick ? ' cursor-pointer' : ''
                                    }`}
                                    title={
                                      onComplementoDoubleClick
                                        ? 'Duplo clique para editar o complemento'
                                        : undefined
                                    }
                                    onDoubleClick={() => onComplementoDoubleClick?.(comp.id)}
                                  >
                                    {comp.nome}
                                  </span>
                                  <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
                                    {formatarValorComplemento(valor, tipoIp)}
                                  </span>
                                  <div className="flex shrink-0 items-center justify-center gap-0.5 rounded border border-gray-200 bg-white">
                                    <button
                                      type="button"
                                      aria-label="Diminuir quantidade do complemento"
                                      disabled={quantidade <= 0}
                                      onClick={() => ajustarQuantidadeComplemento(chaveUnica, -1)}
                                      className="flex h-7 w-7 items-center justify-center bg-primary/10 font-normal text-gray-600 transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <MdRemove className="h-4 w-4" />
                                    </button>
                                    <span
                                      className="min-w-[1.25rem] text-center text-sm font-normal tabular-nums text-gray-800"
                                      aria-label="Quantidade do complemento"
                                    >
                                      {quantidade}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label="Aumentar quantidade do complemento"
                                      onClick={() => ajustarQuantidadeComplemento(chaveUnica, 1)}
                                      className="flex h-7 w-7 items-center justify-center bg-primary/10 font-normal text-gray-600 transition-colors hover:bg-primary/20"
                                    >
                                      <MdAdd className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum item neste grupo.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Este produto não possui grupos de complementos vinculados.
                  </p>
                )}
              </div>
            ) : null}

            {mostrarObservacao ? (
              <div className="mt-4 shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <h3 className="font-nunito mb-2 text-base font-semibold text-primary">
                  Observação do item
                </h3>
                <Textarea
                  label="Observação"
                  placeholder="Ex.: sem cebola, bem passado…"
                  value={observacaoInput}
                  onChange={e => setObservacaoInput(e.target.value)}
                  inputProps={{ maxLength: OBSERVACAO_PEDIDO_MAX_CHARS }}
                  error={observacaoTextoParcialInvalido(observacaoInput)}
                  helperText={
                    observacaoTextoParcialInvalido(observacaoInput)
                      ? 'Mínimo 3 caracteres (ou deixe vazio).'
                      : `${observacaoInput.length}/${OBSERVACAO_PEDIDO_MAX_CHARS} caracteres`
                  }
                  rows={4}
                />
              </div>
            ) : null}

            {mostrarAvisoComplementosManual ? (
              <div className="mt-4 shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <h3 className="font-nunito mb-2 text-base font-semibold text-primary">Complementos</h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  Os complementos não abrem automaticamente ao adicionar este produto. Depois de
                  incluí-lo no pedido, toque nos{' '}
                  <span className="font-semibold text-gray-800">três pontinhos (⋮)</span> na coluna{' '}
                  <span className="font-semibold text-gray-800">Ações</span> e escolha{' '}
                  <span className="font-semibold text-gray-800">Editar complementos</span>.
                </p>
              </div>
            ) : null}

          </div>

          {mostrarComplementos && !mostrarObservacao ? (
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2.5"
              aria-live="polite"
            >
              <span className="text-sm font-medium text-gray-600">Total dos complementos</span>
              <span className="text-base font-semibold tabular-nums text-primary">
                {transformarParaReal(totalComplementosPreview)}
              </span>
            </div>
          ) : null}

          {/* Rodapé em faixa — mesmo critério que `JiffySidePanelModal` footerVariant="bar" (Editar Produto / wizard) */}
          <div className="grid w-full shrink-0 border-t border-gray-200" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="min-w-0 border-r border-gray-200">
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                onClick={() => onOpenChange(false)}
                className="h-12 min-h-12 w-full font-semibold shadow-none"
                sx={footerBarPrimaryMutedSx(true)}
              >
                Cancelar
              </Button>
            </div>
            <div className="min-w-0">
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={handleConfirmar}
                disabled={
                  (mostrarComplementos && carregandoComplementos) ||
                  (mostrarObservacao && observacaoTextoParcialInvalido(observacaoInput))
                }
                className="h-12 min-h-12 w-full font-semibold shadow-none"
                sx={footerSavePrimaryBarSx(false)}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      </LancamentoProdutoSlide>
    </Modal>
  )
}
