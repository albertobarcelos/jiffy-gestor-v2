/** DTOs espelhando o módulo funcionamento delivery do backend. */

export const DIAS_DA_SEMANA_API = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
] as const

export type DiaDaSemanaApi = (typeof DIAS_DA_SEMANA_API)[number]

export type IntervaloFuncionamentoDTO = {
  abreEm: string
  fechaEm: string
}

export type FuncionamentoDoDiaDTO = {
  diaDaSemana: DiaDaSemanaApi
  intervalos: IntervaloFuncionamentoDTO[]
}

export type MotivoDisponibilidadeDelivery =
  | 'ABERTO_PELO_HORARIO'
  | 'FECHADO_FORA_DO_HORARIO'
  | 'FECHADO_SEM_ABERTURA_AUTOMATICA'
  | 'ABERTO_MANUALMENTE'
  | 'FECHADO_MANUALMENTE'
  | 'ABERTO_SEM_AGENDA'

export type TipoAlteracaoFuncionamento = 'ABERTURA' | 'FECHAMENTO'

export type OrigemAlteracaoFuncionamento = 'MANUAL'

export type AlteracaoFuncionamentoDTO = {
  tipo: TipoAlteracaoFuncionamento
  origem: OrigemAlteracaoFuncionamento
  iniciadoEm: string
  expiraEm: string | null
}

export type SubstituirAgendaFuncionamentoDeliveryRequest = {
  agendaSemanal: FuncionamentoDoDiaDTO[]
  abreAutomaticamente: boolean
  fechaAutomaticamente: boolean
}

export type AtualizarAutomacaoFuncionamentoDeliveryRequest = {
  abreAutomaticamente: boolean
  fechaAutomaticamente: boolean
}

export type AgendaFuncionamentoDeliveryDTO = {
  empresaDeliveryId: string
  persistido: boolean
  aberta: boolean
  agendaSemanal: FuncionamentoDoDiaDTO[]
  abreAutomaticamente: boolean
  fechaAutomaticamente: boolean
  dataUltimaModificacao: string | null
}

export type DisponibilidadeFuncionamentoDeliveryDTO = {
  empresaDeliveryId: string
  aberta: boolean
  motivo: MotivoDisponibilidadeDelivery
  proximaTransicaoEm: string | null
  alteracaoAtual: AlteracaoFuncionamentoDTO | null
}

export type AutomacaoFuncionamentoDeliveryDTO = {
  empresaDeliveryId: string
  persistido: boolean
  abreAutomaticamente: boolean
  fechaAutomaticamente: boolean
  alteracaoAtual: AlteracaoFuncionamentoDTO | null
  dataUltimaModificacao: string | null
}

export type FuncionamentoDeliveryDTO = {
  empresaDeliveryId: string
  persistido: boolean
  aberta: boolean
  motivo: MotivoDisponibilidadeDelivery
  proximaTransicaoEm: string | null
  agendaSemanal: FuncionamentoDoDiaDTO[]
  abreAutomaticamente: boolean
  fechaAutomaticamente: boolean
  alteracaoAtual: AlteracaoFuncionamentoDTO | null
  dataCriacao: string | null
  dataUltimaModificacao: string | null
}

export type FuncionamentoPublicoDiaDTO = {
  diaDaSemana: DiaDaSemanaApi
  intervalos: IntervaloFuncionamentoDTO[]
}

export type FuncionamentoPublicoDTO = {
  aberta: boolean
  motivo: MotivoDisponibilidadeDelivery
  agendaSemanal: FuncionamentoPublicoDiaDTO[]
}
