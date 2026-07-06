export const MVP_CHART_TIPO_OPCOES = [
  { value: 'colunas', label: 'Colunas' },
  { value: 'area', label: 'Área' },
  { value: 'barras', label: 'Barras' },
  { value: 'donut', label: 'Donut' },
  { value: 'linhas', label: 'Linhas' },
  { value: 'pizza', label: 'Pizza' },
] as const

/** Gráfico de participação por grupos — sem área (categorias discretas). */
export const MVP_CHART_TIPO_OPCOES_GRUPOS = MVP_CHART_TIPO_OPCOES.filter(op => op.value !== 'area')

/** Gráfico de evolução temporal — apenas linhas e colunas empilhadas. */
export const MVP_CHART_TIPO_OPCOES_EVOLUCAO = MVP_CHART_TIPO_OPCOES.filter(
  op => op.value === 'linhas' || op.value === 'colunas'
)

export type MvpChartTipo = (typeof MVP_CHART_TIPO_OPCOES)[number]['value']

export type MvpChartTipoGrupos = (typeof MVP_CHART_TIPO_OPCOES_GRUPOS)[number]['value']

export type MvpChartTipoEvolucao = (typeof MVP_CHART_TIPO_OPCOES_EVOLUCAO)[number]['value']

export const MVP_CHART_TIPO_DEFAULT: MvpChartTipo = 'colunas'

export const MVP_CHART_TIPO_GRUPOS_DEFAULT: MvpChartTipoGrupos = 'colunas'

export const MVP_CHART_TIPO_EVOLUCAO_DEFAULT: MvpChartTipoEvolucao = 'colunas'

export const MVP_CHART_TIPOS_STORAGE_KEY = 'jiffy:relatorio-produtos-vendidos:mvp-chart-tipos:v2'

/** Legado (v1): padrão antigo era `area`; migrado para `colunas` ao ler. */
export const MVP_CHART_TIPOS_STORAGE_KEY_V1 = 'jiffy:relatorio-produtos-vendidos:mvp-chart-tipos:v1'

export const MVP_PALETA_GRAFICOS = [
  '#530CA3',
  '#006699',
  '#00B074',
  '#FF9800',
  '#DC2626',
  '#14B8A6',
  '#B4DD2B',
  '#003366',
  '#8338EC',
  '#E85D04',
] as const

const TIPOS_VALIDOS = new Set<string>(MVP_CHART_TIPO_OPCOES.map(o => o.value))
const TIPOS_GRUPOS_VALIDOS = new Set<string>(MVP_CHART_TIPO_OPCOES_GRUPOS.map(o => o.value))
const TIPOS_EVOLUCAO_VALIDOS = new Set<string>(MVP_CHART_TIPO_OPCOES_EVOLUCAO.map(o => o.value))

export function parseMvpChartTipo(raw: unknown): MvpChartTipo {
  return typeof raw === 'string' && TIPOS_VALIDOS.has(raw)
    ? (raw as MvpChartTipo)
    : MVP_CHART_TIPO_DEFAULT
}

export function parseMvpChartTipoGrupos(raw: unknown): MvpChartTipoGrupos {
  if (raw === 'area') return MVP_CHART_TIPO_GRUPOS_DEFAULT
  return typeof raw === 'string' && TIPOS_GRUPOS_VALIDOS.has(raw)
    ? (raw as MvpChartTipoGrupos)
    : MVP_CHART_TIPO_GRUPOS_DEFAULT
}

/** Converte valor persistido; `area` legado vira `colunas` (antigo padrão do relatório). */
export function parseMvpChartTipoComMigracaoLegado(raw: unknown): MvpChartTipo {
  if (raw === 'area') return MVP_CHART_TIPO_DEFAULT
  return parseMvpChartTipo(raw)
}

export function parseMvpChartTipoEvolucao(raw: unknown): MvpChartTipoEvolucao {
  if (raw === 'linhas' || raw === 'colunas') return raw
  return MVP_CHART_TIPO_EVOLUCAO_DEFAULT
}
