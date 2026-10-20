import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'

export class DefinirEstacaoReceptoraDeliveryUseCase {
  constructor(private readonly gateway: IEstacaoImpressaoGateway) {}

  async execute(anterior: string | null, proxima: string | null): Promise<void> {
    const de = anterior?.trim() || null
    const para = proxima?.trim() || null
    if (de === para) return
    if (de && de !== para) {
      await this.gateway.atualizar(de, { gestorDelivery: false })
    }
    if (para) {
      await this.gateway.atualizar(para, { gestorDelivery: true })
    }
  }
}
