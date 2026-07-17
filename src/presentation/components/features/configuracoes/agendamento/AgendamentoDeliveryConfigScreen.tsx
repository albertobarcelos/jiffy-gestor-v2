'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MdAdd, MdArrowBack, MdDelete, MdSchedule } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import {
  DIAS_SEMANA_LABELS,
  FUSOS_IANA_BRASIL_AGENDAMENTO,
  type AgendamentoDeliveryConfigDTO,
  type IntervaloSlotMinutos,
  type TurnoHorarioFuncionamentoDTO,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'
import {
  useAgendamentoDeliveryConfig,
  useSalvarAgendamentoDeliveryConfig,
} from '@/src/presentation/hooks/useAgendamentoDeliveryConfig'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { gerarSlotsPreviewHoje } from './gerarSlotsPreviewLocal'
import { validarTurnosAgendamento } from './validarTurnosAgendamento'

const DEFAULT_FORM: AgendamentoDeliveryConfigDTO = {
  timezone: 'America/Sao_Paulo',
  aceitaAgendamento: true,
  intervaloSlotMinutos: 15,
  leadTimeMinutos: 45,
  diasAntecedenciaMax: 3,
  turnos: [],
}

function novoTurno(diaSemana: number): TurnoHorarioFuncionamentoDTO {
  return {
    diaSemana,
    horaInicio: '18:00',
    horaFim: '23:00',
    ativo: true,
  }
}

function ToggleRow(props: {
  id: string
  checked: boolean
  disabled?: boolean
  onChecked: (v: boolean) => void
  titulo: string
  descricao: string
}) {
  const { id, checked, disabled, onChecked, titulo, descricao } = props
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-gray-100"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary-text">{titulo}</p>
        <p className="mt-0.5 text-xs text-secondary-text">{descricao}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChecked(e.target.checked)}
        className="h-4 w-4 accent-secondary"
      />
    </label>
  )
}

export function AgendamentoDeliveryConfigScreen() {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const configQuery = useAgendamentoDeliveryConfig(
    empresaDeliveryQuery.data != null
  )
  const salvarMutation = useSalvarAgendamentoDeliveryConfig()

  const [form, setForm] = useState<AgendamentoDeliveryConfigDTO>(DEFAULT_FORM)
  const hidratadoRef = useRef(false)

  useEffect(() => {
    if (hidratadoRef.current) return
    if (!configQuery.data) return
    setForm({
      ...configQuery.data,
      turnos: configQuery.data.turnos.map(t => ({ ...t })),
    })
    hidratadoRef.current = true
  }, [configQuery.data])

  const slotsPreview = useMemo(
    () =>
      gerarSlotsPreviewHoje({
        timezone: form.timezone,
        turnos: form.turnos,
        intervaloMinutos: form.intervaloSlotMinutos,
        leadTimeMinutos: form.leadTimeMinutos,
      }),
    [form]
  )

  const carregando =
    empresaDeliveryQuery.isPending ||
    (empresaDeliveryQuery.data != null && configQuery.isPending) ||
    salvarMutation.isPending

  const atualizarTurno = (
    index: number,
    patch: Partial<TurnoHorarioFuncionamentoDTO>
  ) => {
    setForm(prev => ({
      ...prev,
      turnos: prev.turnos.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
  }

  const removerTurno = (index: number) => {
    setForm(prev => ({
      ...prev,
      turnos: prev.turnos.filter((_, i) => i !== index),
    }))
  }

  const adicionarTurno = (diaSemana: number) => {
    setForm(prev => ({
      ...prev,
      turnos: [...prev.turnos, novoTurno(diaSemana)],
    }))
  }

  const handleSalvar = async () => {
    if (form.leadTimeMinutos < 0) {
      showToast.error('Lead time não pode ser negativo.')
      return
    }
    if (form.diasAntecedenciaMax < 1 || form.diasAntecedenciaMax > 7) {
      showToast.error('Antecedência máxima deve ser entre 1 e 7 dias.')
      return
    }

    const erroTurnos = validarTurnosAgendamento(form.turnos)
    if (erroTurnos) {
      showToast.error(erroTurnos)
      return
    }

    try {
      const salvo = await salvarMutation.mutateAsync({
        timezone: form.timezone,
        aceitaAgendamento: form.aceitaAgendamento,
        intervaloSlotMinutos: form.intervaloSlotMinutos,
        leadTimeMinutos: form.leadTimeMinutos,
        diasAntecedenciaMax: form.diasAntecedenciaMax,
        turnos: form.turnos.map(({ id: _id, ...turno }) => turno),
      })
      setForm({
        ...salvo,
        turnos: salvo.turnos.map(t => ({ ...t })),
      })
      showToast.success('Configuração de agendamento salva.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao salvar agendamento.'
      showToast.error(msg)
    }
  }

  if (empresaDeliveryQuery.isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  if (empresaDeliveryQuery.data == null) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <header className="shrink-0 border-b border-gray-200 px-4 py-3 md:px-6">
          <Link
            href="/configuracoes/empresa-delivery"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
          >
            <MdArrowBack className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
          <h1 className="mt-2 text-xl font-bold text-primary">
            Horários e agendamento
          </h1>
        </header>
        <div className="p-4 md:p-6">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ative a Empresa Delivery antes de configurar horários e agendamento.
          </p>
        </div>
      </div>
    )
  }

  if (configQuery.isPending && !hidratadoRef.current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  if (configQuery.isError) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <header className="shrink-0 border-b border-gray-200 px-4 py-3 md:px-6">
          <Link
            href="/configuracoes/empresa-delivery"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
          >
            <MdArrowBack className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
        </header>
        <div className="p-4 md:p-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Não foi possível carregar a configuração de agendamento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-gray-200 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/configuracoes/empresa-delivery"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
          >
            <MdArrowBack className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={carregando}
            className="inline-flex h-9 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-primary">
          <MdSchedule className="h-6 w-6" aria-hidden />
          Horários e agendamento
        </h1>
        <p className="mt-1 text-sm text-secondary-text">
          Defina quando a loja aceita pedidos imediatos e a grade de horários
          agendados.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
          <section className="space-y-3 rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-primary">Parâmetros</h2>

            <ToggleRow
              id="aceita-agendamento"
              checked={form.aceitaAgendamento}
              onChecked={v => setForm(prev => ({ ...prev, aceitaAgendamento: v }))}
              titulo="Aceitar agendamento"
              descricao="Quando desligado, o cliente só pode pedir para agora (se a loja estiver aberta)."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-primary-text">
                  Fuso horário
                </span>
                <select
                  value={form.timezone}
                  onChange={e =>
                    setForm(prev => ({ ...prev, timezone: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-primary-text"
                >
                  {FUSOS_IANA_BRASIL_AGENDAMENTO.map(fuso => (
                    <option key={fuso.id} value={fuso.id}>
                      {fuso.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-primary-text">
                  Intervalo dos slots
                </span>
                <select
                  value={form.intervaloSlotMinutos}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      intervaloSlotMinutos: Number(
                        e.target.value
                      ) as IntervaloSlotMinutos,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-primary-text"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-primary-text">
                  Lead time (minutos)
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.leadTimeMinutos}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      leadTimeMinutos: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-primary-text"
                />
                <span className="block text-xs text-secondary-text">
                  Tempo mínimo até o primeiro horário disponível.
                </span>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-primary-text">
                  Antecedência máxima (dias)
                </span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={form.diasAntecedenciaMax}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      diasAntecedenciaMax: Number(e.target.value) || 1,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-primary-text"
                />
                <span className="block text-xs text-secondary-text">
                  De 1 a 7 dias à frente.
                </span>
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-gray-200 p-4">
            <div>
              <h2 className="text-sm font-bold text-primary">
                Horário de funcionamento
              </h2>
              <p className="mt-1 text-xs text-secondary-text">
                Se o fim for menor ou igual ao início (ex.: 18:00–02:00), o turno
                cruza a meia-noite.
              </p>
            </div>

            <div className="space-y-4">
              {DIAS_SEMANA_LABELS.map((label, diaSemana) => {
                const turnosDoDia = form.turnos
                  .map((turno, index) => ({ turno, index }))
                  .filter(({ turno }) => turno.diaSemana === diaSemana)

                return (
                  <div
                    key={label}
                    className="rounded-lg border border-gray-100 bg-gray-50/60 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-primary-text">
                        {label}
                      </p>
                      <button
                        type="button"
                        onClick={() => adicionarTurno(diaSemana)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary hover:bg-secondary/10"
                      >
                        <MdAdd className="h-4 w-4" aria-hidden />
                        Adicionar turno
                      </button>
                    </div>

                    {turnosDoDia.length === 0 ? (
                      <p className="text-xs text-secondary-text">
                        Fechado neste dia (sem turnos).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {turnosDoDia.map(({ turno, index }) => (
                          <div
                            key={`${turno.id ?? 'novo'}-${index}`}
                            className="flex flex-wrap items-end gap-2 rounded-lg bg-white p-2 ring-1 ring-gray-100"
                          >
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-secondary-text">
                                Início
                              </span>
                              <input
                                type="time"
                                step={60}
                                value={turno.horaInicio}
                                onChange={e =>
                                  atualizarTurno(index, {
                                    horaInicio: e.target.value,
                                  })
                                }
                                className="h-9 rounded-md border border-gray-200 px-2 text-sm"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-xs font-semibold text-secondary-text">
                                Fim
                              </span>
                              <input
                                type="time"
                                step={60}
                                value={turno.horaFim}
                                onChange={e =>
                                  atualizarTurno(index, {
                                    horaFim: e.target.value,
                                  })
                                }
                                className="h-9 rounded-md border border-gray-200 px-2 text-sm"
                              />
                            </label>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-text">
                              <input
                                type="checkbox"
                                checked={turno.ativo}
                                onChange={e =>
                                  atualizarTurno(index, {
                                    ativo: e.target.checked,
                                  })
                                }
                                className="accent-secondary"
                              />
                              Ativo
                            </label>
                            <button
                              type="button"
                              onClick={() => removerTurno(index)}
                              className="mb-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                              aria-label="Remover turno"
                            >
                              <MdDelete className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-primary">
              Preview dos slots de hoje
            </h2>
            <p className="text-xs text-secondary-text">
              Com base no rascunho atual (intervalo, lead time e turnos).
            </p>
            {slotsPreview.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-secondary-text">
                Nenhum slot disponível para hoje com a configuração atual.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slotsPreview.slice(0, 24).map(slot => (
                  <span
                    key={slot.inicioLabel}
                    className="rounded-md bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary"
                  >
                    {slot.label}
                  </span>
                ))}
                {slotsPreview.length > 24 ? (
                  <span className="text-xs text-secondary-text">
                    +{slotsPreview.length - 24} horários
                  </span>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
