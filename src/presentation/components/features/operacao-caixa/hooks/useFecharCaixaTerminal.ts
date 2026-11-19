'use client'

import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import type { FecharCaixaTerminalInput } from '@/src/application/dto/caixa-terminal/FecharCaixaTerminalDTO'
import type { FecharCaixaTerminalResult } from '@/src/application/dto/caixa-terminal/FecharCaixaTerminalDTO'
import { OperacaoCaixaTerminalApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaTerminalApiRepository'
import { FecharCaixaTerminalUseCase } from '@/src/application/use-cases/caixa-terminal/FecharCaixaTerminalUseCase'

export type { FecharCaixaTerminalResult }

export function useFecharCaixaTerminal(terminalId: string | null) {
  return useSecureTenantMutation(
    async (_ctx, input: FecharCaixaTerminalInput) => {
      const id = terminalId?.trim()
      if (!id) throw new Error('Terminal da operação de caixa é obrigatório.')
      const gateway = new OperacaoCaixaTerminalApiRepository(_ctx.token)
      return new FecharCaixaTerminalUseCase(gateway).execute(id, input)
    }
  )
}
