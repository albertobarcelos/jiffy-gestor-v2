'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { MdAccessTime } from 'react-icons/md'
import { TEMPOS_PREVISTOS_ENTREGA } from '@/src/shared/constants/pedidoForm'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { usePublicDeliveryDisponibilidade } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import type { ModoTempoEntrega } from '@/src/application/dto/delivery-publico/DisponibilidadeDeliveryDTO'

type PedidoQuandoDeliveryFieldProps = {
  tipoAtendimento: 'entrega' | 'retirada'
  modoTempo: ModoTempoEntrega
  slotInicio: string
  tempoPrevistoMinutos: number
  onChangeModoTempo: (value: ModoTempoEntrega) => void
  onChangeSlot: (slot: { inicio: string; fim: string; label: string } | null) => void
  onChangeTempoPrevistoMinutos: (minutos: number) => void
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

export function PedidoQuandoDeliveryField({
  tipoAtendimento,
  modoTempo,
  slotInicio,
  tempoPrevistoMinutos,
  onChangeModoTempo,
  onChangeSlot,
  onChangeTempoPrevistoMinutos,
}: PedidoQuandoDeliveryFieldProps) {
  const empresaQuery = useEmpresaDeliveryMe()
  const slug = empresaQuery.data?.slug?.trim() ?? ''
  const [dataSelecionada, setDataSelecionada] = useState(() =>
    civilDateInTz(new Date(), 'America/Sao_Paulo')
  )
  const defaultsAplicadosRef = useRef(false)
  const tipoAnteriorRef = useRef(tipoAtendimento)

  const disponibilidadeQuery = usePublicDeliveryDisponibilidade(
    slug,
    tipoAtendimento,
    dataSelecionada,
    Boolean(slug)
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
    setDataSelecionada(civilDateInTz(new Date(), disponibilidade.timezone))
  }, [disponibilidade?.timezone])

  useEffect(() => {
    if (tipoAnteriorRef.current === tipoAtendimento) return
    tipoAnteriorRef.current = tipoAtendimento
    onChangeSlot(null)
    defaultsAplicadosRef.current = false
  }, [tipoAtendimento, onChangeSlot])

  useEffect(() => {
    if (!disponibilidade || defaultsAplicadosRef.current) return
    defaultsAplicadosRef.current = true

    if (!aceitaAgendamento) {
      if (permiteImediato) {
        onChangeModoTempo('imediato')
        onChangeSlot(null)
      }
      return
    }

    if (!permiteImediato) {
      onChangeModoTempo('agendado')
      return
    }

    if (modoTempo !== 'agendado') {
      onChangeModoTempo('imediato')
    }
  }, [
    disponibilidade,
    aceitaAgendamento,
    permiteImediato,
    modoTempo,
    onChangeModoTempo,
    onChangeSlot,
  ])

  const hint =
    tipoAtendimento === 'entrega'
      ? 'Horário em que o pedido sairá para entrega.'
      : 'Horário em que o pedido estará pronto para retirada.'

  if (empresaQuery.isLoading) {
    return (
      <div className="rounded-lg border border-primary/15 bg-white p-3">
        <p className="text-sm text-secondary-text">Carregando opções de horário…</p>
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="rounded-lg border border-primary/15 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <MdAccessTime className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold text-primary-text">Quando</Label>
        </div>
        <p className="mb-2 text-xs text-secondary-text">{hint}</p>
        <Select
          value={String(tempoPrevistoMinutos)}
          onValueChange={value => onChangeTempoPrevistoMinutos(Number(value) || 30)}
        >
          <SelectTrigger className="border-primary/30 bg-white">
            <SelectValue placeholder="Selecione o tempo" />
          </SelectTrigger>
          <SelectContent>
            {TEMPOS_PREVISTOS_ENTREGA.map(minutos => (
              <SelectItem key={minutos} value={String(minutos)}>
                {minutos} minutos
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-primary/15 bg-white p-3 space-y-3">
      <div className="flex items-center gap-2">
        <MdAccessTime className="h-5 w-5 text-primary" />
        <Label className="text-sm font-semibold text-primary-text">Quando</Label>
      </div>
      <p className="text-xs text-secondary-text">{hint}</p>

      {disponibilidadeQuery.isError ? (
        <p className="text-sm text-red-600">
          Não foi possível carregar a disponibilidade. Tente novamente.
        </p>
      ) : null}

      {loading && !disponibilidade ? (
        <p className="text-sm text-secondary-text">Carregando horários…</p>
      ) : null}

      {disponibilidade && !permiteImediato ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">Loja fechada no momento</p>
          <p className="mt-0.5 text-xs">
            Pedidos imediatos indisponíveis.
            {disponibilidade.proximaAbertura
              ? ` Próxima abertura: ${formatProximaAbertura(disponibilidade.proximaAbertura, timezone)}.`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!permiteImediato}
          onClick={() => {
            onChangeModoTempo('imediato')
            onChangeSlot(null)
          }}
          className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            modoTempo === 'imediato'
              ? 'border-secondary bg-secondary text-white'
              : 'border-gray-200 bg-white text-primary-text hover:border-secondary/50'
          }`}
        >
          Agora
          <span
            className={`mt-0.5 block text-xs font-normal ${
              modoTempo === 'imediato' ? 'text-white/90' : 'text-secondary-text'
            }`}
          >
            {permiteImediato ? 'O mais rápido possível' : 'Indisponível (loja fechada)'}
          </span>
        </button>
        <button
          type="button"
          disabled={!aceitaAgendamento}
          onClick={() => onChangeModoTempo('agendado')}
          className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            modoTempo === 'agendado'
              ? 'border-secondary bg-secondary text-white'
              : 'border-gray-200 bg-white text-primary-text hover:border-secondary/50'
          }`}
        >
          Agendar
          <span
            className={`mt-0.5 block text-xs font-normal ${
              modoTempo === 'agendado' ? 'text-white/90' : 'text-secondary-text'
            }`}
          >
            {aceitaAgendamento ? 'Escolher data e horário' : 'Agendamento desabilitado'}
          </span>
        </button>
      </div>

      {modoTempo === 'imediato' && permiteImediato ? (
        <div>
          <Label className="mb-1.5 block text-xs font-semibold text-secondary-text">
            Tempo previsto
          </Label>
          <Select
            value={String(tempoPrevistoMinutos)}
            onValueChange={value => onChangeTempoPrevistoMinutos(Number(value) || 30)}
          >
            <SelectTrigger className="border-primary/30 bg-white">
              <SelectValue placeholder="Selecione o tempo" />
            </SelectTrigger>
            <SelectContent>
              {TEMPOS_PREVISTOS_ENTREGA.map(minutos => (
                <SelectItem key={minutos} value={String(minutos)}>
                  {minutos} minutos
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {modoTempo === 'agendado' && aceitaAgendamento ? (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-text">
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      ativo
                        ? 'bg-secondary text-white'
                        : 'border border-gray-200 bg-gray-50 text-primary-text hover:border-secondary/40'
                    }`}
                  >
                    {formatDataExibicao(data)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-text">
              Horários
            </p>
            {loading ? (
              <p className="text-sm text-secondary-text">Atualizando…</p>
            ) : null}
            {!loading && slots.length === 0 ? (
              <p className="text-sm text-secondary-text">
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      ativo
                        ? 'bg-secondary text-white'
                        : 'border border-gray-200 bg-gray-50 text-primary-text hover:border-secondary/40'
                    }`}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
