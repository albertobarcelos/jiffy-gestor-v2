/**
 * Entidade de domínio representando uma taxa cadastrada para a empresa.
 */
export class Taxa {
  private constructor(
    private readonly id: string,
    private readonly empresaId: string,
    private readonly nome: string,
    private readonly valor: number,
    private readonly tipo: string,
    private readonly ativo: boolean,
    private readonly tributado: boolean,
    private readonly ncm: string | null,
    private readonly dataCriacao?: string,
    private readonly dataAtualizacao?: string,
    private readonly dataExclusao?: string | null
  ) {}

  static create(
    id: string,
    empresaId: string,
    nome: string,
    valor: number,
    tipo: string,
    ativo: boolean,
    tributado: boolean,
    ncm: string | null,
    dataCriacao?: string,
    dataAtualizacao?: string,
    dataExclusao?: string | null
  ): Taxa {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Taxa(
      id,
      empresaId,
      nome,
      valor,
      tipo,
      ativo,
      tributado,
      ncm,
      dataCriacao,
      dataAtualizacao,
      dataExclusao
    )
  }

  static fromJSON(data: Record<string, unknown>): Taxa {
    const valorRaw = data.valor
    const valor =
      typeof valorRaw === 'number'
        ? valorRaw
        : typeof valorRaw === 'string'
          ? parseFloat(valorRaw)
          : 0

    const ncmRaw = data.ncm
    const ncm =
      ncmRaw === null || ncmRaw === undefined
        ? null
        : String(ncmRaw)

    return Taxa.create(
      data.id != null ? String(data.id) : '',
      data.empresaId != null ? String(data.empresaId) : '',
      data.nome != null ? String(data.nome) : '',
      Number.isFinite(valor) ? valor : 0,
      data.tipo != null ? String(data.tipo) : '',
      data.ativo === true || data.ativo === 'true',
      data.tributado === true || data.tributado === 'true',
      ncm,
      data.dataCriacao != null ? String(data.dataCriacao) : undefined,
      data.dataAtualizacao != null ? String(data.dataAtualizacao) : undefined,
      data.dataExclusao != null && data.dataExclusao !== undefined ? String(data.dataExclusao) : null
    )
  }

  getId(): string {
    return this.id
  }

  getEmpresaId(): string {
    return this.empresaId
  }

  getNome(): string {
    return this.nome
  }

  getValor(): number {
    return this.valor
  }

  getTipo(): string {
    return this.tipo
  }

  isAtivo(): boolean {
    return this.ativo
  }

  isTributado(): boolean {
    return this.tributado
  }

  getNcm(): string | null {
    return this.ncm
  }

  getDataCriacao(): string | undefined {
    return this.dataCriacao
  }

  getDataAtualizacao(): string | undefined {
    return this.dataAtualizacao
  }

  getDataExclusao(): string | null | undefined {
    return this.dataExclusao
  }

  toJSON() {
    return {
      id: this.id,
      empresaId: this.empresaId,
      nome: this.nome,
      valor: this.valor,
      tipo: this.tipo,
      ativo: this.ativo,
      tributado: this.tributado,
      ncm: this.ncm,
      dataCriacao: this.dataCriacao,
      dataAtualizacao: this.dataAtualizacao,
      dataExclusao: this.dataExclusao,
    }
  }
}
