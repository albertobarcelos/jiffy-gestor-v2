'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
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

function formatDataDiaMes(ymd: string): string {
  const [, mes, dia] = ymd.split('-')
  return `${dia}-${mes}`
}

function formatDiaSemana(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  })
    .format(new Date(y, m - 1, d))
    .replace('.', '')
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
      ? 'Horário em que o pedido sairá para entrega.'
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
              <div className="flex gap-2 overflow-x-auto pb-2">
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
                      className="flex min-w-[72px] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5"
                      style={{
                        borderColor: ativo
                          ? 'var(--delivery-primary-dark)'
                          : 'var(--delivery-border)',
                        backgroundColor: ativo
                          ? 'var(--delivery-primary-dark)'
                          : 'var(--delivery-surface)',
                        color: ativo
                          ? 'var(--delivery-btn-text, #ffffff)'
                          : 'var(--delivery-text-primary)',
                      }}
                    >
                      <span className="text-lg font-bold leading-tight">
                        {formatDataDiaMes(data)}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs font-normal leading-none">
                        <CalendarDays className="h-3 w-3" aria-hidden />
                        {formatDiaSemana(data)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
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
              <div className="space-y-2">
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
                      className="flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-base font-normal"
                      style={{
                        borderColor: ativo
                          ? 'var(--delivery-primary-dark)'
                          : 'var(--delivery-border)',
                        backgroundColor: ativo
                          ? 'var(--delivery-primary-dark)'
                          : 'var(--delivery-surface)',
                        color: ativo
                          ? 'var(--delivery-btn-text, #ffffff)'
                          : 'var(--delivery-text-primary)',
                      }}
                    >
                      <Clock className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{slot.label}</span>
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
