/** Colunas configuráveis da tabela. */
export type MvpColunaId =
  | 'index'
  | 'abc'
  | 'produto'
  | 'grupo'
  | 'quantidade'
  | 'varQtd'
  | 'varFat'
  | 'faturamento'
  | 'precoMedio'
  | 'pctUnidades'
  | 'pctFaturamento'
  | 'valorCardapio'
  | 'deltaPrecoVsCardapio'

export interface MvpPaineisVisibilidade {
  kpis: boolean
  participacao: boolean
  evolucao: boolean
}

export interface MvpPersonalizacaoLayout {
  colunas: MvpColunaId[]
  paineis: MvpPaineisVisibilidade
}

export const MVP_STORAGE_KEY = 'jiffy:relatorio-produtos-vendidos:mvp-layout:v2'

export const MVP_COLUNAS_DEFAULT: MvpColunaId[] = [
  'index',
  'abc',
  'produto',
  'grupo',
  'quantidade',
  'varQtd',
  'varFat',
  'faturamento',
  'precoMedio',
]

export const MVP_PAINEIS_DEFAULT: MvpPaineisVisibilidade = {
  kpis: false,
  participacao: false,
  evolucao: false,
}

export const MVP_LAYOUT_DEFAULT: MvpPersonalizacaoLayout = {
  colunas: MVP_COLUNAS_DEFAULT,
  paineis: MVP_PAINEIS_DEFAULT,
}

export const MVP_COLUNA_CATALOGO: { id: MvpColunaId; label: string; hint?: string }[] = [
  { id: 'index', label: '#', hint: 'Posição na lista' },
  { id: 'abc', label: 'ABC' },
  { id: 'produto', label: 'Produto' },
  { id: 'grupo', label: 'Grupo' },
  { id: 'quantidade', label: 'Quantidade' },
  {
    id: 'varQtd',
    label: '% Qtd (Per. anterior)',
    hint: 'Variação percentual da quantidade em relação ao período anterior',
  },
  {
    id: 'varFat',
    label: '% Fat. (Per. anterior)',
    hint: 'Variação percentual do faturamento em relação ao período anterior',
  },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'precoMedio', label: 'Preço médio' },
  { id: 'pctUnidades', label: '% Qtd. (no Período)', hint: 'Participação em quantidade no conjunto filtrado' },
  { id: 'pctFaturamento', label: '% Fat. (no Período)', hint: 'Participação em faturamento no conjunto filtrado' },
  { id: 'valorCardapio', label: 'Preço cardápio' },
  { id: 'deltaPrecoVsCardapio', label: 'Δ% vs cardápio' },
]

const COLUNA_IDS = new Set<string>(MVP_COLUNA_CATALOGO.map(c => c.id))
const ORDEM_COLUNA = MVP_COLUNA_CATALOGO.map(c => c.id)

/** Reinsere colunas visíveis na posição canônica (não no fim da lista). */
export function ordenarColunasPorCatalogo(colunas: MvpColunaId[]): MvpColunaId[] {
  const ativas = new Set(colunas)
  const ordenadas = ORDEM_COLUNA.filter(id => ativas.has(id))
  if (!ordenadas.includes('produto')) {
    return ['produto', ...ordenadas]
  }
  return ordenadas.length ? ordenadas : ['produto']
}

function normalizarColunas(raw: unknown): MvpColunaId[] {
  if (!Array.isArray(raw)) return [...MVP_COLUNAS_DEFAULT]
  const filtrado = raw.filter((id): id is MvpColunaId => typeof id === 'string' && COLUNA_IDS.has(id))
  const unicos = [...new Set(filtrado)]
  if (!unicos.length) return [...MVP_COLUNAS_DEFAULT]
  return ordenarColunasPorCatalogo(unicos)
}

function normalizarPaineis(raw: unknown): MvpPaineisVisibilidade {
  if (!raw || typeof raw !== 'object') return { ...MVP_PAINEIS_DEFAULT }
  const p = raw as Record<string, unknown>
  return {
    kpis: p.kpis === true,
    participacao: p.participacao === true,
    evolucao: p.evolucao === true,
  }
}

export function storageKeyMvpLayout(empresaId: string | null): string {
  return empresaId ? `${MVP_STORAGE_KEY}:${empresaId}` : MVP_STORAGE_KEY
}

export function carregarMvpLayout(empresaId: string | null): MvpPersonalizacaoLayout {
  if (typeof window === 'undefined') return cloneLayout(MVP_LAYOUT_DEFAULT)
  try {
    const raw = localStorage.getItem(storageKeyMvpLayout(empresaId))
    if (!raw) return cloneLayout(MVP_LAYOUT_DEFAULT)
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      colunas: normalizarColunas(parsed.colunas),
      paineis: normalizarPaineis(parsed.paineis),
    }
  } catch {
    return cloneLayout(MVP_LAYOUT_DEFAULT)
  }
}

export function salvarMvpLayout(empresaId: string | null, layout: MvpPersonalizacaoLayout): void {
  if (typeof window === 'undefined') return
  const normalizado: MvpPersonalizacaoLayout = {
    colunas: ordenarColunasPorCatalogo(layout.colunas),
    paineis: { ...layout.paineis },
  }
  try {
    localStorage.setItem(storageKeyMvpLayout(empresaId), JSON.stringify(normalizado))
  } catch {
    /* quota / privado */
  }
}

export function cloneLayout(layout: MvpPersonalizacaoLayout): MvpPersonalizacaoLayout {
  return {
    colunas: [...layout.colunas],
    paineis: { ...layout.paineis },
  }
}

export function toggleColunaLista(colunas: MvpColunaId[], id: MvpColunaId): MvpColunaId[] {
  if (id === 'produto') return ordenarColunasPorCatalogo(colunas)
  let next: MvpColunaId[]
  if (colunas.includes(id)) {
    next = colunas.filter(c => c !== id)
    if (!next.length) next = ['produto']
  } else {
    next = [...colunas, id]
  }
  return ordenarColunasPorCatalogo(next)
}
