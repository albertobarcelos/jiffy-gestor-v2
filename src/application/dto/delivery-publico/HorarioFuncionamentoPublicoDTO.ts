export type TurnoHorarioFuncionamentoPublicoDTO = {
  diaSemana: number
  horaInicio: string
  horaFim: string
}

export type HorarioFuncionamentoPublicoDTO = {
  timezone: string
  abertaAgora: boolean
  proximaAbertura: string | null
  turnos: TurnoHorarioFuncionamentoPublicoDTO[]
}
