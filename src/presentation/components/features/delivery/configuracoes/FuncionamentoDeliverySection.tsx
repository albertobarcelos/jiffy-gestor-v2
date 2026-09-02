'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MdAccessTime, MdPowerSettingsNew, MdSave } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  useFuncionamentoDelivery,
  useSubstituirAgendaFuncionamento,
  useToggleFuncionamentoManual,
} from '@/src/presentation/hooks/useFuncionamentoDelivery'
import { showToast } from '@/src/shared/utils/toast'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'
import {
  agendaDtoParaForm,
  criarFormAgendaPadrao,
  formAgendaParaRequest,
  LABEL_DIA_DA_SEMANA,
  LABEL_MOTIVO_DISPONIBILIDADE,
  listarHorariosFuncionamento15Min,
  type DiaAgendaFormState,
} from '@/src/shared/utils/funcionamentoDelivery'
import { cn } from '@/src/shared/utils/cn'

type FuncionamentoDeliverySectionProps = {
  empresaDeliveryConfigurada: boolean
  timezonePendente?: boolean
}

const AGENDA_CARD_CLASS =
  'flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5'

export function FuncionamentoDeliverySection({
  empresaDeliveryConfigurada,
  timezonePendente = false,
}: FuncionamentoDeliverySectionProps) {
  const funcionamentoQuery = useFuncionamentoDelivery({
    enabled: empresaDeliveryConfigurada,
  })
  const substituirMutation = useSubstituirAgendaFuncionamento()
  const toggleMutation = useToggleFuncionamentoManual()

  const [dias, setDias] = useState<DiaAgendaFormState[]>(() => criarFormAgendaPadrao())
  const [abreAutomaticamente, setAbreAutomaticamente] = useState(true)
  const [fechaAutomaticamente, setFechaAutomaticamente] = useState(true)
  const [formHidratado, setFormHidratado] = useState(false)

  const funcionamento = funcionamentoQuery.data
  const horarios = useMemo(() => listarHorariosFuncionamento15Min(), [])

  useEffect(() => {
    if (!funcionamento || formHidratado) return
    setDias(agendaDtoParaForm(funcionamento.agendaSemanal))
    setAbreAutomaticamente(funcionamento.abreAutomaticamente)
    setFechaAutomaticamente(funcionamento.fechaAutomaticamente)
    setFormHidratado(true)
  }, [formHidratado, funcionamento])

  const atualizarDia = useCallback(
    (diaDaSemana: DiaAgendaFormState['diaDaSemana'], patch: Partial<DiaAgendaFormState>) => {
      setDias(prev =>
        prev.map(d => (d.diaDaSemana === diaDaSemana ? { ...d, ...patch } : d))
      )
    },
    []
  )

  const handleSalvar = useCallback(async () => {
    const payload = formAgendaParaRequest(dias, {
      abreAutomaticamente,
      fechaAutomaticamente,
    })

    try {
      await substituirMutation.mutateAsync(payload)
      showToast.success('Agenda de funcionamento salva.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar a agenda.'
      showToast.error(msg)
    }
  }, [abreAutomaticamente, dias, fechaAutomaticamente, substituirMutation])

  const handleToggleManual = useCallback(async () => {
    try {
      const result = await toggleMutation.mutateAsync()
      showToast.success(result.aberta ? 'Loja aberta manualmente.' : 'Loja fechada manualmente.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível alterar o status da loja.'
      showToast.error(msg)
    }
  }, [toggleMutation])

  const salvando = substituirMutation.isPending
  const alternando = toggleMutation.isPending
  const carregando = funcionamentoQuery.isPending && empresaDeliveryConfigurada

  if (!empresaDeliveryConfigurada) {
    return (
      <section id="empresa-delivery-agenda" className={AGENDA_CARD_CLASS}>
        <AgendaHeader />
        <p className="mt-4 flex-1 text-sm text-secondary-text">
          Ative a Empresa Delivery para configurar dias e horários de funcionamento.
        </p>
      </section>
    )
  }

  if (carregando) {
    return (
      <section
        id="empresa-delivery-agenda"
        className={`${AGENDA_CARD_CLASS} min-h-[200px] items-center justify-center`}
      >
        <JiffyLoading />
      </section>
    )
  }

  if (funcionamentoQuery.isError) {
    return (
      <section
        id="empresa-delivery-agenda"
        className={`${AGENDA_CARD_CLASS} border-red-200 bg-red-50`}
      >
        <AgendaHeader />
        <p className="mt-4 flex-1 text-sm text-red-800">
          {funcionamentoQuery.error.message}
        </p>
        <button
          type="button"
          onClick={() => void funcionamentoQuery.refetch()}
          className="mt-3 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </section>
    )
  }

  const aberta = funcionamento?.aberta ?? true
  const motivoLabel = funcionamento?.motivo
    ? LABEL_MOTIVO_DISPONIBILIDADE[funcionamento.motivo]
    : null

  return (
    <section id="empresa-delivery-agenda" className={AGENDA_CARD_CLASS}>
      <AgendaHeader compact />

      {timezonePendente ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
          Configure o fuso horário na{' '}
          <Link
            href={configuracoesTabPath('empresa')}
            className="font-semibold underline underline-offset-2"
          >
            aba Empresa
          </Link>{' '}
          antes de salvar a agenda.
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                aberta ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
              )}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full', aberta ? 'bg-green-500' : 'bg-gray-400')}
                aria-hidden
              />
              {aberta ? 'Aberta agora' : 'Fechada agora'}
            </span>
          </div>
          {motivoLabel ? (
            <p className="mt-0.5 text-[11px] leading-tight text-secondary-text">{motivoLabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleToggleManual()}
          disabled={alternando || salvando}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-secondary px-2.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MdPowerSettingsNew className="h-3.5 w-3.5" aria-hidden />
          {alternando ? 'Alterando...' : aberta ? 'Fechar loja agora' : 'Abrir loja agora'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <JiffyIconSwitch
          checked={abreAutomaticamente}
          onChange={e => setAbreAutomaticamente(e.target.checked)}
          disabled={salvando}
          label="Abrir automaticamente"
          size="xs"
          labelPosition="end"
        />
        <JiffyIconSwitch
          checked={fechaAutomaticamente}
          onChange={e => setFechaAutomaticamente(e.target.checked)}
          disabled={salvando}
          label="Fechar automaticamente"
          size="xs"
          labelPosition="end"
        />
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-primary-text">Horários por dia</p>
        <p className="text-[11px] leading-tight text-secondary-text">
          Intervalos de 15 min. Desligue o dia para mantê-lo fechado.
        </p>

        <div className="mt-1.5 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wide text-secondary-text">
                <th className="py-1 pr-2 font-semibold">Dia</th>
                <th className="py-1 pr-2 font-semibold">Aberto</th>
                <th className="py-1 pr-2 font-semibold">Abre</th>
                <th className="py-1 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {dias.map(dia => (
                <tr key={dia.diaDaSemana} className="border-b border-gray-50">
                  <td className="py-1 pr-2 font-medium text-primary-text">
                    {LABEL_DIA_DA_SEMANA[dia.diaDaSemana]}
                  </td>
                  <td className="py-1 pr-2">
                    <JiffyIconSwitch
                      checked={dia.aberto}
                      onChange={e => atualizarDia(dia.diaDaSemana, { aberto: e.target.checked })}
                      disabled={salvando}
                      size="xs"
                      inputProps={{ 'aria-label': `Aberto ${LABEL_DIA_DA_SEMANA[dia.diaDaSemana]}` }}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      value={dia.abreEm}
                      disabled={!dia.aberto || salvando}
                      onChange={e => atualizarDia(dia.diaDaSemana, { abreEm: e.target.value })}
                      className="h-7 min-w-[5.5rem] rounded-md border border-gray-200 bg-white px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {horarios.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1">
                    <select
                      value={dia.fechaEm}
                      disabled={!dia.aberto || salvando}
                      onChange={e => atualizarDia(dia.diaDaSemana, { fechaEm: e.target.value })}
                      className="h-7 min-w-[5.5rem] rounded-md border border-gray-200 bg-white px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {horarios.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-3">
        <button
          type="button"
          onClick={() => void handleSalvar()}
          disabled={salvando || alternando}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 text-xs font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MdSave className="h-3.5 w-3.5" aria-hidden />
          {salvando ? 'Salvando...' : 'Salvar agenda'}
        </button>
      </div>
    </section>
  )
}

function AgendaHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <MdAccessTime className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-primary-text">Agenda de funcionamento</h2>
        {!compact ? (
          <p className="mt-0.5 text-sm text-secondary-text">
            Defina os dias e horários em que a loja online aceita pedidos.
          </p>
        ) : (
          <p className="text-[11px] leading-tight text-secondary-text">
            Horários em que a loja aceita pedidos.
          </p>
        )}
      </div>
    </div>
  )
}
