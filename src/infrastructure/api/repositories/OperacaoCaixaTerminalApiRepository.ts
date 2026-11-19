import type {
  FecharCaixaTerminalInput,
  FecharCaixaTerminalResult,
} from '@/src/application/dto/caixa-terminal/FecharCaixaTerminalDTO'
import type { MovimentacaoCaixaTerminalInput } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'
import type {
  CaixaTerminalAtualGatewayResponse,
  IOperacaoCaixaTerminalGateway,
} from '@/src/application/ports/IOperacaoCaixaTerminalGateway'
import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import {
  pathCaixaTerminalAtual,
  pathFechamentoCaixaTerminal,
  pathMovimentacaoCaixaTerminal,
} from '@/src/infrastructure/api/caixaTerminalBff'

/**
 * Implementação HTTP via BFF Next.js (`/api/caixa/operacao-caixa-terminal/*`).
 */
export class OperacaoCaixaTerminalApiRepository implements IOperacaoCaixaTerminalGateway {
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

  async buscarAtual(
    terminalId: string,
    tipoRetorno: 'resumido' | 'detalhado' = 'detalhado'
  ): Promise<CaixaTerminalAtualGatewayResponse> {
    return this.requestJson(pathCaixaTerminalAtual(terminalId.trim(), tipoRetorno))
  }

  async buscarPorId(
    operacaoCaixaId: string,
    tipoRetorno: 'resumido' | 'detalhado' = 'detalhado'
  ): Promise<unknown> {
    const { status, body } = await this.requestJson(
      `/api/caixa/operacao-caixa-terminal/${encodeURIComponent(operacaoCaixaId.trim())}?tipoRetorno=${tipoRetorno}`
    )
    if (status === 404) throw new Error('Operação de caixa não encontrada.')
    return body
  }

  async fechar(
    terminalId: string,
    input: FecharCaixaTerminalInput
  ): Promise<FecharCaixaTerminalResult> {
    const { body } = await this.requestJson(pathFechamentoCaixaTerminal(terminalId.trim()), {
      method: 'POST',
      body: input,
    })
    return (body ?? {}) as FecharCaixaTerminalResult
  }

  async registrarSuprimento(
    terminalId: string,
    input: MovimentacaoCaixaTerminalInput
  ): Promise<unknown> {
    const { body } = await this.requestJson(
      pathMovimentacaoCaixaTerminal(terminalId.trim(), 'suprimentos'),
      { method: 'POST', body: input }
    )
    return body
  }

  async registrarSangria(
    terminalId: string,
    input: MovimentacaoCaixaTerminalInput
  ): Promise<unknown> {
    const { body } = await this.requestJson(
      pathMovimentacaoCaixaTerminal(terminalId.trim(), 'sangrias'),
      { method: 'POST', body: input }
    )
    return body
  }

  async listarMovimentacoes(
    terminalId: string,
    tipo: 'sangrias' | 'suprimentos'
  ): Promise<unknown> {
    const { body } = await this.requestJson(
      pathMovimentacaoCaixaTerminal(terminalId.trim(), tipo)
    )
    return body
  }
}
