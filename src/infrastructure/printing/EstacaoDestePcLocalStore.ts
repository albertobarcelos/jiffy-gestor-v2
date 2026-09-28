import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'
import {
  getEstacaoImpressaoId,
  limparEstacaoImpressaoId,
  salvarEstacaoImpressaoId,
} from '@/src/infrastructure/printing/estacaoImpressaoStorage'

export class EstacaoDestePcLocalStore implements IEstacaoDestePcStore {
  obterId(): string | null {
    return getEstacaoImpressaoId()
  }

  salvar(id: string, nome?: string): void {
    salvarEstacaoImpressaoId(id, nome)
  }

  limpar(): void {
    limparEstacaoImpressaoId()
  }
}
