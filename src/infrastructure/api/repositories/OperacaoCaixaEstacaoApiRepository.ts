import type {
  FecharCaixaEstacaoInput,
  ListarOperacoesCaixaEstacaoInput,
  MovimentacaoCaixaEstacaoInput,
} from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import type {
  CaixaEstacaoAtualGatewayResponse,
  FecharCaixaEstacaoGatewayResult,
  IOperacaoCaixaEstacaoGateway,
} from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'
import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import {
  pathCaixaEstacaoAtual,
  pathFechamentoCaixaEstacao,
  pathMovimentacaoCaixaEstacao,
  pathOperacaoCaixaEstacao,
} from '@/src/infrastructure/api/caixaEstacaoBff'

/**
 * Implementação HTTP via BFF Next.js (`/api/caixa/operacao-caixa-estacao/*`).
 */
export class OperacaoCaixaEstacaoApiRepository implements IOperacaoCaixaEstacaoGateway {
  constructor(private readonly token: string) {}

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      ...extra,
    }
  }

  private async requestJson(
    path: string,
    init?: { method?: string; body?: unknown }
  ): Promise<{ status: number; body: unknown }> {
    const response = await fetchGestorApi(path, {
      method: init?.method ?? 'GET',
      headers: this.authHeaders(
        init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined
      ),
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok && response.status !== 404) {
      throw new Error(textoErroCorpoApi(body) || `Erro ${response.status}`)
    }
    return { status: response.status, body }
  }

  async buscarAtual(estacaoGestorId: string): Promise<CaixaEstacaoAtualGatewayResponse> {
    return this.requestJson(pathCaixaEstacaoAtual(estacaoGestorId.trim()))
  }

  async buscarPorId(operacaoCaixaId: string): Promise<unknown> {
    const { status, body } = await this.requestJson(pathOperacaoCaixaEstacao(operacaoCaixaId.trim()))
    if (status === 404) {
      throw new Error('Operação de caixa não encontrada.')
    }
    return body
  }

  async registrarSuprimento(
    estacaoGestorId: string,
    input: MovimentacaoCaixaEstacaoInput
  ): Promise<unknown> {
    const { body } = await this.requestJson(
      pathMovimentacaoCaixaEstacao(estacaoGestorId.trim(), 'suprimentos'),
      { method: 'POST', body: input }
    )
    return body
  }

  async registrarSangria(
    estacaoGestorId: string,
    input: MovimentacaoCaixaEstacaoInput
  ): Promise<unknown> {
    const { body } = await this.requestJson(
      pathMovimentacaoCaixaEstacao(estacaoGestorId.trim(), 'sangrias'),
      { method: 'POST', body: input }
    )
    return body
  }

  async fechar(
    estacaoGestorId: string,
    input: FecharCaixaEstacaoInput
  ): Promise<FecharCaixaEstacaoGatewayResult> {
    const { body } = await this.requestJson(pathFechamentoCaixaEstacao(estacaoGestorId.trim()), {
      method: 'POST',
      body: input,
    })
    return (body ?? {}) as FecharCaixaEstacaoGatewayResult
  }

  async listarOperacoes(input: ListarOperacoesCaixaEstacaoInput): Promise<unknown> {
    const params = new URLSearchParams()
    if (input.limit != null) params.set('limit', String(input.limit))
    if (input.offset != null) params.set('offset', String(input.offset))
    if (input.q) params.set('q', input.q)
    if (input.dataAberturaInicio) params.set('dataAberturaInicio', input.dataAberturaInicio)
    if (input.dataAberturaFim) params.set('dataAberturaFim', input.dataAberturaFim)
    if (input.estacaoGestorId) params.set('estacaoGestorId', input.estacaoGestorId)
    if (input.status) params.set('status', input.status)
    const qs = params.toString()
    const { body } = await this.requestJson(
      `/api/caixa/operacao-caixa-estacao${qs ? `?${qs}` : ''}`
    )
    return body
  }

  async listarMovimentacoes(
    estacaoGestorId: string,
    tipo: 'sangrias' | 'suprimentos'
  ): Promise<unknown> {
    const { body } = await this.requestJson(
      pathMovimentacaoCaixaEstacao(estacaoGestorId.trim(), tipo)
    )
    return body
  }
}
