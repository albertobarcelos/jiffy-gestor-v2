import type {
  DadosCadastroComplemento,
  ICadastroComplemento,
} from '@/src/application/ports/ICadastroComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'

function exigirToken(token: string): string {
  const valor = token.trim()
  if (!valor) {
    throw new Error('Token não encontrado. Faça login novamente.')
  }
  return valor
}

function exigirId(id: string): string {
  const valor = id.trim()
  if (!valor) {
    throw new Error('ID do complemento é obrigatório')
  }
  return valor
}

function hidratar(payload: unknown): Complemento {
  const complemento = Complemento.fromJSON(payload)
  if (!complemento.getId()) {
    throw new Error('Complemento sem identificador')
  }
  return complemento
}

export class PersistirCadastroComplementoUseCase {
  constructor(private readonly porta: ICadastroComplemento) {}

  async buscar(params: { id: string; token: string }): Promise<Complemento> {
    const payload = await this.porta.buscar(exigirId(params.id), exigirToken(params.token))
    return hidratar(payload)
  }

  async criar(params: {
    token: string
    dados: DadosCadastroComplemento
  }): Promise<Complemento> {
    const payload = await this.porta.criar(params.dados, exigirToken(params.token))
    return hidratar(payload)
  }

  async atualizar(params: {
    token: string
    id: string
    dados: DadosCadastroComplemento
  }): Promise<Complemento> {
    const payload = await this.porta.atualizar(
      exigirId(params.id),
      params.dados,
      exigirToken(params.token)
    )
    return hidratar(payload)
  }
}
