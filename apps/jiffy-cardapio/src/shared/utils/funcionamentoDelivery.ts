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

function diaDaSemanaEm(agora: Date = new Date()): DiaDaSemanaApi {
  return MAP_JS_DIA_PARA_API[agora.getDay()] ?? 'SEGUNDA'
}

function diaDaSemanaHoje(): DiaDaSemanaApi {
  return diaDaSemanaEm()
}

function formatarIntervalo(abreEm: string, fechaEm: string): string {
  return `das ${abreEm} às ${fechaEm}`
}

function buscarIntervaloHoje(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[],
  agora: Date = new Date()
): { abreEm: string; fechaEm: string } | null {
  const hoje = diaDaSemanaEm(agora)
  const dia = agendaSemanal.find(d => d.diaDaSemana === hoje)
  return dia?.intervalos[0] ?? null
}

function horarioParaMinutos(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return 0
  const horas = Math.min(23, Math.max(0, Number(match[1])))
  const minutos = Math.min(59, Math.max(0, Number(match[2])))
  return horas * 60 + minutos
}

function agoraEmMinutos(agora: Date = new Date()): number {
  return agora.getHours() * 60 + agora.getMinutes()
}

export type ProximaAberturaPublica = {
  abreEm: string
  diaDaSemana: DiaDaSemanaApi
  ehHoje: boolean
  ehAmanha: boolean
}

/** Próximo horário de abertura a partir de agora (considera se o de hoje ainda não passou). */
export function resolverProximaAbertura(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[],
  agora: Date = new Date()
): ProximaAberturaPublica | null {
  const ordem = DIAS_DA_SEMANA_ORDEM_UI
  const hojeIdx = ordem.indexOf(MAP_JS_DIA_PARA_API[agora.getDay()] ?? 'SEGUNDA')
  const minutosAgora = agoraEmMinutos(agora)

  for (let offset = 0; offset < ordem.length; offset++) {
    const diaKey = ordem[(hojeIdx + offset) % ordem.length]!
    const dia = agendaSemanal.find(d => d.diaDaSemana === diaKey)
    const intervalo = dia?.intervalos[0]
    if (!intervalo) continue

    if (offset === 0 && horarioParaMinutos(intervalo.abreEm) <= minutosAgora) {
      continue
    }

    return {
      abreEm: intervalo.abreEm,
      diaDaSemana: diaKey,
      ehHoje: offset === 0,
      ehAmanha: offset === 1,
    }
  }

  return null
}

function formatarProximaAberturaDetalhe(proxima: ProximaAberturaPublica): string {
  if (proxima.ehHoje) return `Abriremos às ${proxima.abreEm}`
  if (proxima.ehAmanha) return `Abriremos amanhã às ${proxima.abreEm}`
  return `Abriremos ${LABEL_DIA_DA_SEMANA[proxima.diaDaSemana].toLowerCase()} às ${proxima.abreEm}`
}

export type StatusLojaPublica = {
  /** Linha principal (ex.: "Aberto, faça seu pedido!" / "Estamos fechado!"). */
  mensagem: string
  /** Linha secundária com horário (ex.: "até as 22:45" / "Abriremos amanhã às 09:00"). */
  detalheHorario: string | null
}

/**
 * Status da loja no cardápio público (mensagem + horário opcional).
 */
export function formatarStatusLojaPublica(input: {
  aberta: boolean
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[]
  agora?: Date
}): StatusLojaPublica {
  if (input.aberta) {
    const intervaloHoje = buscarIntervaloHoje(input.agendaSemanal, input.agora)
    return {
      mensagem: 'Aberto, faça seu pedido!',
      detalheHorario: intervaloHoje?.fechaEm
        ? `até as ${intervaloHoje.fechaEm}`
        : null,
    }
  }

  const proxima = resolverProximaAbertura(input.agendaSemanal, input.agora)
  return {
    mensagem: 'Estamos fechado!',
    detalheHorario: proxima
      ? formatarProximaAberturaDetalhe(proxima)
      : 'Consulte os horários',
  }
}

/** @deprecated Preferir `formatarStatusLojaPublica`. */
export function formatarMensagemStatusLojaPublica(input: {
  aberta: boolean
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[]
  agora?: Date
}): string {
  return formatarStatusLojaPublica(input).mensagem
}

/** Texto curto para badge de horário na loja pública. */
export function formatarHorarioFuncionamentoPublico(input: {
  aberta: boolean
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[]
  agora?: Date
}): string {
  const intervaloHoje = buscarIntervaloHoje(input.agendaSemanal, input.agora)

  if (input.aberta && intervaloHoje) {
    return formatarIntervalo(intervaloHoje.abreEm, intervaloHoje.fechaEm)
  }

  if (input.aberta && !intervaloHoje) {
    return 'Aberta agora'
  }

  if (intervaloHoje && horarioParaMinutos(intervaloHoje.abreEm) > agoraEmMinutos(input.agora)) {
    return `abre às ${intervaloHoje.abreEm}`
  }

  const proxima = resolverProximaAbertura(input.agendaSemanal, input.agora)
  if (proxima) return `abre às ${proxima.abreEm}`

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

export type LinhaAgendaPublica = {
  diaDaSemana: DiaDaSemanaApi
  label: string
  texto: string
  aberto: boolean
}

/** Lista Segunda→Domingo com horários (ou “Fechado”) para o modal da loja. */
export function listarAgendaSemanalPublica(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[] | undefined
): LinhaAgendaPublica[] {
  const porDia = new Map((agendaSemanal ?? []).map(d => [d.diaDaSemana, d]))

  return DIAS_DA_SEMANA_ORDEM_UI.map(diaDaSemana => {
    const intervalos = porDia.get(diaDaSemana)?.intervalos ?? []
    const aberto = intervalos.length > 0
    const texto = aberto
      ? intervalos.map(i => `${i.abreEm} – ${i.fechaEm}`).join(', ')
      : 'Fechado'

    return {
      diaDaSemana,
      label: LABEL_DIA_DA_SEMANA[diaDaSemana],
      texto,
      aberto,
    }
  })
}
