export type ModoTempoEntrega = 'imediato' | 'agendado'

export type SlotDisponibilidadeDTO = {
  inicio: string
  fim: string
  label: string
}

export type DisponibilidadeDeliveryDTO = {
  timezone: string
  abertaAgora: boolean
  permiteImediato: boolean
  aceitaAgendamento: boolean
  intervaloSlotMinutos: 15 | 30
  leadTimeMinutos: number
  diasAntecedenciaMax: number
  dataConsultada: string
  proximaAbertura: string | null
  slots: SlotDisponibilidadeDTO[]
}
