import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'

export class VincularEstacaoDestePcUseCase {
  constructor(private readonly store: IEstacaoDestePcStore) {}

  execute(estacaoId: string, nome?: string): void {
    const id = estacaoId.trim()
    if (!id) {
      this.store.limpar()
      return
    }
    this.store.salvar(id, nome)
  }
}
