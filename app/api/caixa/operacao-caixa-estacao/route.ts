import { NextRequest } from 'next/server'
import { proxyOperacaoCaixaEstacao } from '@/src/infrastructure/api/caixaEstacaoBff'

/** GET /api/caixa/operacao-caixa-estacao — lista/histórico da estação. */
export async function GET(request: NextRequest) {
  return proxyOperacaoCaixaEstacao(request, '')
}
