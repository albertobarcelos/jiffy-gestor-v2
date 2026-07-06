import { EmpresaPainelResumo } from '@/src/domain/entities/painel-contador/EmpresaPainelResumo'
import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'
import { CertificadoDigital } from '@/src/domain/entities/painel-contador/CertificadoDigital'
import { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'
import type {
  SalvarCertificadoDTO,
  SalvarEmissaoDTO,
  SalvarNcmImpostosDTO,
  CopiarNcmDTO,
  InutilizarNumeracaoDTO,
  GapsQueryDTO,
  PaginaNcmDTO,
  AtualizarEmpresaDTO,
  SalvarFiscalDTO,
  ExportacaoXmlDTO,
  ExportacaoXmlResumoDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

export interface CertificadoApiResult {
  certificado: CertificadoDigital | null
}

export interface HistoricoNcmItem {
  id: string
  acao: string
  dataAlteracao: string
  [key: string]: unknown
}

export interface InutilizacaoItemDTO {
  inutilizacaoId: string
  modelo: number
  serie: number
  numeroInicial: number
  numeroFinal: number
  status: string
  protocolo?: string | null
  justificativa: string
  inutilizadoEm: string
}

export interface FaixaNumeracaoInutilizavelDTO {
  numeroInicial: number
  numeroFinal: number
  quantidadeNumeros: number
}

export interface NumeracaoInutilizavelDTO {
  modelo: number
  serie: number
  ambiente: string
  numeroInicialAnalisado: number
  numeroFinalAnalisado: number
  proximoNumeroConfigurado: number
  totalItens: number
  faixas: FaixaNumeracaoInutilizavelDTO[]
}

/** @deprecated Use NumeracaoInutilizavelDTO */
export type GapsResponseDTO = NumeracaoInutilizavelDTO

export interface ReformaTributariaItem {
  id: string
  ncm: { codigo: string; descricao?: string }
  cst: string
  codigoClassificacaoFiscal: string
}

export interface IFiscalPainelRepository {
  getEmpresaMe(): Promise<EmpresaPainelResumo | null>
  getConfiguracaoFiscal(): Promise<ConfiguracaoFiscalEmpresa | null>
  getCertificado(): Promise<CertificadoApiResult>
  salvarCertificado(input: SalvarCertificadoDTO): Promise<void>
  removerCertificado(): Promise<void>
  listarConfiguracoesEmissao(): Promise<ConfiguracaoEmissao[]>
  salvarConfiguracaoEmissao(modelo: 55 | 65, input: SalvarEmissaoDTO): Promise<ConfiguracaoEmissao>
  listarNcms(page: number, size: number): Promise<PaginaNcmDTO>
  salvarConfiguracaoNcm(ncm: string, input: SalvarNcmImpostosDTO): Promise<void>
  copiarConfiguracaoNcm(ncm: string, input: CopiarNcmDTO): Promise<void>
  getHistoricoNcm(ncm: string): Promise<HistoricoNcmItem[]>
  consultarGapsNumeracao(params: GapsQueryDTO): Promise<NumeracaoInutilizavelDTO>
  inutilizarNumeracao(input: InutilizarNumeracaoDTO): Promise<void>
  listarInutilizacoes(modelo: number, serie: number): Promise<InutilizacaoItemDTO[]>
  salvarIbptToken(token: string | null): Promise<ConfiguracaoFiscalEmpresa | null>
  atualizarEmpresa(id: string, input: AtualizarEmpresaDTO): Promise<EmpresaPainelResumo | null>
  salvarConfiguracaoFiscal(input: SalvarFiscalDTO): Promise<ConfiguracaoFiscalEmpresa | null>
  validarCidade(cidade: string, uf: string): Promise<boolean>
  listarReformaTributaria(): Promise<ReformaTributariaItem[]>
  salvarReformaTributaria(ncm: string, input: { cst: string; codigoClassificacaoFiscal: string }): Promise<void>
  exportarXmls(
    input: ExportacaoXmlDTO
  ): Promise<{ blob: Blob; filename: string } | ExportacaoXmlResumoDTO>
}
