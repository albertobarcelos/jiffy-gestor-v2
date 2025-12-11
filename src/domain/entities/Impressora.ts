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
    private readonly terminais?: any[]
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
    terminais?: any[]
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
      data.terminaisConfig || data.terminais // Aceita ambos os formatos
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

  getTerminais(): any[] | undefined {
    return this.terminais
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

