'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { showToast } from '@/src/shared/utils/toast'
import { usePublicDeliveryDisponibilidade } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutQuandoModalProps = {
  slug: string
  tipoEntrega: 'entrega' | 'retirada'
  slotInicio: string
  slotLabel: string
  onChangeSlot: (slot: {
    inicio: string
    fim: string
    label: string
  } | null) => void
  onClose: () => void
  onContinuar: () => void
}

function civilDateInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addCivilDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`
}

function formatDataExibicao(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(y, m - 1, d))
}

function formatProximaAbertura(iso: string | null, timeZone: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function dataInicialDoSlot(slotInicio: string): string {
  if (!slotInicio.trim()) {
    return civilDateInTz(new Date(), 'America/Sao_Paulo')
  }
  const date = new Date(slotInicio)
  return Number.isNaN(date.getTime())
    ? civilDateInTz(new Date(), 'America/Sao_Paulo')
    : civilDateInTz(date, 'America/Sao_Paulo')
}

export function DeliveryCheckoutQuandoModal({
  slug,
  tipoEntrega,
  slotInicio,
  slotLabel,
  onChangeSlot,
  onClose,
  onContinuar,
}: DeliveryCheckoutQuandoModalProps) {
  const [dataSelecionada, setDataSelecionada] = useState(() =>
    dataInicialDoSlot(slotInicio)
  )

  const disponibilidadeQuery = usePublicDeliveryDisponibilidade(
    slug,
    tipoEntrega,
    dataSelecionada,
    true
  )

  const disponibilidade = disponibilidadeQuery.data
  const loading = disponibilidadeQuery.isLoading || disponibilidadeQuery.isFetching
  const timezone = disponibilidade?.timezone || 'America/Sao_Paulo'
  const hoje = civilDateInTz(new Date(), timezone)
  const diasMax = disponibilidade?.diasAntecedenciaMax ?? 3
  const permiteImediato = disponibilidade?.permiteImediato ?? false
  const aceitaAgendamento = disponibilidade?.aceitaAgendamento ?? true
  const slots = disponibilidade?.slots ?? []

  const datasOpcoes = useMemo(() => {
    const list: string[] = []
    for (let i = 0; i <= diasMax; i++) {
      list.push(addCivilDays(hoje, i))
    }
    return list
  }, [hoje, diasMax])

  const timezoneAplicadoRef = useRef(false)
  useEffect(() => {
    if (!disponibilidade?.timezone || timezoneAplicadoRef.current) return
    timezoneAplicadoRef.current = true
    const slotDate = slotInicio.trim() ? new Date(slotInicio) : null
    setDataSelecionada(
      slotDate && !Number.isNaN(slotDate.getTime())
        ? civilDateInTz(slotDate, disponibilidade.timezone)
        : civilDateInTz(new Date(), disponibilidade.timezone)
    )
  }, [disponibilidade?.timezone, slotInicio])

  useEffect(() => {
    if (!disponibilidade || loading || !slotInicio.trim()) return
    if (slots.some(slot => slot.inicio === slotInicio)) return
    onChangeSlot(null)
  }, [disponibilidade, loading, onChangeSlot, slotInicio, slots])

  const hintModo =
    tipoEntrega === 'entrega'
      ? 'Horário em que o pedido sai para entrega (não é o horário de chegada na sua casa).'
      : 'Horário em que o pedido estará pronto para retirada.'

  const podeContinuar =
    aceitaAgendamento &&
    !(loading && !disponibilidade) &&
    !disponibilidadeQuery.isError &&
    Boolean(slotInicio.trim())

  const handleContinuar = () => {
    if (!aceitaAgendamento) {
      showToast.error('Agendamento não está disponível no momento')
      return
    }
    if (!slotInicio.trim()) {
      showToast.error('Selecione um horário disponível')
      return
    }
    onContinuar()
  }

  const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

  return (
    <DeliveryCheckoutStepModal
      title="Quando?"
      onClose={onClose}
      showBack
      onBack={onClose}
      footer={
        <button
          type="button"
          onClick={handleContinuar}
          disabled={!podeContinuar}
          className="min-h-[48px] w-full rounded-xl text-sm font-semibold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          Continuar
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-xs delivery-text-secondary">{hintModo}</p>

        {loading && !disponibilidade ? (
          <p className="text-sm delivery-text-secondary">Carregando horários…</p>
        ) : null}

        {disponibilidadeQuery.isError ? (
          <p
            className="rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
          >
            Não foi possível carregar a disponibilidade. Tente novamente.
          </p>
        ) : null}

        {disponibilidade && !permiteImediato ? (
          <div
            className="rounded-xl border px-3 py-3 text-sm"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            <p className="font-semibold delivery-text-primary">Loja fechada no momento</p>
            <p className="mt-1 text-xs delivery-text-secondary">
              Pedidos imediatos não estão disponíveis.
              {disponibilidade.proximaAbertura
                ? ` Próxima abertura: ${formatProximaAbertura(disponibilidade.proximaAbertura, timezone)}.`
                : ''}
            </p>
          </div>
        ) : null}

        {disponibilidade && !aceitaAgendamento ? (
          <p
            className="rounded-xl border px-3 py-3 text-sm delivery-text-secondary"
            style={fieldStyle}
          >
            O agendamento não está disponível para este tipo de recebimento.
          </p>
        ) : null}

        {aceitaAgendamento ? (
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
                Data
              </p>
              <div className="flex flex-wrap gap-2">
                {datasOpcoes.map(data => {
                  const ativo = data === dataSelecionada
                  return (
                    <button
                      key={data}
                      type="button"
                      onClick={() => {
                        setDataSelecionada(data)
                        onChangeSlot(null)
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor: ativo
                          ? 'var(--delivery-primary-dark)'
                          : 'var(--delivery-surface-muted)',
                        color: ativo
                          ? 'var(--delivery-btn-text, #ffffff)'
                          : 'var(--delivery-text-primary)',
                      }}
                    >
                      {formatDataExibicao(data)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Horários
              </p>
              {loading ? (
                <p className="text-sm delivery-text-secondary">Atualizando…</p>
              ) : null}
              {!loading && slots.length === 0 ? (
                <p className="text-sm delivery-text-secondary">
                  Nenhum horário disponível neste dia. Escolha outra data.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {slots.map(slot => {
                  const ativo = slot.inicio === slotInicio
                  return (
                    <button
                      key={slot.inicio}
                      type="button"
                      onClick={() =>
                        onChangeSlot({
                          inicio: slot.inicio,
                          fim: slot.fim,
                          label: slot.label,
                        })
                      }
                      className="rounded-lg px-3 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor: ativo
                          ? 'var(--delivery-primary-dark)'
                          : 'var(--delivery-surface-muted)',
                        color: ativo
                          ? 'var(--delivery-btn-text, #ffffff)'
                          : 'var(--delivery-text-primary)',
                      }}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>
              {slotInicio && slotLabel ? (
                <p className="mt-2 text-xs delivery-text-secondary">
                  Selecionado: {slotLabel}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </DeliveryCheckoutStepModal>
  )
}
