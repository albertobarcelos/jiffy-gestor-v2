/**
 * Grid compartilhado: Qtd | Produto | Unid. | Desc. | Val Unit. | Total | Ações.
 * Cabeçalho e cada linha são grids independentes, então as larguras precisam ser fixas
 * (não `auto`) para alinharem entre si.
 */
export const CARRINHO_PRODUTOS_GRID_CLASS =
  'grid grid-cols-[6.5rem_minmax(0,1fr)_2.75rem_4rem_5.5rem_7rem_3.5rem] gap-x-1 items-center'

export const STEPPER_BTN_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35'

export const ACAO_BTN_CLASS =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800'

export const ACAO_REMOVER_CLASS =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600'

/** Desloca o nome do complemento à direita sem mover Unid., Val Unit., Total etc. */
export const COMPLEMENTO_CARRINHO_NOME_DESLOCAMENTO_CLASS = 'pl-4'
