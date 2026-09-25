import type { NcmCestFiscalLeitura } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'

export interface IProdutoFiscalReadRepository {
  buscarNcmCestFiscal(produtoId: string, token: string): Promise<NcmCestFiscalLeitura>
}
