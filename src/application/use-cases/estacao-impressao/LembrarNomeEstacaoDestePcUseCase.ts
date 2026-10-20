import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'

export class LembrarNomeEstacaoDestePcUseCase {
  constructor(private readonly store: IEstacaoDestePcStore) {}

  execute(nome: string): void {
    const value = nome.trim()
    if (!value) return
    this.store.lembrarNome(value)
  }
}
