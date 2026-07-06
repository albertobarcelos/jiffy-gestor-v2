import type { RelatorioProdutoVendidoClasseAbc } from '@/src/shared/types/relatoriosProdutosVendidosApi'

/** Cores alinhadas aos badges ABC da tabela de produtos. */
export const MVP_CORES_CLASSE_ABC: Record<RelatorioProdutoVendidoClasseAbc, string> = {
  A: '#00B074',
  B: '#530CA3',
  C: '#DC2626',
}

export const MVP_LABEL_CLASSE_ABC: Record<RelatorioProdutoVendidoClasseAbc, string> = {
  A: 'Classe A',
  B: 'Classe B',
  C: 'Classe C',
}

export type MvpAbcMetricaDonut = 'faturamento' | 'skus'
