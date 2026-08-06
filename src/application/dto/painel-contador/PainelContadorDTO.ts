import { z } from 'zod'
import type { CertificadoStatusResult } from '@/src/domain/policies/painel-contador/CertificadoValidoPolicy'
import type { ProgressoEtapasMap } from '@/src/domain/policies/painel-contador/EtapaHabilitadaPolicy'

export interface ResumoEmpresaPainelDTO {
  id: string
  nomeExibicao: string
  cnpj: string
  regimeLabel: string
  codigoRegimeTributario: number | null
}

export interface ProgressoEtapasDTO {
  etapasConcluidas: ProgressoEtapasMap
  certificadoStatus: CertificadoStatusResult | null
  totalObrigatorias: number
  totalConcluidasObrigatorias: number
  porcentagemObrigatorias: number
}

export const SalvarCertificadoSchema = z.object({
  cnpj: z.string().min(14),
  certificadoPfx: z.string().min(1),
  senhaCertificado: z.string().min(1),
  aliasCertificado: z.string().min(1),
})

export type SalvarCertificadoDTO = z.infer<typeof SalvarCertificadoSchema>

export const SalvarEmissaoSchema = z.object({
  modelo: z.union([z.literal(55), z.literal(65)]),
  serie: z.number().positive(),
  numeroInicial: z.number().positive(),
  terminalId: z.null().optional(),
  nfeAtivo: z.boolean().optional(),
  nfceAtivo: z.boolean().optional(),
  nfceCscId: z.string().optional(),
  nfceCscCodigo: z.string().optional(),
  ambiente: z.enum(['HOMOLOGACAO', 'PRODUCAO']),
})

export type SalvarEmissaoDTO = z.infer<typeof SalvarEmissaoSchema>

export const SalvarNcmImpostosSchema = z.object({
  cfop: z.string().optional(),
  csosn: z.string().optional(),
  icms: z
    .object({
      origem: z.number().optional(),
      cst: z.string().optional(),
      aliquota: z.number().optional(),
    })
    .optional(),
  pis: z.object({ cst: z.string().optional(), aliquota: z.number().optional() }).optional(),
  cofins: z.object({ cst: z.string().optional(), aliquota: z.number().optional() }).optional(),
})

export type SalvarNcmImpostosDTO = z.infer<typeof SalvarNcmImpostosSchema>

export const CopiarNcmSchema = z.object({
  ncmsDestino: z.array(z.string().length(8)).min(1),
  observacao: z.string().optional(),
})

export type CopiarNcmDTO = z.infer<typeof CopiarNcmSchema>

export const InutilizarNumeracaoSchema = z.object({
  uf: z.string().min(2),
  ambiente: z.enum(['HOMOLOGACAO', 'PRODUCAO']),
  modelo: z.union([z.literal(55), z.literal(65)]),
  serie: z.number().positive(),
  numeroInicial: z.number().positive(),
  numeroFinal: z.number().positive(),
  justificativa: z.string().min(15),
})

export type InutilizarNumeracaoDTO = z.infer<typeof InutilizarNumeracaoSchema>

export interface GapsQueryDTO {
  modelo: 55 | 65
  serie: number
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO'
  numeroInicial?: number
  numeroFinal?: number
}

export const ExportacaoXmlTipoSchema = z.enum(['AUTORIZADO', 'CANCELADO', 'INUTILIZADO'])

export const ExportacaoXmlSchema = z
  .object({
    mes: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato yyyy-MM')
      .optional(),
    dataInicial: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar no formato yyyy-MM-dd')
      .optional(),
    dataFinal: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar no formato yyyy-MM-dd')
      .optional(),
    tipos: z.array(ExportacaoXmlTipoSchema).min(1, 'Selecione ao menos um tipo de XML'),
    timezone: z.string().optional(),
    emailsNotificacao: z.array(z.string().email('E-mail inválido')).optional(),
  })
  .refine(
    (data) => {
      const hasMes = Boolean(data.mes)
      const hasRange = Boolean(data.dataInicial && data.dataFinal)
      return (hasMes && !data.dataInicial && !data.dataFinal) || (!hasMes && hasRange)
    },
    { message: 'Informe o mês (yyyy-MM) ou o par data inicial e data final.' }
  )

export type ExportacaoXmlDTO = z.infer<typeof ExportacaoXmlSchema>

export type ExportacaoXmlStatusEnum = 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'

/** Fase interna do job — usar para texto da UI; download só quando status === CONCLUIDO. */
export type ExportacaoXmlFaseEnum =
  | 'PROCESSANDO_XMLS'
  | 'FINALIZANDO_ZIP'
  | 'CONCLUIDO'
  | 'ERRO'

export interface ExportacaoXmlIniciadaDTO {
  exportacaoId: string
  status?: ExportacaoXmlStatusEnum
  [key: string]: unknown
}

export interface ExportacaoXmlStatusDTO {
  exportacaoId: string
  status: ExportacaoXmlStatusEnum
  /** Quantidade de XMLs já processados (não é percentual 0–100). */
  progresso: number
  totalEncontrados?: number
  fase?: ExportacaoXmlFaseEnum | string | null
  mensagemErro?: string | null
}

export type ExportacaoTipoDisparo = 'MANUAL' | 'AGENDADO'

export type NotificacaoEmailStatus =
  | 'PENDENTE'
  | 'ENVIADO'
  | 'ENTREGUE'
  | 'BOUNCE'
  | 'FALHOU'

export interface ExportacaoNotificacaoDTO {
  email: string
  status: NotificacaoEmailStatus
  enviadoEm?: string | null
  entregueEm?: string | null
  mensagemErro?: string | null
}

export interface ExportacaoHistoricoItemDTO {
  exportacaoId: string
  periodo: string
  tipoDisparo: ExportacaoTipoDisparo
  status: ExportacaoXmlStatusEnum
  criadoEm: string
  concluidoEm?: string | null
  totalEncontrados?: number
  totalExportados?: number
  downloadDisponivel: boolean
  notificacoes?: ExportacaoNotificacaoDTO[]
  /** Tipos solicitados na exportação (quando a API enviar). */
  tipos?: Array<'AUTORIZADO' | 'CANCELADO' | 'INUTILIZADO' | string>
}

export interface PaginaExportacaoHistoricoDTO {
  content: ExportacaoHistoricoItemDTO[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export const AgendamentoExportacaoXmlSchema = z.object({
  emails: z.array(z.string().email('E-mail inválido')).min(1, 'Informe ao menos um e-mail'),
  tipos: z.array(ExportacaoXmlTipoSchema).min(1, 'Selecione ao menos um tipo de XML'),
  timezone: z.string().optional(),
})

export type AgendamentoExportacaoXmlDTO = z.infer<typeof AgendamentoExportacaoXmlSchema>

export interface AgendamentoExportacaoXmlResponseDTO {
  id: string
  empresaId?: string
  emails: string[]
  tipos: string[]
  timezone?: string
  ativo: boolean
  criadoEm?: string
  atualizadoEm?: string
  ultimaExecucao?: string | null
}

export interface PaginaNcmDTO {
  content: import('@/src/domain/entities/painel-contador/ConfiguracaoNcmImpostos').ConfiguracaoNcmImpostos[]
  totalElements: number
  totalPages: number
}

export interface AtualizarEmpresaDTO {
  cnpj?: string
  razaoSocial?: string
  nomeFantasia?: string
  email?: string
  telefone?: string
  endereco?: {
    cep?: string
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
  }
}

export interface SalvarFiscalDTO {
  empresaId?: string
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  codigoRegimeTributario?: number
  simplesNacional?: boolean
  contribuinteIcms?: boolean
  ibptToken?: string | null
}
