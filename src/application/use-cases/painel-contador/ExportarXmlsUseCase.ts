import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { ExportacaoXmlSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class ExportarXmlsUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(input: unknown) {
    const dto = ExportacaoXmlSchema.parse(input)
    return this.repository.exportarXmls(dto)
  }
}
