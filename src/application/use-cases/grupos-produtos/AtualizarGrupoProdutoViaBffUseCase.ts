import { fetchBffJson } from '@/src/infrastructure/api/bffClient'

export class AtualizarGrupoProdutoViaBffUseCase {
  async execute(input: {
    token: string
    grupoId: string
    patch: Record<string, unknown>
  }): Promise<void> {
    await fetchBffJson<unknown>(
      `/api/grupos-produtos/${encodeURIComponent(input.grupoId)}`,
      input.token,
      {
        method: 'PATCH',
        body: JSON.stringify(input.patch),
      }
    )
  }
}

export const atualizarGrupoProdutoViaBffUseCase = new AtualizarGrupoProdutoViaBffUseCase()
