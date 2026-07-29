'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdDelete } from 'react-icons/md'
import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  formatBRLFromMaskedInput,
  parseBRLToNumber,
  transformarParaReal,
} from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { useHorizontalDragScroll } from '@/src/presentation/hooks/useHorizontalDragScroll'
import type { CheckoutPagamentoItem } from '../../../shared/utils/checkoutPagamentosUtils'
import {
  calcularTrocoCheckout,
  calcularTrocoReceberCheckout,
  pagamentosCobremTotalCheckout,
  restantePagamentoCheckout,
  resolverAdicaoPagamentoCheckout,
  somaPagamentosCheckout,
} from '../../../shared/utils/checkoutPagamentosUtils'
import { isMeioPagamentoDinheiro } from '../../../shared/utils/isMeioPagamentoDinheiro'
import { obterIconeMeioPagamento } from '../../../shared/utils/obterIconeMeioPagamento'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

const MEIO_CARD_CLASS = 'h-[88px] w-[132px] shrink-0'

type DeliveryCheckoutPagamentoModalProps = {
  total: number
  meiosPagamento: MeioPagamentoPublicoDTO[]
  loadingMeios: boolean
  pagamentos: CheckoutPagamentoItem[]
  onChangePagamentos: (value: CheckoutPagamentoItem[]) => void
  onClose: () => void
  onVoltar: () => void
  onContinuar: () => void
}

function maskFromNumber(value: number): string {
  if (value <= 0) return ''
  return formatBRLFromMaskedInput(value)
}

type PrecisaTrocoOpcao = null | boolean

export function DeliveryCheckoutPagamentoModal({
  total,
  meiosPagamento,
  loadingMeios,
  pagamentos,
  onChangePagamentos,
  onClose: _onClose,
  onVoltar,
  onContinuar,
}: DeliveryCheckoutPagamentoModalProps) {
  const [meioSelecionadoId, setMeioSelecionadoId] = useState<string | null>(null)
  const [valorInput, setValorInput] = useState('')
  /** null = ainda não respondeu (só dinheiro). */
  const [precisaTroco, setPrecisaTroco] = useState<PrecisaTrocoOpcao>(null)
  const [cedulaInput, setCedulaInput] = useState('')

  const {
    scrollRef,
    isDragging,
    hasMovedRef,
    handleMouseDown,
    handleWheel,
  } = useHorizontalDragScroll<HTMLDivElement>()

  const meiosById = useMemo(() => {
    const map = new Map<string, MeioPagamentoPublicoDTO>()
    for (const m of meiosPagamento) map.set(m.id, m)
    return map
  }, [meiosPagamento])

  const totalLancado = somaPagamentosCheckout(pagamentos)
  const restante = restantePagamentoCheckout(total, pagamentos)
  const pagamentoCompleto = restante <= 0.01 && pagamentos.length > 0
  const cardsDesabilitados = pagamentoCompleto

  const meioSelecionado = meioSelecionadoId
    ? (meiosById.get(meioSelecionadoId) ?? null)
    : null
  const ehDinheiro = isMeioPagamentoDinheiro(meioSelecionado)

  const valorPagamento = valorInput.trim() ? parseBRLToNumber(valorInput) : null
  const valorCedula = cedulaInput.trim() ? parseBRLToNumber(cedulaInput) : null
  const trocoPreview =
    ehDinheiro && precisaTroco === true
      ? calcularTrocoReceberCheckout(valorCedula, restante)
      : 0

  const isDinheiroId = (meioPagamentoId: string) =>
    isMeioPagamentoDinheiro(meiosById.get(meioPagamentoId))

  const trocoReceberPersistido = useMemo(
    () => calcularTrocoCheckout(total, pagamentos, isDinheiroId),
    [total, pagamentos, meiosById]
  )

  const limparSelecao = () => {
    setMeioSelecionadoId(null)
    setValorInput('')
    setPrecisaTroco(null)
    setCedulaInput('')
  }

  const handleSelecionarMeio = (meioPagamentoId: string) => {
    if (hasMovedRef.current || isDragging) return
    if (pagamentoCompleto) return

    const meio = meiosById.get(meioPagamentoId)
    setMeioSelecionadoId(meioPagamentoId)
    setCedulaInput('')
    setPrecisaTroco(null)

    if (isMeioPagamentoDinheiro(meio)) {
      setValorInput('')
    } else {
      setValorInput(maskFromNumber(restante))
    }
  }

  useEffect(() => {
    if (!meioSelecionadoId) return
    if (restante <= 0.01) limparSelecao()
  }, [restante, meioSelecionadoId, pagamentoCompleto])

  const handleEscolherSemTroco = () => {
    setPrecisaTroco(false)
    setCedulaInput('')
    setValorInput(maskFromNumber(restante))
  }

  const handleEscolherComTroco = () => {
    setPrecisaTroco(true)
    setValorInput('')
    setCedulaInput('')
  }

  const handleValorChange = (raw: string) => {
    const masked = formatBRLFromMaskedInput(raw)
    const parsed = parseBRLToNumber(masked)
    if (parsed != null && parsed - restante > 0.01) {
      setValorInput(maskFromNumber(restante))
      return
    }
    setValorInput(masked)
  }

  const handleAdicionar = () => {
    if (!meioSelecionadoId || !meioSelecionado) {
      showToast.error('Escolha a forma de pagamento')
      return
    }

    if (ehDinheiro && precisaTroco === null) {
      showToast.error('Informe se precisa de troco')
      return
    }

    const resolved = resolverAdicaoPagamentoCheckout({
      restante,
      valorPagamento: ehDinheiro && precisaTroco === true ? restante : valorPagamento,
      ehDinheiro,
      precisaTroco: ehDinheiro && precisaTroco === true,
      valorCedula,
    })
    if (!resolved.ok) {
      showToast.error(resolved.error)
      return
    }

    onChangePagamentos([
      ...pagamentos,
      { meioPagamentoId: meioSelecionadoId, valor: resolved.valorLancamento },
    ])

    limparSelecao()
  }

  const handleRemover = (index: number) => {
    onChangePagamentos(pagamentos.filter((_, i) => i !== index))
  }

  const handleContinuar = () => {
    if (meioSelecionadoId) {
      showToast.error('Adicione ou cancele o pagamento em andamento')
      return
    }
    if (!pagamentosCobremTotalCheckout(total, pagamentos, isDinheiroId)) {
      showToast.error(
        pagamentos.length === 0
          ? 'Adicione ao menos uma forma de pagamento'
          : 'Complete o valor restante do pagamento'
      )
      return
    }
    onContinuar()
  }

  const podeAdicionar =
    Boolean(meioSelecionado) &&
    (!ehDinheiro || precisaTroco !== null)

  const fieldClass =
    'w-full rounded-xl border bg-transparent px-3 py-3 text-sm outline-none delivery-text-primary'
  const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

  return (
    <>
      <DeliveryCheckoutShellHeader title="Pagamento" showBack onBack={onVoltar} />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions onVoltar={onVoltar} onContinuar={handleContinuar} />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-4">
        <div
          className="space-y-2 rounded-xl border px-3 py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="delivery-text-secondary">Subtotal</span>
            <span className="font-medium delivery-text-primary">
              {transformarParaReal(total)}
            </span>
          </div>
          <div
            className="flex items-center justify-between border-t pt-2 text-sm font-semibold"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <span className="delivery-text-primary">Total</span>
            <span className="delivery-text-primary">{transformarParaReal(total)}</span>
          </div>
          {restante > 0.01 ? (
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-red-600">Falta pagar</span>
              <span className="text-red-600">{transformarParaReal(restante)}</span>
            </div>
          ) : pagamentos.length > 0 ? (
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-green-700">Pagamento completo</span>
              <span className="text-green-700">{transformarParaReal(totalLancado)}</span>
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium delivery-text-primary">
            1. Escolha a forma de pagamento
          </p>
          {loadingMeios ? (
            <p className="text-sm delivery-text-secondary">Carregando meios de pagamento...</p>
          ) : meiosPagamento.length === 0 ? (
            <p className="text-sm delivery-text-secondary">
              Nenhuma forma de pagamento disponível no momento.
            </p>
          ) : (
            <div
              ref={scrollRef}
              className={`scrollbar-thin flex gap-2.5 overflow-x-auto px-0.5 py-2 ${
                cardsDesabilitados
                  ? 'cursor-default'
                  : 'cursor-grab select-none active:cursor-grabbing'
              }`}
              style={{ scrollbarWidth: 'thin' }}
              onMouseDown={cardsDesabilitados ? undefined : handleMouseDown}
              onWheel={handleWheel}
            >
              {meiosPagamento.map(meio => {
                const Icone = obterIconeMeioPagamento(meio.nome)
                const selecionado = meioSelecionadoId === meio.id
                return (
                  <button
                    key={meio.id}
                    type="button"
                    disabled={cardsDesabilitados}
                    onClick={() => handleSelecionarMeio(meio.id)}
                    className={`flex ${MEIO_CARD_CLASS} flex-col items-center justify-center gap-1 rounded-xl border p-2 transition-opacity ${
                      cardsDesabilitados ? 'cursor-not-allowed opacity-45' : ''
                    } ${selecionado ? 'outline outline-2 outline-offset-2 outline-[var(--delivery-primary,#171717)]' : ''}`}
                    style={{
                      borderColor: '#000000',
                      backgroundColor: '#000000',
                      color: 'var(--delivery-btn-text, #ffffff)',
                    }}
                  >
                    <Icone className="h-7 w-7 shrink-0" />
                    <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight">
                      {meio.nome}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {pagamentos.length > 0 && restante > 0.01 && !meioSelecionadoId ? (
            <p className="mt-2 text-xs delivery-text-secondary">
              Escolha outra forma para o valor restante.
            </p>
          ) : null}
        </div>

        {meioSelecionado && !ehDinheiro ? (
          <div
            className="space-y-3 rounded-xl border px-3 py-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <p className="text-sm font-semibold delivery-text-primary">
              2. Valor neste pagamento ({meioSelecionado.nome})
            </p>
            <input
              className={fieldClass}
              style={fieldStyle}
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={valorInput}
              onChange={e => handleValorChange(e.target.value)}
              aria-label="Valor deste pagamento"
            />
            <p className="text-xs delivery-text-secondary">
              Pode pagar o total restante ({transformarParaReal(restante)}) ou só uma parte.
            </p>

            <button
              type="button"
              onClick={handleAdicionar}
              className="min-h-[48px] w-full rounded-xl bg-black text-sm font-semibold text-white"
            >
              Adicionar pagamento
            </button>
          </div>
        ) : null}

        {meioSelecionado && ehDinheiro ? (
          <div
            className="space-y-3 rounded-xl border px-3 py-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
            >
              <span className="min-w-0 text-sm font-medium text-white">
                2. Precisa de troco?
              </span>
              <div
                className="flex shrink-0 rounded-full p-0.5"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                role="group"
                aria-label="Precisa de troco"
              >
                <button
                  type="button"
                  onClick={handleEscolherComTroco}
                  aria-pressed={precisaTroco === true}
                  className="min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={
                    precisaTroco === true
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { backgroundColor: 'transparent', color: '#ffffff' }
                  }
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={handleEscolherSemTroco}
                  aria-pressed={precisaTroco === false}
                  className="min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={
                    precisaTroco === false
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { backgroundColor: 'transparent', color: '#ffffff' }
                  }
                >
                  Não
                </button>
              </div>
            </div>
            <p className="text-xs delivery-text-secondary">
              Restante a pagar: {transformarParaReal(restante)}
            </p>

            {precisaTroco === false ? (
              <>
                <label className="block text-sm font-medium delivery-text-primary">
                  Valor neste pagamento
                </label>
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={valorInput}
                  onChange={e => handleValorChange(e.target.value)}
                  aria-label="Valor deste pagamento em dinheiro"
                />
                <p className="text-xs delivery-text-secondary">
                Pode pagar o total restante ({transformarParaReal(restante)}) ou só uma parte.
                </p>
              </>
            ) : null}

            {precisaTroco === true ? (
              <>
                <label className="block text-sm font-medium delivery-text-primary">
                  Quanto você vai pagar em dinheiro?
                </label>
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={cedulaInput}
                  onChange={e => setCedulaInput(formatBRLFromMaskedInput(e.target.value))}
                  aria-label="Valor que vai entregar em dinheiro"
                />
                {trocoPreview > 0 ? (
                  <p className="text-sm font-semibold text-green-700">
                    Troco a receber: {transformarParaReal(trocoPreview)}
                  </p>
                ) : (
                  <p className="text-xs delivery-text-secondary">
                    Digite um valor maior que {transformarParaReal(restante)} para calcular o
                    troco.
                  </p>
                )}
              </>
            ) : null}

            {podeAdicionar ? (
              <button
                type="button"
                onClick={handleAdicionar}
                className="min-h-[48px] w-full rounded-xl bg-black text-sm font-semibold text-white"
              >
                Adicionar pagamento
              </button>
            ) : null}
          </div>
        ) : null}

        {pagamentos.length > 0 ? (
          <div>
            <p className="mb-1.5 text-sm font-medium delivery-text-primary">
              Formas lançadas
            </p>
            <ul className="flex flex-wrap gap-2">
              {pagamentos.map((pagamento, index) => {
                const meio = meiosById.get(pagamento.meioPagamentoId)
                const Icone = obterIconeMeioPagamento(meio?.nome ?? '')
                return (
                  <li
                    key={`${pagamento.meioPagamentoId}-${index}`}
                    className={`relative flex ${MEIO_CARD_CLASS} flex-col items-center justify-center gap-0.5 rounded-xl border px-2 pt-2 pb-1.5`}
                    style={{
                      borderColor: 'color-mix(in srgb, #16a34a 35%, var(--delivery-border))',
                      backgroundColor:
                        'color-mix(in srgb, #16a34a 10%, var(--delivery-surface))',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRemover(index)}
                      aria-label={`Remover ${meio?.nome ?? 'pagamento'}`}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full text-red-600"
                    >
                      <MdDelete className="h-4 w-4" />
                    </button>
                    <Icone className="h-6 w-6 shrink-0 delivery-text-primary" />
                    <span className="line-clamp-1 w-full px-1 text-center text-[10px] font-medium leading-tight delivery-text-primary">
                      {meio?.nome ?? 'Pagamento'}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-green-700">
                      {transformarParaReal(pagamento.valor)}
                    </span>
                  </li>
                )
              })}
            </ul>
            {trocoReceberPersistido > 0 ? (
              <p className="mt-2 text-sm font-semibold text-green-700">
                Troco a receber: {transformarParaReal(trocoReceberPersistido)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
