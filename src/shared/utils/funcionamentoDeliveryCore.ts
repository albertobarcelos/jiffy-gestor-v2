import type {
  DiaDaSemanaApi,
  FuncionamentoDoDiaDTO,
  MotivoDisponibilidadeDelivery,
} from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import { DIAS_DA_SEMANA_API } from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'

/** Ordem exibida na UI (Segunda → Domingo). */
export const DIAS_DA_SEMANA_ORDEM_UI: DiaDaSemanaApi[] = [
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
  'DOMINGO',
]

export const LABEL_DIA_DA_SEMANA: Record<DiaDaSemanaApi, string> = {
  DOMINGO: 'Domingo',
  SEGUNDA: 'Segunda',
  TERCA: 'Terça',
  QUARTA: 'Quarta',
  QUINTA: 'Quinta',
  SEXTA: 'Sexta',
  SABADO: 'Sábado',
}

export const LABEL_MOTIVO_DISPONIBILIDADE: Record<MotivoDisponibilidadeDelivery, string> = {
  ABERTO_PELO_HORARIO: 'Aberta pelo horário da agenda',
  FECHADO_FORA_DO_HORARIO: 'Fechada fora do horário da agenda',
  FECHADO_SEM_ABERTURA_AUTOMATICA: 'Fechada — abertura automática desligada',
  ABERTO_MANUALMENTE: 'Aberta manualmente',
  FECHADO_MANUALMENTE: 'Fechada manualmente',
  ABERTO_SEM_AGENDA: 'Aberta — agenda ainda não configurada',
}

const HORARIOS_15_MIN: string[] = (() => {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
})()

export function listarHorariosFuncionamento15Min(): readonly string[] {
  return HORARIOS_15_MIN
}

export function arredondarHorarioFuncionamento15Min(valor: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(valor.trim())
  if (!match) return '09:00'
  const horas = Math.min(23, Math.max(0, Number(match[1])))
  const minutosBrutos = Math.min(59, Math.max(0, Number(match[2])))
  const minutos = Math.round(minutosBrutos / 15) * 15
  const minutosFinal = minutos >= 60 ? 45 : minutos
  return `${String(horas).padStart(2, '0')}:${String(minutosFinal).padStart(2, '0')}`
}

export function criarAgendaSemanalVazia(): FuncionamentoDoDiaDTO[] {
  return DIAS_DA_SEMANA_API.map(diaDaSemana => ({
    diaDaSemana,
    intervalos: [],
  }))
}

export function agendaTemDiaAberto(agendaSemanal: FuncionamentoDoDiaDTO[] | undefined): boolean {
  return (agendaSemanal ?? []).some(d => d.intervalos.length > 0)
}
