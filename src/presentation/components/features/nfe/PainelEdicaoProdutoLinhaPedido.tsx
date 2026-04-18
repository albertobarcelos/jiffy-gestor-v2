'use client'

import { MdAdd, MdRemove } from 'react-icons/md'
import { Input } from '@/src/presentation/components/ui/input'
import { Switch } from '@/src/presentation/components/ui/switch'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { transformarParaReal } from '@/src/shared/utils/formatters'

/** Mesmo estilo do input de valor em `ModalLancamentoProdutoPainel` */
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

/** Campos da linha necessários para os totais em tempo real */
export interface ProdutoLinhaPainelEdicao {
  valorUnitario: number
  complementos: Array<{
    valor: number
    quantidade: number
    tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
  }>
}

export interface PainelEdicaoProdutoLinhaPedidoProps {
  open: boolean
  onClose: () => void
  onConfirmar: () => void
  title: string
  subtitle?: string
  produtoLinha: ProdutoLinhaPainelEdicao
  permiteDesconto: boolean
  permiteAcrescimo: boolean
  quantidadeEdicao: number
  onQuantidadeEdicaoChange: (valor: number) => void
  ehAcrescimo: boolean
  onEhAcrescimoChange: (valor: boolean) => void
  ehPorcentagem: boolean
  onEhPorcentagemChange: (valor: boolean) => void
  valorDescontoAcrescimo: string
  onValorDescontoAcrescimoChange: (valor: string) => void
  /** Cadastro: permite alterar preço manual na linha */
  permiteAlterarPreco: boolean
  /** Valor unitário formatado (centavos digitando), só editável se `permiteAlterarPreco` */
  valorUnitarioInput: string
  onValorUnitarioInputChange: (valor: string) => void
  panelClassName?: string
  zIndex?: number
}

function formatarNumeroComMilhar(valor: number): string {
  if (valor === 0) return '0,00'
  const partes = valor.toFixed(2).split('.')
  const parteInteira = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${parteInteira},${partes[1]}`
}

function parseValorMoedaParaNumero(texto: string): number | null {
  const limpo = texto.replace(/\./g, '').replace(',', '.').trim()
  if (limpo === '') return null
  const n = parseFloat(limpo)
  return Number.isFinite(n) ? n : null
}

/** Primeira letra maiúscula, demais minúsculas (evita tudo em CAPS vindo do cadastro). */
function formatoSentencaPt(texto: string): string {
  const t = texto.trim()
  if (!t) return ''
  return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1).toLocaleLowerCase('pt-BR')
}

/**
 * Painel lateral (slide): edição de quantidade e desconto/acréscimo na linha do pedido.
 * Estado controlado pelo pai (`NovoPedidoModal`).
 */
export function PainelEdicaoProdutoLinhaPedido({
  open,
  onClose,
  onConfirmar,
  title,
  subtitle = 'Altere quantidade e desconto/acréscimo',
  produtoLinha,
  permiteDesconto,
  permiteAcrescimo,
  quantidadeEdicao,
  onQuantidadeEdicaoChange,
  ehAcrescimo,
  onEhAcrescimoChange,
  ehPorcentagem,
  onEhPorcentagemChange,
  valorDescontoAcrescimo,
  onValorDescontoAcrescimoChange,
  permiteAlterarPreco,
  valorUnitarioInput,
  onValorUnitarioInputChange,
  panelClassName = 'w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,35vw)]',
  zIndex = 1400,
}: PainelEdicaoProdutoLinhaPedidoProps) {
  const valorUnitarioEfetivo = (() => {
    if (!permiteAlterarPreco) return produtoLinha.valorUnitario
    const v = parseValorMoedaParaNumero(valorUnitarioInput)
    if (v !== null && v >= 0) return v
    return produtoLinha.valorUnitario
  })()

  const subtotalPreview =
    valorUnitarioEfetivo * quantidadeEdicao +
    produtoLinha.complementos.reduce((sum, comp) => {
      const tipo = comp.tipoImpactoPreco || 'nenhum'
      const valorTotal = comp.valor * comp.quantidade * quantidadeEdicao
      if (tipo === 'aumenta') return sum + valorTotal
      if (tipo === 'diminui') return sum - valorTotal
      return sum
    }, 0)

  let valorCalculadoFooter = 0
  if (valorDescontoAcrescimo && valorDescontoAcrescimo !== '0') {
    if (ehPorcentagem) {
      const percentual = parseFloat(valorDescontoAcrescimo) || 0
      valorCalculadoFooter = subtotalPreview * (percentual / 100)
    } else {
      valorCalculadoFooter =
        parseFloat(valorDescontoAcrescimo.replace(/\./g, '').replace(',', '.')) || 0
    }
  }

  const totalFooter = ehAcrescimo
    ? subtotalPreview + valorCalculadoFooter
    : subtotalPreview - valorCalculadoFooter

  // Só neste painel: formato sentença. O `JiffySidePanelModal` aplica `uppercase` no <p> do subtitle;
  // o span com `normal-case` neutraliza para exibir o texto como passamos (sem mudar o componente base).
  const subtituloFormatado = formatoSentencaPt(subtitle)

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      zIndex={zIndex}
      title={title}
      subtitle={<span className="normal-case">{subtituloFormatado}</span>}
      panelClassName={panelClassName}
      footerVariant="bar"
      footerActions={{
        showSave: true,
        saveLabel: 'Confirmar',
        onSave: onConfirmar,
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        barActionOrder: ['save', 'cancel'],
      }}
    >
      <div className="bg-gray-50 px-4 py-4 md:px-6">
        {permiteAlterarPreco ? (
          <div className="mb-6 mt-4 grid w-full grid-cols-2 items-center gap-2 border-b border-gray-200 pb-4">
            <p className="col-span-1 mb-4 mt-4 text-right text-base font-medium text-primary">
              Definir preço manual:
            </p>
            <Input
              id="edicao-painel-vl-unit"
              label="Valor (R$)"
              type="text"
              inputMode="decimal"
              value={valorUnitarioInput}
              onChange={e => {
                const apenasNumeros = e.target.value.replace(/\D/g, '')
                if (apenasNumeros === '') {
                  onValorUnitarioInputChange('')
                  return
                }
                const valorCentavos = parseInt(apenasNumeros, 10)
                const valorReais = valorCentavos / 100
                onValorUnitarioInputChange(formatarNumeroComMilhar(valorReais))
              }}
              size="small"
              placeholder="0,00"
              autoComplete="off"
              InputLabelProps={{ shrink: true }}
              sx={sxValorPainelOutlined}
            />
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-1 text-xs font-medium text-gray-600">Valor unitário</p>
            <p className="text-lg font-semibold text-gray-900">
              {transformarParaReal(produtoLinha.valorUnitario)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Preço fixo no cadastro — alteração manual desativada para este produto.
            </p>
          </div>
        )}

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-primary">Quantidade</div>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onQuantidadeEdicaoChange(Math.max(1, quantidadeEdicao - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
            >
              <MdRemove className="h-5 w-5" />
            </button>
            <div className="min-w-[60px] text-center text-2xl font-semibold text-gray-900">
              {quantidadeEdicao.toFixed(0)}
            </div>
            <button
              type="button"
              onClick={() => onQuantidadeEdicaoChange(quantidadeEdicao + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600"
            >
              <MdAdd className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-center text-sm font-semibold text-primary">
            Desconto/Acréscimo
          </div>
          <div className="flex min-h-24 flex-col items-center gap-1">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex min-w-[100px] flex-col items-center gap-1">
                <span className="text-xs text-gray-600">
                  {ehAcrescimo ? 'Acréscimo' : 'Desconto'}
                </span>
                <Switch
                  checked={ehAcrescimo}
                  onChange={e => {
                    onEhAcrescimoChange(e.target.checked)
                    onValorDescontoAcrescimoChange('0')
                  }}
                  color={ehAcrescimo ? 'success' : 'error'}
                  sx={
                    !ehAcrescimo
                      ? {
                          '& .MuiSwitch-switchBase': {
                            color: '#d32f2f',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#d32f2f',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#d32f2f',
                          },
                          '& .MuiSwitch-track': {
                            backgroundColor: '#d32f2f',
                          },
                        }
                      : undefined
                  }
                />
              </div>

              <div className="max-w-[100px] flex-1">
                <Input
                  type="text"
                  value={valorDescontoAcrescimo}
                  onChange={e => {
                    let valorStr = e.target.value.replace(/\./g, '').replace(',', '').replace(/\D/g, '')
                    if (valorStr === '') {
                      onValorDescontoAcrescimoChange('0')
                      return
                    }
                    if (ehPorcentagem) {
                      const valorNum = parseInt(valorStr, 10)
                      const valorLimitado = Math.min(100, valorNum)
                      onValorDescontoAcrescimoChange(valorLimitado.toString())
                    } else {
                      const valorCentavos = parseInt(valorStr, 10)
                      const valorReais = valorCentavos / 100
                      onValorDescontoAcrescimoChange(formatarNumeroComMilhar(valorReais))
                    }
                  }}
                  disabled={
                    (ehAcrescimo && !permiteAcrescimo) || (!ehAcrescimo && !permiteDesconto)
                  }
                  className="w-full text-center"
                  placeholder={ehPorcentagem ? '0' : '0,00'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      padding: '4px 8px',
                      '& input': {
                        padding: '4px 8px',
                        textAlign: 'center',
                      },
                    },
                  }}
                />
              </div>

              <div className="flex min-w-[100px] flex-col items-center gap-1">
                <span className="text-xs text-gray-600">
                  {ehPorcentagem ? 'Porcentagem' : 'Valor Fixo'}
                </span>
                <Switch
                  checked={ehPorcentagem}
                  onChange={e => {
                    onEhPorcentagemChange(e.target.checked)
                    onValorDescontoAcrescimoChange('0')
                  }}
                  color="default"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#000000',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#000000',
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: '#9ca3af',
                    },
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              {((!ehAcrescimo && !permiteDesconto) || (ehAcrescimo && !permiteAcrescimo)) && (
                <div className="mt-1 text-center text-xs text-red-600">
                  {!ehAcrescimo
                    ? 'Permitir desconto está desativado para este produto'
                    : 'Permitir acréscimo está desativado para este produto'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">
                {transformarParaReal(Math.max(0, totalFooter))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </JiffySidePanelModal>
  )
}
