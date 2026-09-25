import { ncmCestDoBlocoFiscal } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'
import type { NcmCestFiscalLeitura } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'
import type { IProdutoFiscalReadRepository } from '@/src/domain/repositories/IProdutoFiscalReadRepository'
import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'

const INDISPONIVEL: NcmCestFiscalLeitura = { ncm: '', cest: '', indisponivel: true }

export class ProdutoFiscalReadRepository implements IProdutoFiscalReadRepository {
  async buscarNcmCestFiscal(produtoId: string, token: string): Promise<NcmCestFiscalLeitura> {
    const id = produtoId.trim()
    if (!id) return INDISPONIVEL

    try {
      const response = await fetchGestorApi(
        `/api/produtos/${encodeURIComponent(id)}?include=fiscal`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) return INDISPONIVEL
      const raw: unknown = await response.json()
      return { ...ncmCestDoBlocoFiscal(raw), indisponivel: false }
    } catch {
      return INDISPONIVEL
    }
  }
}

export const produtoFiscalReadRepository = new ProdutoFiscalReadRepository()
