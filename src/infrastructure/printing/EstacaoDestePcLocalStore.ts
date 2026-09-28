import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'
import {
  getEstacaoImpressaoId,
  getEstacaoImpressaoNome,
  limparEstacaoImpressaoId,
  salvarEstacaoImpressaoId,
  salvarEstacaoImpressaoNome,
} from '@/src/infrastructure/printing/estacaoImpressaoStorage'

export class EstacaoDestePcLocalStore implements IEstacaoDestePcStore {
  obterId(): string | null {
    return getEstacaoImpressaoId()
  }

  obterNome(): string | null {
    return getEstacaoImpressaoNome()
  }

  salvar(id: string, nome?: string): void {
    salvarEstacaoImpressaoId(id, nome)
  }

  lembrarNome(nome: string): void {
    salvarEstacaoImpressaoNome(nome)
  }

  limpar(): void {
    limparEstacaoImpressaoId()
  }
}

export const estacaoDestePcLocalStore = new EstacaoDestePcLocalStore()
