import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaTerminal } from '@/src/infrastructure/api/caixaTerminalBff'

/** GET operação atual do terminal (404 = sem caixa aberto). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ terminalId: string }> }
) {
  const { terminalId } = await params
  if (!terminalId?.trim()) {
    return NextResponse.json({ error: 'terminalId é obrigatório' }, { status: 400 })
  }
  return proxyOperacaoCaixaTerminal(
    request,
    `/current/${encodeURIComponent(terminalId)}`
  )
}
