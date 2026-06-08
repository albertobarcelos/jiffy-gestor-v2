import { FiscalPainelApiRepository } from '@/src/infrastructure/api/repositories/FiscalPainelApiRepository'
import { VerificarProgressoPainelContadorUseCase } from '@/src/application/use-cases/painel-contador/VerificarProgressoPainelContadorUseCase'
import { CarregarResumoEmpresaPainelUseCase } from '@/src/application/use-cases/painel-contador/CarregarResumoEmpresaPainelUseCase'
import { GerenciarCertificadoUseCase } from '@/src/application/use-cases/painel-contador/GerenciarCertificadoUseCase'
import { SalvarConfiguracaoEmpresaUseCase } from '@/src/application/use-cases/painel-contador/SalvarConfiguracaoEmpresaUseCase'
import { SalvarConfiguracaoEmissaoUseCase } from '@/src/application/use-cases/painel-contador/SalvarConfiguracaoEmissaoUseCase'
import { ListarConfiguracoesNcmUseCase } from '@/src/application/use-cases/painel-contador/ListarConfiguracoesNcmUseCase'
import { SalvarConfiguracaoNcmUseCase } from '@/src/application/use-cases/painel-contador/SalvarConfiguracaoNcmUseCase'
import { CopiarConfiguracaoNcmUseCase } from '@/src/application/use-cases/painel-contador/CopiarConfiguracaoNcmUseCase'
import { ConsultarHistoricoNcmUseCase } from '@/src/application/use-cases/painel-contador/ConsultarHistoricoNcmUseCase'
import { ConsultarGapsNumeracaoUseCase } from '@/src/application/use-cases/painel-contador/ConsultarGapsNumeracaoUseCase'
import { InutilizarNumeracaoUseCase } from '@/src/application/use-cases/painel-contador/InutilizarNumeracaoUseCase'
import { GerenciarChaveIbptUseCase } from '@/src/application/use-cases/painel-contador/GerenciarChaveIbptUseCase'
import { ListarReformaTributariaUseCase } from '@/src/application/use-cases/painel-contador/ListarReformaTributariaUseCase'
import { SalvarReformaTributariaUseCase } from '@/src/application/use-cases/painel-contador/SalvarReformaTributariaUseCase'
import { ExportarXmlsUseCase } from '@/src/application/use-cases/painel-contador/ExportarXmlsUseCase'

export function createFiscalPainelRepository(token: string) {
  return new FiscalPainelApiRepository(token)
}

export function createPainelContadorUseCases(token: string) {
  const repo = createFiscalPainelRepository(token)
  return {
    verificarProgresso: new VerificarProgressoPainelContadorUseCase(repo),
    carregarResumo: new CarregarResumoEmpresaPainelUseCase(repo),
    certificado: new GerenciarCertificadoUseCase(repo),
    salvarEmpresa: new SalvarConfiguracaoEmpresaUseCase(repo),
    salvarEmissao: new SalvarConfiguracaoEmissaoUseCase(repo),
    listarNcms: new ListarConfiguracoesNcmUseCase(repo),
    salvarNcm: new SalvarConfiguracaoNcmUseCase(repo),
    copiarNcm: new CopiarConfiguracaoNcmUseCase(repo),
    historicoNcm: new ConsultarHistoricoNcmUseCase(repo),
    consultarGaps: new ConsultarGapsNumeracaoUseCase(repo),
    inutilizar: new InutilizarNumeracaoUseCase(repo),
    chaveIbpt: new GerenciarChaveIbptUseCase(repo),
    listarReforma: new ListarReformaTributariaUseCase(repo),
    salvarReforma: new SalvarReformaTributariaUseCase(repo),
    exportarXmls: new ExportarXmlsUseCase(repo),
    repository: repo,
  }
}
