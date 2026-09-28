/**
 * Persistência local da estação deste computador.
 * A chave é a mesma para delivery, balcão e caixa.
 */
export interface IEstacaoDestePcStore {
  obterId(): string | null
  salvar(id: string, nome?: string): void
  limpar(): void
}
