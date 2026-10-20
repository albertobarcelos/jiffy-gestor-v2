import type {
  DiaDaSemanaApi,
  FuncionamentoDoDiaDTO,
  FuncionamentoPublicoDiaDTO,
  SubstituirAgendaFuncionamentoDeliveryRequest,
} from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import {
  horarioParaMinutos,
  intervaloCruzaMeiaNoite,
} from '@jiffy/intervalo-horario'
import {
  agendaTemDiaAberto,
  arredondarHorarioFuncionamento15Min,
  criarAgendaSemanalVazia,
  DIAS_DA_SEMANA_ORDEM_UI,
  LABEL_DIA_DA_SEMANA,
  LABEL_MOTIVO_DISPONIBILIDADE,
  listarHorariosFuncionamento15Min,
} from '@jiffy/funcionamento-delivery-core'

export {
  agendaTemDiaAberto,
  arredondarHorarioFuncionamento15Min,
  criarAgendaSemanalVazia,
  DIAS_DA_SEMANA_ORDEM_UI,
  LABEL_DIA_DA_SEMANA,
  LABEL_MOTIVO_DISPONIBILIDADE,
  listarHorariosFuncionamento15Min,
}

export type DiaAgendaFormState = {
  diaDaSemana: DiaDaSemanaApi
  aberto: boolean
  abreEm: string
  fechaEm: string
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
  const base = `das ${abreEm} às ${fechaEm}`
  if (!intervaloCruzaMeiaNoite(abreEm, fechaEm)) return base
  return `${base} (dia seguinte)`
}

function buscarIntervaloHoje(
  agendaSemanal: FuncionamentoPublicoDiaDTO[] | FuncionamentoDoDiaDTO[],
  agora: Date = new Date()
): { abreEm: string; fechaEm: string } | null {
  const hoje = diaDaSemanaEm(agora)
  const dia = agendaSemanal.find(d => d.diaDaSemana === hoje)
  return dia?.intervalos[0] ?? null
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
    if (!intervaloHoje?.fechaEm) {
      return {
        mensagem: 'Aberto, faça seu pedido!',
        detalheHorario: null,
      }
    }
    const sufixoVirada = intervaloCruzaMeiaNoite(
      intervaloHoje.abreEm,
      intervaloHoje.fechaEm
    )
      ? ' (dia seguinte)'
      : ''
    return {
      mensagem: 'Aberto, faça seu pedido!',
      detalheHorario: `até as ${intervaloHoje.fechaEm}${sufixoVirada}`,
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
      ? intervalos
          .map(i => {
            const base = `${i.abreEm} – ${i.fechaEm}`
            return intervaloCruzaMeiaNoite(i.abreEm, i.fechaEm)
              ? `${base} (dia seguinte)`
              : base
          })
          .join(', ')
      : 'Fechado'

    return {
      diaDaSemana,
      label: LABEL_DIA_DA_SEMANA[diaDaSemana],
      texto,
      aberto,
    }
  })
}
