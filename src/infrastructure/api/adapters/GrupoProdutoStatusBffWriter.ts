import type { IGrupoProdutoStatusWriter } from '@/src/application/ports/IGrupoProdutoStatusWriter'
import { fetchBffVoid } from '@/src/infrastructure/api/bffClient'

export class GrupoProdutoStatusBffWriter implements IGrupoProdutoStatusWriter {
  async atualizarAtivo(input: {
    token: string
    grupoId: string
    ativo: boolean
  }): Promise<void> {
    await fetchBffVoid(
      `/api/grupos-produtos/${encodeURIComponent(input.grupoId)}`,
      input.token,
      {
        method: 'PATCH',
        body: JSON.stringify({ ativo: input.ativo }),
      }
    )
  }
}

export const grupoProdutoStatusBffWriter = new GrupoProdutoStatusBffWriter()
