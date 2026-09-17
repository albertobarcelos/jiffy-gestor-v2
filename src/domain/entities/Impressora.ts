import {
  modoFichaDerivado,
  parseModoImpressaoImpressora,
  resolverModoImpressaoDaEstacao,
  type ModoImpressaoImpressora,
} from '@/src/domain/types/modoImpressaoImpressora'

export type ImpressoraTerminalConfig = {
  terminalId?: string
  ativo?: boolean
  modoFicha?: boolean
  modoImpressao?: ModoImpressaoImpressora
  modelo?: string
  ip?: string
  porta?: string
  tipoConexao?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function mapTerminalConfig(raw: unknown): ImpressoraTerminalConfig {
  const r = asRecord(raw) ?? {}
  const modoImpressao = parseModoImpressaoImpressora(
    r.modoImpressao ?? r.modo_impressao,
    r.modoFicha === true || r.modoFicha === 'true' || r.modo_ficha === true || r.modo_ficha === 'true'
  )
  const ativo = r.ativo === true || r.ativo === 'true' || r.ativo === undefined
  const terminalIdRaw = r.terminalId ?? r.estacaoId ?? r.estacaoImpressaoId
  return {
    terminalId: terminalIdRaw != null ? String(terminalIdRaw) : undefined,
    ativo,
    modoImpressao,
    modoFicha: modoFichaDerivado(modoImpressao),
    modelo: r.modelo != null ? String(r.modelo) : undefined,
    ip: r.ip != null ? String(r.ip) : undefined,
    porta: r.porta != null ? String(r.porta) : undefined,
    tipoConexao: r.tipoConexao != null ? String(r.tipoConexao) : undefined,
  }
}

/**
 * Entidade de domínio representando uma Impressora
 */
export class Impressora {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly modelo?: string,
    private readonly ativo: boolean = true,
    private readonly tipoConexao?: string,
    private readonly ip?: string,
    private readonly porta?: string,
    private readonly dataAtualizacao?: string,
    private readonly dataCriacao?: string,
    private readonly terminais?: ImpressoraTerminalConfig[]
  ) {}

  static create(
    id: string,
    nome: string,
    modelo?: string,
    ativo: boolean = true,
    tipoConexao?: string,
    ip?: string,
    porta?: string,
    dataAtualizacao?: string,
    dataCriacao?: string,
    terminais?: ImpressoraTerminalConfig[]
  ): Impressora {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Impressora(
      id,
      nome,
      modelo,
      ativo,
      tipoConexao,
      ip,
      porta,
      dataAtualizacao,
      dataCriacao,
      terminais
    )
  }

  static fromJSON(data: any): Impressora {
    const terminaisRaw = data.terminaisConfig || data.terminais
    const terminais = Array.isArray(terminaisRaw) ? terminaisRaw.map(mapTerminalConfig) : undefined

    return Impressora.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      data.modelo?.toString(),
      data.ativo === true || data.ativo === 'true',
      data.tipoConexao?.toString(),
      data.ip?.toString(),
      data.porta?.toString(),
      data.dataAtualizacao?.toString(),
      data.dataCriacao?.toString(),
      terminais
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getModelo(): string | undefined {
    return this.modelo
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getTipoConexao(): string | undefined {
    return this.tipoConexao
  }

  getIp(): string | undefined {
    return this.ip
  }

  getPorta(): string | undefined {
    return this.porta
  }

  getDataAtualizacao(): string | undefined {
    return this.dataAtualizacao
  }

  getDataCriacao(): string | undefined {
    return this.dataCriacao
  }

  getTerminais(): ImpressoraTerminalConfig[] | undefined {
    return this.terminais
  }

  getModoImpressaoDaEstacao(estacaoId?: string | null): ModoImpressaoImpressora {
    return resolverModoImpressaoDaEstacao(this.terminais, estacaoId)
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      modelo: this.modelo,
      ativo: this.ativo,
      tipoConexao: this.tipoConexao,
      ip: this.ip,
      porta: this.porta,
      dataAtualizacao: this.dataAtualizacao,
      dataCriacao: this.dataCriacao,
      terminais: this.terminais,
    }
  }
}
