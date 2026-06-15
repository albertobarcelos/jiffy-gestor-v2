import { EmpresaPainelResumo } from '@/src/domain/entities/painel-contador/EmpresaPainelResumo'
import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'
import { CertificadoDigital } from '@/src/domain/entities/painel-contador/CertificadoDigital'
import { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'
import { ConfiguracaoNcmImpostos } from '@/src/domain/entities/painel-contador/ConfiguracaoNcmImpostos'
import { formatarRegimeTributario } from '@/src/shared/helpers/formatarRegimeTributario'
import type { ResumoEmpresaPainelDTO, ProgressoEtapasDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import type { ProgressoEtapasMap } from '@/src/domain/policies/painel-contador/EtapaHabilitadaPolicy'
import type { CertificadoStatusResult } from '@/src/domain/policies/painel-contador/CertificadoValidoPolicy'

export class FiscalPainelMapper {
  static toEmpresaEntity(data: unknown): EmpresaPainelResumo | null {
    return EmpresaPainelResumo.fromApiResponse(
      data && typeof data === 'object' ? (data as Record<string, unknown>) : null
    )
  }

  static toConfiguracaoFiscalEntity(data: unknown): ConfiguracaoFiscalEmpresa | null {
    return ConfiguracaoFiscalEmpresa.fromApiResponse(
      data && typeof data === 'object' ? (data as Record<string, unknown>) : null
    )
  }

  static toCertificadoEntity(data: unknown): CertificadoDigital | null {
    return CertificadoDigital.fromApiResponse(
      data && typeof data === 'object' ? (data as Record<string, unknown>) : null
    )
  }

  static toConfiguracaoEmissaoList(data: unknown): ConfiguracaoEmissao[] {
    if (!Array.isArray(data)) return []
    return data
      .map((item) =>
        ConfiguracaoEmissao.fromApiResponse(item as Record<string, unknown>)
      )
      .filter((c): c is ConfiguracaoEmissao => c != null)
  }

  static toNcmList(data: unknown): ConfiguracaoNcmImpostos[] {
    const content = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)
        ? (data as { content: unknown[] }).content
        : []

    return content
      .map((item) =>
        ConfiguracaoNcmImpostos.fromApiResponse(item as Record<string, unknown>)
      )
      .filter((n): n is ConfiguracaoNcmImpostos => n != null)
  }

  static toResumoEmpresaDTO(
    empresa: EmpresaPainelResumo | null,
    configFiscal: ConfiguracaoFiscalEmpresa | null
  ): ResumoEmpresaPainelDTO {
    return {
      id: empresa?.id ?? '',
      nomeExibicao: empresa?.nomeExibicao ?? 'Empresa',
      cnpj: empresa?.cnpj ?? '--',
      regimeLabel: formatarRegimeTributario(configFiscal?.codigoRegimeTributario),
      codigoRegimeTributario: configFiscal?.codigoRegimeTributario ?? null,
    }
  }

  static toProgressoEtapasDTO(
    etapasConcluidas: ProgressoEtapasMap,
    certificadoStatus: CertificadoStatusResult | null
  ): ProgressoEtapasDTO {
    const obrigatorias: (keyof ProgressoEtapasMap)[] = [
      'etapa-1-dados-fiscais',
      'etapa-2-emissor-fiscal',
      'etapa-3-cenario-fiscal',
    ]
    const totalConcluidasObrigatorias = obrigatorias.filter((id) => etapasConcluidas[id]).length

    return {
      etapasConcluidas,
      certificadoStatus,
      totalObrigatorias: obrigatorias.length,
      totalConcluidasObrigatorias,
      porcentagemObrigatorias: (totalConcluidasObrigatorias / obrigatorias.length) * 100,
    }
  }
}
