import { z } from 'zod'

const horaHmValidator = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora deve estar no formato HH:mm')

export const turnoHorarioFuncionamentoSchema = z
  .object({
    id: z.string().optional(),
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: horaHmValidator,
    horaFim: horaHmValidator,
    ativo: z.boolean(),
  })
  .strict()

export const agendamentoDeliveryConfigSchema = z
  .object({
    timezone: z.string().min(1),
    aceitaAgendamento: z.boolean(),
    intervaloSlotMinutos: z.union([z.literal(15), z.literal(30)]),
    leadTimeMinutos: z.number().int().nonnegative(),
    diasAntecedenciaMax: z.number().int().min(1).max(7),
    turnos: z.array(turnoHorarioFuncionamentoSchema),
  })
  .strict()

export const updateAgendamentoDeliveryConfigSchema =
  agendamentoDeliveryConfigSchema

export type IntervaloSlotMinutos = 15 | 30

export type TurnoHorarioFuncionamentoDTO = z.infer<
  typeof turnoHorarioFuncionamentoSchema
>

export type AgendamentoDeliveryConfigDTO = z.infer<
  typeof agendamentoDeliveryConfigSchema
>

export type UpdateAgendamentoDeliveryConfigInput =
  AgendamentoDeliveryConfigDTO

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
