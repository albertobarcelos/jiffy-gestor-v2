/** SLA padrão da coluna Em preparo (minutos desde a entrada na etapa). Vermelho a partir daqui. */
export const TEMPO_PREPARO_KANBAN_PADRAO_MIN = 30

export const TEMPO_PREPARO_KANBAN_MIN = 5
export const TEMPO_PREPARO_KANBAN_MAX = 180

/** Minutos antes do prazo em que o cartão fica laranja (padrão: 20 até 30). */
export const TEMPO_PREPARO_ALERTA_RESTANTE_MIN = 10

export const EVENTO_TEMPO_PREPARO_ATUALIZADO = 'jiffy:tempo-preparo-updated'
