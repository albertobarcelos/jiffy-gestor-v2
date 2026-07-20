import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { FiscalPainelMapper } from '@/src/application/mappers/FiscalPainelMapper'
import { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'
import type {
  IFiscalPainelRepository,
  CertificadoApiResult,
  HistoricoNcmItem,
  InutilizacaoItemDTO,
  NumeracaoInutilizavelDTO,
  ReformaTributariaItem,
} from '@/src/domain/repositories/IFiscalPainelRepository'
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
  ExportacaoXmlIniciadaDTO,
  ExportacaoXmlStatusDTO,
  PaginaExportacaoHistoricoDTO,
  AgendamentoExportacaoXmlDTO,
  AgendamentoExportacaoXmlResponseDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'
import { EmpresaPainelResumo } from '@/src/domain/entities/painel-contador/EmpresaPainelResumo'
import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'

function authHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...extra,
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T))
}

/**
 * Implementação HTTP do painel fiscal (BFF Next.js).
 */
export class FiscalPainelApiRepository implements IFiscalPainelRepository {
  constructor(private readonly token: string) {}

  private async get<T>(path: string): Promise<T> {
    const response = await fetchGestorApi(path, {
      cache: 'no-store',
      headers: authHeaders(this.token),
    })
    if (!response.ok) {
      throw new Error(`Erro ao buscar ${path}: ${response.status}`)
    }
    return parseJson<T>(response)
  }

  private async mutate(
    path: string,
    method: string,
    body?: unknown
  ): Promise<Response> {
    const response = await fetchGestorApi(path, {
      method,
      cache: 'no-store',
      headers: authHeaders(this.token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return response
  }

  async getEmpresaMe(): Promise<EmpresaPainelResumo | null> {
    const data = await this.get<Record<string, unknown>>('/api/empresas/me')
    return FiscalPainelMapper.toEmpresaEntity(data)
  }

  async getConfiguracaoFiscal(): Promise<ConfiguracaoFiscalEmpresa | null> {
    try {
      const data = await this.get<Record<string, unknown>>(
        '/api/v1/fiscal/empresas-fiscais/me'
      )
      return FiscalPainelMapper.toConfiguracaoFiscalEntity(data)
    } catch {
      return null
    }
  }

  async getCertificado(): Promise<CertificadoApiResult> {
    const response = await fetchGestorApi('/api/certificado', {
      cache: 'no-store',
      headers: authHeaders(this.token),
    })
    const result = await parseJson<{ success?: boolean; data?: Record<string, unknown> }>(
      response
    )
    if (!response.ok || !result.success || !result.data) {
      return { certificado: null }
    }
    return {
      certificado: FiscalPainelMapper.toCertificadoEntity(result.data),
    }
  }

  async salvarCertificado(input: SalvarCertificadoDTO): Promise<void> {
    const response = await this.mutate('/api/certificado', 'POST', input)
    if (!response.ok) {
      const err = await parseJson<{ error?: string; message?: string }>(response)
      throw new Error(err.error ?? err.message ?? 'Erro ao cadastrar certificado')
    }
  }

  async removerCertificado(): Promise<void> {
    const response = await this.mutate('/api/certificado', 'DELETE')
    if (!response.ok) {
      throw new Error('Erro ao remover certificado')
    }
  }

  async listarConfiguracoesEmissao(): Promise<ConfiguracaoEmissao[]> {
    try {
      const data = await this.get<unknown>('/api/v1/fiscal/configuracoes/emissao')
      return FiscalPainelMapper.toConfiguracaoEmissaoList(data)
    } catch {
      return []
    }
  }

  async salvarConfiguracaoEmissao(
    modelo: 55 | 65,
    input: SalvarEmissaoDTO
  ): Promise<ConfiguracaoEmissao> {
    const response = await this.mutate(
      `/api/v1/fiscal/configuracoes/emissao/${modelo}`,
      'PUT',
      input
    )
    const data = await parseJson<Record<string, unknown>>(response)
    if (!response.ok) {
      throw new Error(
        String((data as { error?: string }).error ?? 'Erro ao salvar configuração de emissão')
      )
    }
    const entity = ConfiguracaoEmissao.fromApiResponse(data)
    if (!entity) throw new Error('Resposta inválida ao salvar emissão')
    return entity
  }

  async listarNcms(page: number, size: number): Promise<PaginaNcmDTO> {
    const data = await this.get<{ content?: unknown[]; totalElements?: number; totalPages?: number }>(
      `/api/v1/fiscal/configuracoes/ncms?page=${page}&size=${size}`
    )
    const content = FiscalPainelMapper.toNcmList(data)
    return {
      content,
      totalElements: data.totalElements ?? content.length,
      totalPages: data.totalPages ?? 1,
    }
  }

  async salvarConfiguracaoNcm(ncm: string, input: SalvarNcmImpostosDTO): Promise<void> {
    const response = await this.mutate(
      `/api/v1/fiscal/configuracoes/ncms/${ncm}/impostos`,
      'POST',
      input
    )
    if (!response.ok) {
      const err = await parseJson<{ error?: string }>(response)
      throw new Error(err.error ?? 'Erro ao salvar configuração NCM')
    }
  }

  async copiarConfiguracaoNcm(ncm: string, input: CopiarNcmDTO): Promise<void> {
    const response = await this.mutate(
      `/api/v1/fiscal/configuracoes/ncms/${ncm}/impostos/copiar`,
      'POST',
      input
    )
    if (!response.ok) {
      throw new Error('Erro ao copiar configuração NCM')
    }
  }

  async getHistoricoNcm(ncm: string): Promise<HistoricoNcmItem[]> {
    const data = await this.get<HistoricoNcmItem[]>(
      `/api/v1/fiscal/configuracoes/ncms/${ncm}/impostos/historico`
    )
    return Array.isArray(data) ? data : []
  }

  async consultarGapsNumeracao(params: GapsQueryDTO): Promise<NumeracaoInutilizavelDTO> {
    const search = new URLSearchParams({
      modelo: String(params.modelo),
      serie: String(params.serie),
      ambiente: params.ambiente,
    })
    if (params.numeroInicial != null) {
      search.set('numeroInicial', String(params.numeroInicial))
    }
    if (params.numeroFinal != null) {
      search.set('numeroFinal', String(params.numeroFinal))
    }
    return this.get<NumeracaoInutilizavelDTO>(
      `/api/v1/fiscal/documentos/inutilizaveis?${search.toString()}`
    )
  }

  async inutilizarNumeracao(input: InutilizarNumeracaoDTO): Promise<void> {
    const response = await this.mutate('/api/v1/fiscal/operacoes/inutilizar', 'POST', input)
    if (!response.ok) {
      throw new Error('Erro ao inutilizar numeração')
    }
  }

  async listarInutilizacoes(modelo: number, serie: number): Promise<InutilizacaoItemDTO[]> {
    try {
      const data = await this.get<InutilizacaoItemDTO[]>(
        `/api/v1/fiscal/inutilizacoes?modelo=${modelo}&serie=${serie}`
      )
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  async salvarIbptToken(token: string | null): Promise<ConfiguracaoFiscalEmpresa | null> {
    const response = await this.mutate('/api/v1/fiscal/empresas-fiscais', 'POST', {
      ibptToken: token,
    })
    const data = await parseJson<Record<string, unknown>>(response)
    if (!response.ok) {
      throw new Error(
        String((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message ?? 'Erro ao salvar chave IBPT')
      )
    }
    return FiscalPainelMapper.toConfiguracaoFiscalEntity(data)
  }

  async atualizarEmpresa(
    id: string,
    input: AtualizarEmpresaDTO
  ): Promise<EmpresaPainelResumo | null> {
    const response = await this.mutate(`/api/empresas/${id}`, 'PATCH', input)
    const data = await parseJson<Record<string, unknown>>(response)
    if (!response.ok) {
      throw new Error('Erro ao atualizar empresa')
    }
    return FiscalPainelMapper.toEmpresaEntity(data)
  }

  async salvarConfiguracaoFiscal(
    input: SalvarFiscalDTO
  ): Promise<ConfiguracaoFiscalEmpresa | null> {
    const response = await this.mutate('/api/v1/fiscal/empresas-fiscais', 'POST', input)
    const data = await parseJson<Record<string, unknown>>(response)
    if (!response.ok) {
      throw new Error('Erro ao salvar configuração fiscal')
    }
    return FiscalPainelMapper.toConfiguracaoFiscalEntity(data)
  }

  async validarCidade(cidade: string, uf: string): Promise<boolean> {
    try {
      const data = await this.get<{ valido?: boolean }>(
        `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(cidade)}&uf=${encodeURIComponent(uf)}`
      )
      return data.valido === true
    } catch {
      return false
    }
  }

  async listarReformaTributaria(): Promise<ReformaTributariaItem[]> {
    try {
      const data = await this.get<ReformaTributariaItem[]>(
        '/api/v1/fiscal/configuracoes/ncms/reforma-tributaria'
      )
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  async salvarReformaTributaria(
    ncm: string,
    input: { cst: string; codigoClassificacaoFiscal: string }
  ): Promise<void> {
    const response = await this.mutate(
      `/api/v1/fiscal/configuracoes/ncms/${ncm}/reforma-tributaria`,
      'POST',
      input
    )
    if (!response.ok) {
      throw new Error('Erro ao salvar reforma tributária')
    }
  }

  async iniciarExportacaoXmls(input: ExportacaoXmlDTO): Promise<ExportacaoXmlIniciadaDTO> {
    const response = await this.mutate('/api/v1/fiscal/exportacao/xmls', 'POST', input)
    const data = await parseJson<ExportacaoXmlIniciadaDTO & { error?: string; message?: string }>(
      response
    )
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erro ao iniciar exportação de XMLs')
    }
    if (!data.exportacaoId) {
      throw new Error('Resposta inválida: exportacaoId ausente')
    }
    return data
  }

  async consultarStatusExportacaoXml(exportacaoId: string): Promise<ExportacaoXmlStatusDTO> {
    return this.get<ExportacaoXmlStatusDTO>(
      `/api/v1/fiscal/exportacao/xmls/${encodeURIComponent(exportacaoId)}/status`
    )
  }

  async obterUrlDownloadExportacaoXml(exportacaoId: string): Promise<{ url: string }> {
    const response = await fetchGestorApi(
      `/api/v1/fiscal/exportacao/xmls/${encodeURIComponent(exportacaoId)}/download`,
      {
        cache: 'no-store',
        headers: authHeaders(this.token),
        redirect: 'manual',
      }
    )

    if (response.status === 410) {
      throw new Error('Link expirado. Exporte novamente.')
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location') || response.headers.get('location')
      if (location) return { url: location }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const data = await parseJson<{ url?: string; error?: string; message?: string }>(response)
      if (response.ok && data.url) return { url: data.url }
      throw new Error(data.error || data.message || 'Erro ao obter link de download')
    }

    if (!response.ok) {
      throw new Error(`Erro ao obter download: ${response.status}`)
    }

    throw new Error('Link de download não disponível')
  }

  async listarHistoricoExportacaoXml(
    page: number,
    size: number
  ): Promise<PaginaExportacaoHistoricoDTO> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    })
    return this.get<PaginaExportacaoHistoricoDTO>(
      `/api/v1/fiscal/exportacao/xmls/historico?${params.toString()}`
    )
  }

  async buscarAgendamentoExportacaoXml(): Promise<AgendamentoExportacaoXmlResponseDTO | null> {
    const response = await fetchGestorApi('/api/v1/fiscal/exportacao/xmls/agendamento', {
      cache: 'no-store',
      headers: authHeaders(this.token),
    })
    if (response.status === 404) return null
    if (!response.ok) {
      const data = await parseJson<{ error?: string; message?: string }>(response)
      throw new Error(data.error || data.message || 'Erro ao buscar agendamento')
    }
    const data = await parseJson<AgendamentoExportacaoXmlResponseDTO | null>(response)
    if (!data || !data.id) return null
    return data
  }

  async salvarAgendamentoExportacaoXml(
    input: AgendamentoExportacaoXmlDTO
  ): Promise<AgendamentoExportacaoXmlResponseDTO> {
    const response = await this.mutate(
      '/api/v1/fiscal/exportacao/xmls/agendamento',
      'PUT',
      input
    )
    const data = await parseJson<
      AgendamentoExportacaoXmlResponseDTO & { error?: string; message?: string }
    >(response)
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erro ao salvar agendamento')
    }
    return data
  }

  async desativarAgendamentoExportacaoXml(): Promise<void> {
    const response = await this.mutate('/api/v1/fiscal/exportacao/xmls/agendamento', 'DELETE')
    if (!response.ok) {
      const data = await parseJson<{ error?: string; message?: string }>(response)
      throw new Error(data.error || data.message || 'Erro ao desativar agendamento')
    }
  }
}
