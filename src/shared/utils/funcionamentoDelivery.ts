import type {
  DiaDaSemanaApi,
  FuncionamentoDoDiaDTO,
  FuncionamentoPublicoDiaDTO,
  MotivoDisponibilidadeDelivery,
  SubstituirAgendaFuncionamentoDeliveryRequest,
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

export type DiaAgendaFormState = {
  diaDaSemana: DiaDaSemanaApi
  aberto: boolean
  abreEm: string
  fechaEm: string
}

export function criarAgendaSemanalVazia(): FuncionamentoDoDiaDTO[] {
  return DIAS_DA_SEMANA_API.map(diaDaSemana => ({
    diaDaSemana,
    intervalos: [],
  }))
}

export function criarFormAgendaPadrao(): DiaAgendaFormState[] {
  return DIAS_DA_SEMANA_ORDEM_UI.map(diaDaSemana => ({
    diaDaSemana,
    aberto: diaDaSemana !== 'DOMINGO',
    abreEm: '09:00',
    fechaEm: '22:00',
  }))
}

export function agendaDtoParaForm(
  agendaSemanal: FuncionamentoDoDiaDTO[] | undefined
): DiaAgendaFormState[] {
  const porDia = new Map((agendaSemanal ?? []).map(d => [d.diaDaSemana, d]))

  return DIAS_DA_SEMANA_ORDEM_UI.map(diaDaSemana => {
    const dto = porDia.get(diaDaSemana)
    const intervalo = dto?.intervalos[0]
    return {
      diaDaSemana,
      aberto: Boolean(intervalo),
      abreEm: intervalo ? arredondarHorarioFuncionamento15Min(intervalo.abreEm) : '09:00',
      fechaEm: intervalo ? arredondarHorarioFuncionamento15Min(intervalo.fechaEm) : '22:00',
    }
  })
}

export function formAgendaParaRequest(
  form: DiaAgendaFormState[],
  automacao: { abreAutomaticamente: boolean; fechaAutomaticamente: boolean }
): SubstituirAgendaFuncionamentoDeliveryRequest {
  return {
    abreAutomaticamente: automacao.abreAutomaticamente,
    fechaAutomaticamente: automacao.fechaAutomaticamente,
    agendaSemanal: form.map(dia => ({
      diaDaSemana: dia.diaDaSemana,
      intervalos: dia.aberto
        ? [
            {
              abreEm: arredondarHorarioFuncionamento15Min(dia.abreEm),
              fechaEm: arredondarHorarioFuncionamento15Min(dia.fechaEm),
            },
          ]
        : [],
    })),
  }
}

export function agendaTemDiaAberto(agendaSemanal: FuncionamentoDoDiaDTO[] | undefined): boolean {
  return (agendaSemanal ?? []).some(d => d.intervalos.length > 0)
}

const MAP_JS_DIA_PARA_API: Record<number, DiaDaSemanaApi> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
}

function diaDaSemanaHoje(): DiaDaSemanaApi {
  return MAP_JS_DIA_PARA_API[new Date().getDay()] ?? 'SEGUNDA'
}

function formatarIntervalo(abreEm: string, fechaEm: string): string {
  return `das ${abreEm} às ${fechaEm}`
}

function buscarIntervaloHoje(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[]
): { abreEm: string; fechaEm: string } | null {
  const hoje = diaDaSemanaHoje()
  const dia = agendaSemanal.find(d => d.diaDaSemana === hoje)
  return dia?.intervalos[0] ?? null
}

function buscarProximaAbertura(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[]
): string | null {
  const ordem = [...DIAS_DA_SEMANA_ORDEM_UI]
  const hojeIdx = ordem.indexOf(diaDaSemanaHoje())
  const rotacionado = [...ordem.slice(hojeIdx), ...ordem.slice(0, hojeIdx)]

  for (let offset = 0; offset < rotacionado.length; offset++) {
    const diaKey = rotacionado[offset]!
    const dia = agendaSemanal.find(d => d.diaDaSemana === diaKey)
    const intervalo = dia?.intervalos[0]
    if (!intervalo) continue
    if (offset === 0) return intervalo.abreEm
    return intervalo.abreEm
  }
  return null
}

/** Texto curto para badge de horário na loja pública. */
export function formatarHorarioFuncionamentoPublico(input: {
  aberta: boolean
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[]
}): string {
  const intervaloHoje = buscarIntervaloHoje(input.agendaSemanal)

  if (input.aberta && intervaloHoje) {
    return formatarIntervalo(intervaloHoje.abreEm, intervaloHoje.fechaEm)
  }

  if (input.aberta && !intervaloHoje) {
    return 'Aberta agora'
  }

  if (intervaloHoje) {
    return `abre às ${intervaloHoje.abreEm}`
  }

  const proxima = buscarProximaAbertura(input.agendaSemanal)
  if (proxima) return `abre às ${proxima}`

  return 'Consulte os horários'
}

export function formatarHorarioFuncionamentoHoje(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[] | undefined
): string {
  return formatarHorarioFuncionamentoPublico({
    aberta: true,
    agendaSemanal: agendaSemanal ?? [],
  })
}
