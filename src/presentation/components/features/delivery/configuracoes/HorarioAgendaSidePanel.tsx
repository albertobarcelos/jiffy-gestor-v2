'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import type { DiaDaSemanaApi } from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import {
  DIAS_DA_SEMANA_ORDEM_COMPOSER,
  intervaloAgendaEhValido,
  LABEL_DIA_DA_SEMANA,
  LABEL_DIA_DA_SEMANA_CURTO,
  listarHorariosFuncionamento15Min,
  type GrupoHorarioAgenda,
} from '@/src/shared/utils/funcionamentoDelivery'
import { showToast } from '@/src/shared/utils/toast'

const HORARIO_COMPOSER_PADRAO = { abreEm: '18:00', fechaEm: '23:30' } as const

export type HorarioAgendaComposerResult = {
  dias: DiaDaSemanaApi[]
  abreEm: string
  fechaEm: string
  /** Dias do grupo original ao editar (para sobrescrever o grupo). */
  diasOriginais: DiaDaSemanaApi[] | null
}

type HorarioAgendaSidePanelProps = {
  open: boolean
  onClose: () => void
  /** null = criar; com grupo = editar (sobrescreve o grupo). */
  grupoEditando: GrupoHorarioAgenda | null
  disabled?: boolean
  onConfirm: (result: HorarioAgendaComposerResult) => void
}

export function HorarioAgendaSidePanel({
  open,
  onClose,
  grupoEditando,
  disabled = false,
  onConfirm,
}: HorarioAgendaSidePanelProps) {
  const horarios = useMemo(() => listarHorariosFuncionamento15Min(), [])
  const [diasComposer, setDiasComposer] = useState<Set<DiaDaSemanaApi>>(() => new Set())
  const [abreComposer, setAbreComposer] = useState<string>(HORARIO_COMPOSER_PADRAO.abreEm)
  const [fechaComposer, setFechaComposer] = useState<string>(HORARIO_COMPOSER_PADRAO.fechaEm)

  const editando = grupoEditando != null

  useEffect(() => {
    if (!open) return
    if (grupoEditando) {
      setDiasComposer(new Set(grupoEditando.dias))
      setAbreComposer(grupoEditando.abreEm)
      setFechaComposer(grupoEditando.fechaEm)
      return
    }
    setDiasComposer(new Set())
    setAbreComposer(HORARIO_COMPOSER_PADRAO.abreEm)
    setFechaComposer(HORARIO_COMPOSER_PADRAO.fechaEm)
  }, [open, grupoEditando])

  const toggleDiaComposer = useCallback((dia: DiaDaSemanaApi) => {
    setDiasComposer(prev => {
      const next = new Set(prev)
      if (next.has(dia)) next.delete(dia)
      else next.add(dia)
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (diasComposer.size === 0) {
      showToast.error('Selecione ao menos um dia da semana.')
      return
    }
    if (!intervaloAgendaEhValido(abreComposer, fechaComposer)) {
      showToast.error('Horário de abertura e fechamento devem ser diferentes.')
      return
    }

    onConfirm({
      dias: [...diasComposer],
      abreEm: abreComposer,
      fechaEm: fechaComposer,
      diasOriginais: grupoEditando?.dias ?? null,
    })
  }, [abreComposer, diasComposer, fechaComposer, grupoEditando, onConfirm])

  const footerActions = useMemo(
    (): JiffySidePanelFooterActions => ({
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'secondaryTint10',
      onCancel: onClose,
      cancelDisabled: disabled,
      showSave: true,
      saveLabel: editando ? 'Salvar horário' : 'Adicionar horário',
      onSave: handleConfirm,
      saveDisabled: disabled,
      barActionOrder: ['cancel', 'save'],
    }),
    [disabled, editando, handleConfirm, onClose]
  )

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar horário' : 'Novo horário'}
      subtitle="Selecione os dias da semana e o período que você recebe pedidos."
      panelClassName="w-[min(28rem,95vw)] max-w-[100vw] sm:w-[min(32rem,92vw)]"
      footerVariant="bar"
      footerActions={footerActions}
      fullScreenOnMobile
    >
      <div className="space-y-5 p-4 md:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">
            Dias da semana
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {DIAS_DA_SEMANA_ORDEM_COMPOSER.map(dia => {
              const checked = diasComposer.has(dia)
              return (
                <label
                  key={dia}
                  className="inline-flex cursor-pointer items-center gap-1 text-sm text-primary-text"
                >
                  <Checkbox
                    size="small"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleDiaComposer(dia)}
                    inputProps={{ 'aria-label': LABEL_DIA_DA_SEMANA[dia] }}
                    sx={{
                      color: 'var(--color-secondary)',
                      padding: '2px',
                      '&.Mui-checked': { color: 'var(--color-secondary)' },
                    }}
                  />
                  <span className="font-medium">{LABEL_DIA_DA_SEMANA_CURTO[dia]}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">
            Horários
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={abreComposer}
              disabled={disabled}
              onChange={e => setAbreComposer(e.target.value)}
              aria-label="Horário de abertura"
              className="h-10 min-w-[7rem] rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {horarios.map(h => (
                <option key={`abre-${h}`} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-sm text-secondary-text">até</span>
            <select
              value={fechaComposer}
              disabled={disabled}
              onChange={e => setFechaComposer(e.target.value)}
              aria-label="Horário de fechamento"
              className="h-10 min-w-[7rem] rounded-lg border border-gray-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {horarios.map(h => (
                <option key={`fecha-${h}`} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </JiffySidePanelModal>
  )
}
