'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type Ref,
} from 'react'
import Modal from '@mui/material/Modal'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import { MdClose } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import {
  PainelPedidoBackdrop,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'

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
}

interface ModalLancamentoProdutoPainelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chamado após o slide de saída (pode limpar `produto` no pai sem cortar a animação) */
  onAfterClose?: () => void
  produto: Produto | null
  /** Cadastro `permiteAlterarPreco` — exibe input de valor */
  mostrarAlterarPreco: boolean
  /** `abreComplementos` e há grupos com complementos — exibe lista */
  mostrarComplementos: boolean
  onConfirm: (data: ModalLancamentoProdutoPainelConfirmPayload) => void
}

function formatarNumeroComMilhar(valor: number): string {
  if (valor === 0) return '0,00'
  const partes = valor.toFixed(2).split('.')
  const parteInteira = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${parteInteira},${partes[1]}`
}

function formatarValorComplemento(
  valor: number,
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
): string {
  const valorFormatado = formatarNumeroComMilhar(valor)
  const tipo = tipoImpactoPreco || 'nenhum'
  switch (tipo) {
    case 'aumenta':
      return `+ ${valorFormatado}`
    case 'diminui':
      return `- ${valorFormatado}`
    default:
      return `( ${valorFormatado} )`
  }
}

function montarComplementosSelecionados(
  produto: Produto,
  chaves: string[]
): ComplementoLancamentoPainelPayload[] {
  const out: ComplementoLancamentoPainelPayload[] = []
  produto.getGruposComplementos().forEach(grupo => {
    grupo.complementos.forEach(comp => {
      const chave = `${grupo.id}-${comp.id}`
      if (chaves.includes(chave)) {
        out.push({
          id: comp.id,
          grupoId: grupo.id,
          nome: comp.nome,
          valor: comp.valor || 0,
          quantidade: 1,
          tipoImpactoPreco: comp.tipoImpactoPreco || 'nenhum',
        })
      }
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
  onConfirm,
}: ModalLancamentoProdutoPainelProps) {
  const [internalOpen, setInternalOpen] = useState(open)
  const [valorInput, setValorInput] = useState('')
  const [chavesComplementos, setChavesComplementos] = useState<string[]>([])

  useEffect(() => {
    if (open) setInternalOpen(true)
  }, [open])

  const handleSlideExited = useCallback(() => {
    setInternalOpen(false)
    onAfterClose?.()
  }, [onAfterClose])

  useEffect(() => {
    if (!open || !produto) return
    const base = produto.getValor()
    setValorInput(formatarNumeroComMilhar(Number.isFinite(base) && base >= 0 ? base : 0))
    setChavesComplementos([])
  }, [open, produto])

  const parseValorMoedaParaNumero = (texto: string): number | null => {
    const limpo = texto.replace(/\./g, '').replace(',', '.').trim()
    if (limpo === '') return null
    const n = parseFloat(limpo)
    return Number.isFinite(n) ? n : null
  }

  const handleConfirmar = () => {
    if (!produto) return

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
    }

    const complementos = mostrarComplementos
      ? montarComplementosSelecionados(produto, chavesComplementos)
      : []

    onConfirm({ valorUnitario, complementos })
    onOpenChange(false)
  }

  const toggleComplemento = (grupoId: string, complementoId: string) => {
    const chave = `${grupoId}-${complementoId}`
    setChavesComplementos(prev =>
      prev.includes(chave) ? prev.filter(c => c !== chave) : [...prev, chave]
    )
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
          className="absolute right-0 top-0 z-[1] flex h-[100dvh] max-h-[100dvh] w-[min(28rem,100vw)] flex-col overflow-hidden rounded-bl-xl rounded-tl-xl bg-white shadow-xl outline-none sm:w-[min(540px,45vw)]"
          role="dialog"
          aria-modal
          aria-labelledby="modal-lancamento-produto-titulo"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-primary px-4 py-3">
            <h2
              id="modal-lancamento-produto-titulo"
              className="font-exo min-w-0 flex-1 text-lg font-semibold text-white sm:text-xl"
            >
              Lançar na venda
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

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f9fafb] px-4 py-4">
            <p className="font-nunito mb-2 text-lg font-medium text-primary-text">{tituloPainel}</p>
            <div className="h-[1px] border-t-2 border-primary/70 flex-shrink-0"></div>
            

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
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="font-nunito mb-3 text-base font-semibold text-primary">Complementos</h3>
                {produto.getGruposComplementos().length > 0 ? (
                  <div className="max-h-[min(50vh,360px)] space-y-4 overflow-y-auto pr-1">
                    {produto.getGruposComplementos().map(grupo => (
                      <div key={grupo.id} className="rounded-lg border border-gray-100 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-gray-800">{grupo.nome}</h4>
                        {grupo.complementos && grupo.complementos.length > 0 ? (
                          <div className="space-y-2">
                            {grupo.complementos.map(comp => {
                              const chaveUnica = `${grupo.id}-${comp.id}`
                              const isSel = chavesComplementos.includes(chaveUnica)
                              const valor = comp.valor || 0
                              const tipoIp = comp.tipoImpactoPreco || 'nenhum'
                              return (
                                <div
                                  key={chaveUnica}
                                  className="flex cursor-pointer items-center justify-between rounded bg-gray-50 p-2 hover:bg-gray-100"
                                  onClick={() => toggleComplemento(grupo.id, comp.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSel}
                                      onChange={() => toggleComplemento(grupo.id, comp.id)}
                                      onClick={e => e.stopPropagation()}
                                      className="h-4 w-4"
                                    />
                                    <span className="font-nunito text-sm">{comp.nome}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-primary">
                                    {formatarValorComplemento(valor, tipoIp)}
                                  </span>
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
                    Nenhum complemento configurado.
                  </p>
                )}
              </div>
            ) : null}

          </div>

          {/* Rodapé em faixa — mesmo critério que `JiffySidePanelModal` footerVariant="bar" (Editar Produto / wizard) */}
          <div className="grid w-full shrink-0 border-t border-gray-200" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="min-w-0 border-r border-gray-200">
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={handleConfirmar}
                className="h-12 min-h-12 w-full font-semibold shadow-none"
                sx={footerSavePrimaryBarSx(true)}
              >
                Confirmar
              </Button>
            </div>
            <div className="min-w-0">
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                onClick={() => onOpenChange(false)}
                className="h-12 min-h-12 w-full font-semibold shadow-none"
                sx={footerBarPrimaryMutedSx(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </LancamentoProdutoSlide>
    </Modal>
  )
}
