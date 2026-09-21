'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdDelete } from 'react-icons/md'
import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import type { CheckoutPagamentoItem } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import {
  calcularTrocoCheckout,
  calcularTrocoReceberCheckout,
  pagamentosCobremTotalCheckout,
  pagamentosExcedemTotalSemTroco,
  restantePagamentoCheckout,
  resolverAdicaoPagamentoCheckout,
  somaPagamentosCheckout,
} from '@/src/application/services/delivery-publico/checkoutPagamentos'
import {
  formatBRLFromMaskedInput,
  parseBRLToNumber,
} from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { useHorizontalDragScroll } from '@/src/presentation/hooks/useHorizontalDragScroll'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'
import { isMeioPagamentoDinheiro } from '../../../shared/utils/isMeioPagamentoDinheiro'
import { obterIconeMeioPagamento } from '../../../shared/utils/obterIconeMeioPagamento'
import { obterEstiloMeioPagamentoPublico } from '../../../shared/utils/obterEstiloMeioPagamentoPublico'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

const MEIO_CARD_CLASS = 'h-[88px] w-full min-w-0'

type DeliveryCheckoutPagamentoModalProps = {
  tipoEntrega: DeliveryTipoEntrega
  subtotal: number
  subtotalOficial?: number | null
  taxaEntregaOficial?: number | null
  total: number
  cotacaoLoading?: boolean
  cotacaoPronta?: boolean
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
  tipoEntrega,
  subtotal,
  subtotalOficial = null,
  taxaEntregaOficial = null,
  total,
  cotacaoLoading = false,
  cotacaoPronta = true,
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

  const isEntrega = tipoEntrega === 'entrega'
  const subtotalExibicao = subtotalOficial ?? subtotal
  const taxaExibicao = taxaEntregaOficial ?? 0
  const exibirTaxaEntrega = isEntrega
  const taxaEntregaTexto = cotacaoLoading
    ? 'Calculando...'
    : formatDeliveryCurrency(taxaExibicao)
  const totalLancado = somaPagamentosCheckout(pagamentos)
  const restante = restantePagamentoCheckout(total, pagamentos)
  const isDinheiroId = (meioPagamentoId: string) =>
    isMeioPagamentoDinheiro(meiosById.get(meioPagamentoId))
  const pagamentoInconsistente = pagamentosExcedemTotalSemTroco(
    total,
    pagamentos,
    isDinheiroId
  )
  const pagamentoCompleto =
    !pagamentoInconsistente && restante <= 0.01 && pagamentos.length > 0
  const cardsDesabilitados =
    pagamentoCompleto || pagamentoInconsistente || cotacaoLoading || !cotacaoPronta

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

  const tentarAdicionarPagamentoPendente = (options?: {
    /** No Continuar: dinheiro sem resposta de troco → assume “não”. */
    assumirSemTrocoQuandoIndefinido?: boolean
  }):
    | { ok: true; nextPagamentos: CheckoutPagamentoItem[] }
    | { ok: false; error: string } => {
    if (!meioSelecionadoId || !meioSelecionado) {
      return { ok: true, nextPagamentos: pagamentos }
    }

    const assumirSemTroco =
      Boolean(options?.assumirSemTrocoQuandoIndefinido) &&
      ehDinheiro &&
      precisaTroco === null

    if (ehDinheiro && precisaTroco === null && !assumirSemTroco) {
      return { ok: false, error: 'Informe se precisa de troco' }
    }

    const precisaTrocoEfetivo = ehDinheiro && precisaTroco === true
    const valorPagamentoEfetivo = precisaTrocoEfetivo
      ? restante
      : valorPagamento != null && valorPagamento > 0
        ? valorPagamento
        : assumirSemTroco
          ? restante
          : valorPagamento

    const resolved = resolverAdicaoPagamentoCheckout({
      restante,
      valorPagamento: valorPagamentoEfetivo,
      ehDinheiro,
      precisaTroco: precisaTrocoEfetivo,
      valorCedula,
    })
    if (!resolved.ok) {
      return { ok: false, error: resolved.error }
    }

    const nextPagamentos = [
      ...pagamentos,
      { meioPagamentoId: meioSelecionadoId, valor: resolved.valorLancamento },
    ]
    onChangePagamentos(nextPagamentos)
    limparSelecao()
    return { ok: true, nextPagamentos }
  }

  const handleAdicionar = () => {
    if (!meioSelecionadoId || !meioSelecionado) {
      showToast.error('Escolha a forma de pagamento')
      return
    }

    const result = tentarAdicionarPagamentoPendente()
    if (!result.ok) {
      showToast.error(result.error)
    }
  }

  const handleRemover = (index: number) => {
    onChangePagamentos(pagamentos.filter((_, i) => i !== index))
  }

  const handleContinuar = () => {
    if (cotacaoLoading || !cotacaoPronta) {
      showToast.error('Aguarde o cálculo do total do pedido')
      return
    }

    const result = tentarAdicionarPagamentoPendente({
      assumirSemTrocoQuandoIndefinido: true,
    })
    if (!result.ok) {
      showToast.error(result.error)
      return
    }

    const listaFinal = result.nextPagamentos
    if (pagamentosExcedemTotalSemTroco(total, listaFinal, isDinheiroId)) {
      showToast.error(
        'O valor dos pagamentos é maior que o total do pedido. Remova e lance novamente.'
      )
      return
    }
    if (!pagamentosCobremTotalCheckout(total, listaFinal, isDinheiroId)) {
      showToast.error(
        listaFinal.length === 0
          ? 'Adicione ao menos uma forma de pagamento'
          : 'Complete o valor restante do pagamento'
      )
      return
    }

    // Garante o estado final no form antes de ir à revisão (evita race do último lançamento).
    onChangePagamentos(listaFinal)
    onContinuar()
  }

  const podeAdicionar =
    Boolean(meioSelecionado) &&
    (!ehDinheiro || precisaTroco !== null) &&
    !cotacaoLoading &&
    cotacaoPronta

  const continuarDisabled =
    cotacaoLoading || !cotacaoPronta || pagamentoInconsistente

  /** Duas linhas só com mais de 4 meios; com 4 ou menos, uma linha. */
  const quantidadeMeios = meiosPagamento.length
  const usarDuasLinhasMeios = quantidadeMeios > 4
  /** Preenche por linha (4 por linha). Com >8, amplia colunas e usa scroll. */
  const colunasMeios = usarDuasLinhasMeios
    ? Math.max(4, Math.ceil(quantidadeMeios / 2))
    : 4
  const precisaScrollMeios = colunasMeios > 4

  const fieldClass =
    'w-full rounded-xl border bg-transparent px-3 py-3 text-base outline-none delivery-text-primary'
  const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

  return (
    <>
      <DeliveryCheckoutShellHeader title="Pagamento" showBack onBack={onVoltar} />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions
          onVoltar={onVoltar}
          onContinuar={handleContinuar}
          continuarDisabled={continuarDisabled}
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-4">
        <div
          className="space-y-2 rounded-xl border px-3 py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="delivery-text-secondary">Subtotal</span>
            <span className="font-medium delivery-text-primary">
              {cotacaoLoading ? 'Calculando...' : formatDeliveryCurrency(subtotalExibicao)}
            </span>
          </div>
          {exibirTaxaEntrega ? (
            <div className="flex items-center justify-between text-sm">
              <span className="delivery-text-secondary">Taxa de entrega</span>
              <span className="font-medium delivery-text-primary">{taxaEntregaTexto}</span>
            </div>
          ) : null}
          <div
            className="flex items-center justify-between border-t pt-2 text-sm font-semibold"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <span className="delivery-text-primary">Total</span>
            <span className="delivery-text-primary">
              {cotacaoLoading ? 'Calculando...' : formatDeliveryCurrency(total)}
            </span>
          </div>
          {pagamentoInconsistente ? (
            <div className="flex flex-col gap-0.5 text-sm font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-red-600">Pagamento inconsistente</span>
                <span className="text-red-600">{formatDeliveryCurrency(totalLancado)}</span>
              </div>
              <p className="text-xs font-medium text-red-600">
                O valor lançado é maior que o total. Remova e lance novamente.
              </p>
            </div>
          ) : restante > 0.01 ? (
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-red-600">Falta pagar</span>
              <span className="text-red-600">{formatDeliveryCurrency(restante)}</span>
            </div>
          ) : pagamentos.length > 0 ? (
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-green-700">Pagamento completo</span>
              <span className="text-green-700">{formatDeliveryCurrency(totalLancado)}</span>
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
          ) : cotacaoLoading || !cotacaoPronta ? (
            <p className="text-sm delivery-text-secondary">Calculando total do pedido...</p>
          ) : (
            <div
              ref={scrollRef}
              className={`px-0.5 py-2 ${
                precisaScrollMeios
                  ? `scrollbar-thin overflow-x-auto ${
                      cardsDesabilitados
                        ? 'cursor-default'
                        : 'cursor-grab select-none active:cursor-grabbing'
                    }`
                  : 'overflow-x-hidden'
              }`}
              style={precisaScrollMeios ? { scrollbarWidth: 'thin' } : undefined}
              onMouseDown={
                cardsDesabilitados || !precisaScrollMeios
                  ? undefined
                  : handleMouseDown
              }
              onWheel={precisaScrollMeios ? handleWheel : undefined}
            >
              <div
                className={
                  precisaScrollMeios
                    ? 'grid w-max grid-rows-2 gap-2.5'
                    : 'grid w-full gap-2.5'
                }
                style={{
                  gridTemplateColumns: precisaScrollMeios
                    ? `repeat(${colunasMeios}, 132px)`
                    : 'repeat(4, minmax(0, 1fr))',
                }}
              >
                {meiosPagamento.map(meio => {
                  const Icone = obterIconeMeioPagamento(meio.nome)
                  const estilo = obterEstiloMeioPagamentoPublico(meio)
                  const selecionado = meioSelecionadoId === meio.id
                  return (
                    <button
                      key={meio.id}
                      type="button"
                      disabled={cardsDesabilitados}
                      onClick={() => handleSelecionarMeio(meio.id)}
                      className={`flex ${MEIO_CARD_CLASS} flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 transition-opacity hover:brightness-110 ${
                        cardsDesabilitados ? 'cursor-not-allowed opacity-45' : ''
                      } ${selecionado ? 'outline outline-2 outline-offset-2 outline-[var(--delivery-primary,#171717)]' : ''}`}
                      style={{
                        borderColor: estilo.borderColor,
                        backgroundColor: estilo.backgroundColor,
                        color: estilo.color,
                      }}
                    >
                      <Icone
                        className="h-8 w-8 shrink-0"
                        style={{ color: estilo.iconColor }}
                      />
                      <span
                        className="line-clamp-2 w-full text-center text-xs leading-tight"
                        style={{
                          color: estilo.labelColor,
                          fontWeight: estilo.labelFontWeight ?? 500,
                        }}
                      >
                        {meio.nome}
                      </span>
                    </button>
                  )
                })}
              </div>
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
              onFocus={e => e.currentTarget.select()}
              aria-label="Valor deste pagamento"
            />
            <p className="text-xs delivery-text-secondary">
              Pode pagar o total restante ({formatDeliveryCurrency(restante)}) ou só uma parte.
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
              Restante a pagar: {formatDeliveryCurrency(restante)}
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
                  onFocus={e => e.currentTarget.select()}
                  aria-label="Valor deste pagamento em dinheiro"
                />
                <p className="text-xs delivery-text-secondary">
                Pode pagar o total restante ({formatDeliveryCurrency(restante)}) ou só uma parte.
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
                    Troco a receber: {formatDeliveryCurrency(trocoPreview)}
                  </p>
                ) : (
                  <p className="text-xs delivery-text-secondary">
                    Digite um valor maior que {formatDeliveryCurrency(restante)} para calcular o
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
            <ul className="grid grid-cols-3 gap-2.5">
              {pagamentos.map((pagamento, index) => {
                const meio = meiosById.get(pagamento.meioPagamentoId)
                const Icone = obterIconeMeioPagamento(meio?.nome ?? '')
                const estilo = obterEstiloMeioPagamentoPublico({
                  nome: meio?.nome ?? '',
                  formaPagamentoFiscal: meio?.formaPagamentoFiscal,
                })
                return (
                  <li
                    key={`${pagamento.meioPagamentoId}-${index}`}
                    className={`group relative flex ${MEIO_CARD_CLASS} flex-col items-center justify-center gap-0.5 rounded-lg border-2 p-2`}
                    style={{
                      borderColor: estilo.borderColor,
                      backgroundColor: estilo.backgroundColor,
                      color: estilo.color,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRemover(index)}
                      aria-label={`Remover ${meio?.nome ?? 'pagamento'}`}
                      className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/10"
                      style={{ color: estilo.color }}
                    >
                      <MdDelete className="h-3.5 w-3.5" />
                    </button>
                    <Icone
                      className="h-6 w-6 shrink-0"
                      style={{ color: estilo.iconColor }}
                    />
                    <span
                      className="line-clamp-2 w-full px-1 text-center text-[11px] font-medium leading-tight"
                      style={{
                        color: estilo.labelColor,
                        fontWeight: estilo.labelFontWeight ?? 500,
                      }}
                    >
                      {meio?.nome ?? 'Pagamento'}
                    </span>
                    <span
                      className="w-full truncate text-center text-xs font-semibold leading-tight"
                      style={{ color: estilo.labelColor }}
                    >
                      {formatDeliveryCurrency(pagamento.valor)}
                    </span>
                  </li>
                )
              })}
            </ul>
            {trocoReceberPersistido > 0 ? (
              <p className="mt-2 text-sm font-semibold text-green-700">
                Troco a receber: {formatDeliveryCurrency(trocoReceberPersistido)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
