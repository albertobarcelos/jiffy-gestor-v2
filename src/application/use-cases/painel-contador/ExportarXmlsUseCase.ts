import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import {
  AgendamentoExportacaoXmlSchema,
  ExportacaoXmlSchema,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class ExportarXmlsUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async iniciar(input: unknown) {
    const dto = ExportacaoXmlSchema.parse(input)
    return this.repository.iniciarExportacaoXmls(dto)
  }

  async consultarStatus(exportacaoId: string) {
    if (!exportacaoId?.trim()) {
      throw new Error('Identificador da exportação é obrigatório')
    }
    return this.repository.consultarStatusExportacaoXml(exportacaoId)
  }

  async obterUrlDownload(exportacaoId: string) {
    if (!exportacaoId?.trim()) {
      throw new Error('Identificador da exportação é obrigatório')
    }
    return this.repository.obterUrlDownloadExportacaoXml(exportacaoId)
  }

  async listarHistorico(page = 0, size = 20) {
    return this.repository.listarHistoricoExportacaoXml(page, size)
  }

  async buscarAgendamento() {
    return this.repository.buscarAgendamentoExportacaoXml()
  }

  async salvarAgendamento(input: unknown) {
    const dto = AgendamentoExportacaoXmlSchema.parse(input)
    return this.repository.salvarAgendamentoExportacaoXml(dto)
  }

  async desativarAgendamento() {
    return this.repository.desativarAgendamentoExportacaoXml()
  }
}
