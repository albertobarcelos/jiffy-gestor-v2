import type {
  DadosCadastroComplemento,
  ICadastroComplemento,
} from '@/src/application/ports/ICadastroComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'

const LIMITE_MAX = 2000

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

function limiteLista(valor: number | undefined, padrao: number): number {
  const n = typeof valor === 'number' && Number.isFinite(valor) ? Math.trunc(valor) : padrao
  return Math.min(Math.max(n, 1), LIMITE_MAX)
}

function offsetLista(valor: number | undefined): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) return 0
  return Math.trunc(valor)
}

export class PersistirCadastroComplementoUseCase {
  constructor(private readonly porta: ICadastroComplemento) {}

  async listar(params: {
    token: string
    q?: string
    ativo?: boolean | null
    limit?: number
    offset?: number
  }): Promise<{ complementos: Complemento[]; total: number }> {
    const token = exigirToken(params.token)
    const lista = await this.porta.listar(
      {
        q: params.q?.trim() || undefined,
        ativo: params.ativo,
        limit: limiteLista(params.limit, 10),
        offset: offsetLista(params.offset),
      },
      token
    )
    const items = Array.isArray(lista.items) ? lista.items : []
    return {
      complementos: items.flatMap(item => {
        try {
          const complemento = Complemento.fromJSON(item)
          return complemento.getId() ? [complemento] : []
        } catch {
          return []
        }
      }),
      total: typeof lista.count === 'number' && Number.isFinite(lista.count) ? lista.count : items.length,
    }
  }

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
