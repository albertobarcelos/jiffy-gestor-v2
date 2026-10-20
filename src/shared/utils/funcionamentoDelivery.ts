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

/** Abreviações para o composer (dom → sáb). */
export const LABEL_DIA_DA_SEMANA_CURTO: Record<DiaDaSemanaApi, string> = {
  DOMINGO: 'dom',
  SEGUNDA: 'seg',
  TERCA: 'ter',
  QUARTA: 'qua',
  QUINTA: 'qui',
  SEXTA: 'sex',
  SABADO: 'sáb',
}

/** Ordem dos checkboxes no composer (Domingo → Sábado). */
export const DIAS_DA_SEMANA_ORDEM_COMPOSER: DiaDaSemanaApi[] = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
]

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
  // Lista começa vazia — dias entram só após o composer.
  return []
}

export function agendaDtoParaForm(
  agendaSemanal: FuncionamentoDoDiaDTO[] | undefined
): DiaAgendaFormState[] {
  const porDia = new Map((agendaSemanal ?? []).map(d => [d.diaDaSemana, d]))

  return DIAS_DA_SEMANA_ORDEM_UI.flatMap(diaDaSemana => {
    const dto = porDia.get(diaDaSemana)
    const intervalo = dto?.intervalos[0]
    if (!intervalo) return []
    return [
      {
        diaDaSemana,
        aberto: true,
        abreEm: arredondarHorarioFuncionamento15Min(intervalo.abreEm),
        fechaEm: arredondarHorarioFuncionamento15Min(intervalo.fechaEm),
      },
    ]
  })
}

export function formAgendaParaRequest(
  form: DiaAgendaFormState[],
  automacao: { abreAutomaticamente: boolean; fechaAutomaticamente: boolean }
): SubstituirAgendaFuncionamentoDeliveryRequest {
  const abertos = new Map(
    form.filter(dia => dia.aberto).map(dia => [dia.diaDaSemana, dia] as const)
  )

  return {
    abreAutomaticamente: automacao.abreAutomaticamente,
    fechaAutomaticamente: automacao.fechaAutomaticamente,
    // Sempre envia os 7 dias; ausentes na lista = fechados.
    agendaSemanal: DIAS_DA_SEMANA_ORDEM_UI.map(diaDaSemana => {
      const dia = abertos.get(diaDaSemana)
      return {
        diaDaSemana,
        intervalos: dia
          ? [
              {
                abreEm: arredondarHorarioFuncionamento15Min(dia.abreEm),
                fechaEm: arredondarHorarioFuncionamento15Min(dia.fechaEm),
              },
            ]
          : [],
      }
    }),
  }
}

export function intervaloAgendaEhValido(abreEm: string, fechaEm: string): boolean {
  const abre = arredondarHorarioFuncionamento15Min(abreEm)
  const fecha = arredondarHorarioFuncionamento15Min(fechaEm)
  return abre !== fecha
}

/** Card visual: dias que compartilham o mesmo intervalo. */
export type GrupoHorarioAgenda = {
  id: string
  abreEm: string
  fechaEm: string
  dias: DiaDaSemanaApi[]
}

export function agruparDiasAgendaPorIntervalo(
  dias: DiaAgendaFormState[]
): GrupoHorarioAgenda[] {
  const ordem = new Map(DIAS_DA_SEMANA_ORDEM_UI.map((dia, idx) => [dia, idx]))
  const porIntervalo = new Map<string, GrupoHorarioAgenda>()

  for (const dia of dias) {
    if (!dia.aberto) continue
    const abreEm = arredondarHorarioFuncionamento15Min(dia.abreEm)
    const fechaEm = arredondarHorarioFuncionamento15Min(dia.fechaEm)
    const id = `${abreEm}|${fechaEm}`
    const existente = porIntervalo.get(id)
    if (existente) {
      existente.dias.push(dia.diaDaSemana)
    } else {
      porIntervalo.set(id, { id, abreEm, fechaEm, dias: [dia.diaDaSemana] })
    }
  }

  return [...porIntervalo.values()]
    .map(grupo => ({
      ...grupo,
      dias: [...grupo.dias].sort(
        (a, b) => (ordem.get(a) ?? 0) - (ordem.get(b) ?? 0)
      ),
    }))
    .sort((a, b) => {
      const aIdx = ordem.get(a.dias[0]!) ?? 0
      const bIdx = ordem.get(b.dias[0]!) ?? 0
      return aIdx - bIdx
    })
}

/** Ex.: "Dom, Ter, Qua, Qui, Sex, Sáb" */
export function formatarDiasGrupoCurto(dias: DiaDaSemanaApi[]): string {
  const ordem = new Map(DIAS_DA_SEMANA_ORDEM_COMPOSER.map((dia, idx) => [dia, idx]))
  return [...dias]
    .sort((a, b) => (ordem.get(a) ?? 0) - (ordem.get(b) ?? 0))
    .map(dia => {
      const curto = LABEL_DIA_DA_SEMANA_CURTO[dia]
      return curto.charAt(0).toUpperCase() + curto.slice(1)
    })
    .join(', ')
}

export function formatarIntervaloGrupo(abreEm: string, fechaEm: string): string {
  return `${arredondarHorarioFuncionamento15Min(abreEm)} – ${arredondarHorarioFuncionamento15Min(fechaEm)}`
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

/** Espera o servidor aplicar a transição automática antes do refetch. */
export const BUFFER_MS_REFETCH_FUNCIONAMENTO = 2_000

/** Sem horário anunciado: segurança contra mudança em outro dispositivo. */
export const INTERVALO_FALLBACK_REFETCH_FUNCIONAMENTO_MS = 60_000

/** Teto do intervalo — setTimeout/RQ não devem esperar horas demais. */
export const INTERVALO_MAX_REFETCH_FUNCIONAMENTO_MS = 60 * 60 * 1000

export type SinalTransicaoFuncionamento = {
  proximaTransicaoEm?: string | null
  alteracaoAtual?: { expiraEm?: string | null } | null
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

/**
 * Quanto esperar até buscar de novo o status da loja.
 * Usa o horário que o servidor já calcula (`proximaTransicaoEm` / `expiraEm`).
 */
export function msAteRefetchFuncionamentoDelivery(
  sinal: SinalTransicaoFuncionamento | null | undefined,
  agora: Date = new Date()
): number {
  const candidatos = [parseIsoMs(sinal?.proximaTransicaoEm), parseIsoMs(sinal?.alteracaoAtual?.expiraEm)]
  const timestamps = candidatos.filter((ms): ms is number => ms != null)

  if (timestamps.length === 0) {
    return INTERVALO_FALLBACK_REFETCH_FUNCIONAMENTO_MS
  }

  const alvo = Math.min(...timestamps)
  const restante = alvo - agora.getTime() + BUFFER_MS_REFETCH_FUNCIONAMENTO
  if (restante <= 0) {
    return BUFFER_MS_REFETCH_FUNCIONAMENTO
  }
  return Math.min(restante, INTERVALO_MAX_REFETCH_FUNCIONAMENTO_MS)
}
