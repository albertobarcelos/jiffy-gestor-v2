import type {
  PrecoSaborTamanho,
  SaborPizza as SaborPizzaRecord,
  SaborPizzaSummary,
} from '@/src/shared/types/pizza'

export class SaborPizza {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly descricao: string | null,
    private readonly imagemUrl: string | null,
    private readonly ativo: boolean,
    private readonly ordem: number,
    private readonly categoriaPizzaId: string,
    private readonly dataCriacao: string,
    private readonly dataAtualizacao: string,
    private readonly precosTamanho: PrecoSaborTamanho[]
  ) {}

  static create(input: SaborPizzaRecord): SaborPizza {
    if (!input.id || !input.nome?.trim()) {
      throw new Error('ID e nome do sabor pizza sao obrigatorios')
    }
    if (!input.categoriaPizzaId) {
      throw new Error('Categoria do sabor pizza e obrigatoria')
    }

    return new SaborPizza(
      input.id,
      input.nome,
      input.descricao ?? null,
      input.imagemUrl ?? null,
      input.ativo,
      input.ordem,
      input.categoriaPizzaId,
      input.dataCriacao,
      input.dataAtualizacao,
      input.precosTamanho ?? []
    )
  }

  static fromDatabase(input: SaborPizzaRecord): SaborPizza {
    return SaborPizza.create(input)
  }

  static fromSummary(input: SaborPizzaSummary): SaborPizza {
    return SaborPizza.create({ ...input, precosTamanho: [] })
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getDescricao(): string | null {
    return this.descricao
  }

  getImagemUrl(): string | null {
    return this.imagemUrl
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getOrdem(): number {
    return this.ordem
  }

  getCategoriaPizzaId(): string {
    return this.categoriaPizzaId
  }

  getPrecosTamanho(): PrecoSaborTamanho[] {
    return this.precosTamanho
  }

  getDataCriacao(): string {
    return this.dataCriacao
  }

  getDataAtualizacao(): string {
    return this.dataAtualizacao
  }

  toJSON(): SaborPizzaRecord {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      imagemUrl: this.imagemUrl,
      ativo: this.ativo,
      ordem: this.ordem,
      categoriaPizzaId: this.categoriaPizzaId,
      dataCriacao: this.dataCriacao,
      dataAtualizacao: this.dataAtualizacao,
      precosTamanho: this.precosTamanho,
    }
  }
}
