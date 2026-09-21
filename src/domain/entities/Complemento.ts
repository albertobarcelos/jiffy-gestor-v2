import { parseImagemUrlProdutoIndex } from '@/src/shared/utils/catalogoProdutoIndex'

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/**
 * Entidade de domínio representando um Complemento
 */
export class Complemento {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly descricao?: string,
    private readonly valor: number = 0,
    private readonly ativo: boolean = true,
    private readonly tipoImpactoPreco?: string,
    private readonly ordem?: number,
    private readonly imagemUrl?: string | null
  ) {}

  static create(
    id: string,
    nome: string,
    descricao?: string,
    valor: number = 0,
    ativo: boolean = true,
    tipoImpactoPreco?: string,
    ordem?: number,
    imagemUrl?: string | null
  ): Complemento {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Complemento(
      id,
      nome,
      descricao,
      valor,
      ativo,
      tipoImpactoPreco,
      ordem,
      imagemUrl
    )
  }

  static parseAtivo(value: unknown): boolean {
    if (value === null || value === undefined) return true
    if (value === true || value === 'true' || value === 1 || value === '1') return true
    if (value === false || value === 'false' || value === 0 || value === '0') return false
    return true
  }

  static fromJSON(data: any): Complemento {
    const rec = asPlainRecord(data)
    const nested = asPlainRecord(rec.data)
    const payload = nested.id != null || nested.nome != null ? nested : rec
    const raw = payload as {
      id?: unknown
      nome?: unknown
      descricao?: unknown
      valor?: unknown
      ativo?: unknown
      tipoImpactoPreco?: unknown
      ordem?: unknown
    }
    return Complemento.create(
      raw.id != null ? String(raw.id) : '',
      raw.nome != null ? String(raw.nome) : '',
      raw.descricao != null ? String(raw.descricao) : undefined,
      typeof raw.valor === 'number' ? raw.valor : parseFloat(String(raw.valor ?? '')) || 0,
      Complemento.parseAtivo(raw.ativo),
      raw.tipoImpactoPreco != null ? String(raw.tipoImpactoPreco) : undefined,
      raw.ordem != null ? parseInt(String(raw.ordem), 10) : undefined,
      parseImagemUrlProdutoIndex(payload)
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getDescricao(): string | undefined {
    return this.descricao
  }

  getValor(): number {
    return this.valor
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getTipoImpactoPreco(): string | undefined {
    return this.tipoImpactoPreco
  }

  getOrdem(): number | undefined {
    return this.ordem
  }

  getImagemUrl(): string | null | undefined {
    return this.imagemUrl
  }

  /** Cópia imutável com a URL persistida da foto — mesma identidade de negócio. */
  withImagemUrl(imagemUrl: string | null): Complemento {
    const next = imagemUrl?.trim() || null
    const current = this.imagemUrl?.trim() || null
    if (next === current) return this
    return new Complemento(
      this.id,
      this.nome,
      this.descricao,
      this.valor,
      this.ativo,
      this.tipoImpactoPreco,
      this.ordem,
      next
    )
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      valor: this.valor,
      ativo: this.ativo,
      tipoImpactoPreco: this.tipoImpactoPreco,
      ordem: this.ordem,
      imagemUrl: this.imagemUrl ?? null,
    }
  }
}

