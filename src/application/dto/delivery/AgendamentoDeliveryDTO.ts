export type IntervaloSlotMinutos = 15 | 30

export interface TurnoHorarioFuncionamentoDTO {
  id?: string
  diaSemana: number
  horaInicio: string
  horaFim: string
  ativo: boolean
}

export interface AgendamentoDeliveryConfigDTO {
  timezone: string
  aceitaAgendamento: boolean
  intervaloSlotMinutos: IntervaloSlotMinutos
  leadTimeMinutos: number
  diasAntecedenciaMax: number
  turnos: TurnoHorarioFuncionamentoDTO[]
}

export type UpdateAgendamentoDeliveryConfigInput = AgendamentoDeliveryConfigDTO

export const DIAS_SEMANA_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

export const FUSOS_IANA_BRASIL_AGENDAMENTO = [
  { id: 'America/Noronha', label: 'America/Noronha (Fernando de Noronha)' },
  { id: 'America/Sao_Paulo', label: 'America/Sao_Paulo — Brasília' },
  { id: 'America/Araguaina', label: 'America/Araguaina' },
  { id: 'America/Fortaleza', label: 'America/Fortaleza' },
  { id: 'America/Recife', label: 'America/Recife' },
  { id: 'America/Maceio', label: 'America/Maceió' },
  { id: 'America/Bahia', label: 'America/Bahia' },
  { id: 'America/Belem', label: 'America/Belém' },
  { id: 'America/Cuiaba', label: 'America/Cuiabá (MT)' },
  { id: 'America/Campo_Grande', label: 'America/Campo Grande (MS)' },
  { id: 'America/Manaus', label: 'America/Manaus (AM)' },
  { id: 'America/Porto_Velho', label: 'America/Porto Velho (RO)' },
  { id: 'America/Boa_Vista', label: 'America/Boa Vista (RR)' },
  { id: 'America/Rio_Branco', label: 'America/Rio Branco (AC)' },
] as const
