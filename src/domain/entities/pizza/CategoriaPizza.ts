import type {
  CategoriaPizza as CategoriaPizzaRecord,
  RegraPrecoMultiplosSabores,
} from '@/src/shared/types/pizza'

export class CategoriaPizza {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly ordem: number,
    private readonly corHex: string,
    private readonly iconName: string,
    private readonly regraPrecoMultiplosSabores: RegraPrecoMultiplosSabores,
    private readonly ativoDelivery: boolean,
    private readonly ativoLocal: boolean,
    private readonly ativo: boolean,
    private readonly permiteDesconto: boolean,
    private readonly permiteAcrescimo: boolean,
    private readonly imagemUrl: string | null,
    private readonly dataCriacao: string,
    private readonly dataAtualizacao: string
  ) {}

  static create(input: CategoriaPizzaRecord): CategoriaPizza {
    if (!input.id || !input.nome?.trim()) {
      throw new Error('ID e nome da categoria pizza sao obrigatorios')
    }

    return new CategoriaPizza(
      input.id,
      input.nome,
      input.ordem,
      input.corHex,
      input.iconName,
      input.regraPrecoMultiplosSabores,
      input.ativoDelivery,
      input.ativoLocal,
      input.ativo,
      input.permiteDesconto ?? true,
      input.permiteAcrescimo ?? true,
      input.imagemUrl ?? null,
      input.dataCriacao,
      input.dataAtualizacao
    )
  }

  static fromDatabase(input: CategoriaPizzaRecord): CategoriaPizza {
    return CategoriaPizza.create(input)
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getOrdem(): number {
    return this.ordem
  }

  getCorHex(): string {
    return this.corHex
  }

  getIconName(): string {
    return this.iconName
  }

  getRegraPrecoMultiplosSabores(): RegraPrecoMultiplosSabores {
    return this.regraPrecoMultiplosSabores
  }

  isAtivoDelivery(): boolean {
    return this.ativoDelivery
  }

  isAtivoLocal(): boolean {
    return this.ativoLocal
  }

  isAtivo(): boolean {
    return this.ativo
  }

  permiteDescontoAtivo(): boolean {
    return this.permiteDesconto
  }

  permiteAcrescimoAtivo(): boolean {
    return this.permiteAcrescimo
  }

  getImagemUrl(): string | null {
    return this.imagemUrl
  }

  getDataCriacao(): string {
    return this.dataCriacao
  }

  getDataAtualizacao(): string {
    return this.dataAtualizacao
  }

  toJSON(): CategoriaPizzaRecord {
    return {
      id: this.id,
      nome: this.nome,
      ordem: this.ordem,
      corHex: this.corHex,
      iconName: this.iconName,
      regraPrecoMultiplosSabores: this.regraPrecoMultiplosSabores,
      ativoDelivery: this.ativoDelivery,
      ativoLocal: this.ativoLocal,
      ativo: this.ativo,
      permiteDesconto: this.permiteDesconto,
      permiteAcrescimo: this.permiteAcrescimo,
      imagemUrl: this.imagemUrl,
      dataCriacao: this.dataCriacao,
      dataAtualizacao: this.dataAtualizacao,
    }
  }
}
