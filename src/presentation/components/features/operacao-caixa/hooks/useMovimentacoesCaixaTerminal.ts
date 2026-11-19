'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { MovimentacaoCaixaTerminalInput } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'
import type { MovimentacaoCaixaTerminalDTO } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'
import { OperacaoCaixaTerminalApiRepository } from '@/src/infrastructure/api/repositories/OperacaoCaixaTerminalApiRepository'
import {
  RegistrarSangriaCaixaTerminalUseCase,
  RegistrarSuprimentoCaixaTerminalUseCase,
} from '@/src/application/use-cases/caixa-terminal/RegistrarMovimentacaoCaixaTerminalUseCase'

function mapMovimentacoes(body: unknown): MovimentacaoCaixaTerminalDTO[] {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : []

  return list
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const raw = item as Record<string, unknown>
      const id = String(raw.id ?? '').trim()
      if (!id) return null
      return {
        id,
        valor: Number(raw.valor ?? 0),
        descricao: raw.descricao == null ? null : String(raw.descricao),
        operacaoCaixaId: raw.operacaoCaixaId ? String(raw.operacaoCaixaId) : undefined,
        realizadoPorId: raw.realizadoPorId ? String(raw.realizadoPorId) : undefined,
        nomeResponsavel:
          raw.nomeResponsavel == null
            ? (raw as { realizadoPor?: { nome?: string } }).realizadoPor?.nome ?? null
            : String(raw.nomeResponsavel),
        dataCriacao: String(raw.dataCriacao ?? ''),
      } satisfies MovimentacaoCaixaTerminalDTO
    })
    .filter((item): item is MovimentacaoCaixaTerminalDTO => item != null)
}

export function useHistoricoMovimentacoesCaixaTerminal(
  terminalId: string | null,
  tipo: 'sangrias' | 'suprimentos',
  enabled = true
) {
  return useSecureTenantQuery(
    ['caixa-terminal', 'movimentacoes', terminalId, tipo],
    async ({ token }) => {
      const id = terminalId?.trim()
      if (!id) return []
      const gateway = new OperacaoCaixaTerminalApiRepository(token)
      return mapMovimentacoes(await gateway.listarMovimentacoes(id, tipo))
    },
    { enabled: enabled && Boolean(terminalId?.trim()), retry: false }
  )
}

export function useRegistrarSuprimentoCaixaTerminal(terminalId: string | null) {
  const queryClient = useQueryClient()
  return useSecureTenantMutation(
    async ({ token, empresaId }, input: MovimentacaoCaixaTerminalInput) => {
      const id = terminalId?.trim()
      if (!id) throw new Error('Terminal da operação de caixa é obrigatório.')
      const gateway = new OperacaoCaixaTerminalApiRepository(token)
      const result = await new RegistrarSuprimentoCaixaTerminalUseCase(gateway).execute(id, input)
      await queryClient.invalidateQueries({
        queryKey: ['tenant', empresaId, 'caixa-terminal', 'movimentacoes', id],
      })
      return result
    }
  )
}

export function useRegistrarSangriaCaixaTerminal(terminalId: string | null) {
  const queryClient = useQueryClient()
  return useSecureTenantMutation(
    async (
      { token, empresaId },
      input: MovimentacaoCaixaTerminalInput & { saldoDisponivel: number }
    ) => {
      const id = terminalId?.trim()
      if (!id) throw new Error('Terminal da operação de caixa é obrigatório.')
      const gateway = new OperacaoCaixaTerminalApiRepository(token)
      const result = await new RegistrarSangriaCaixaTerminalUseCase(gateway).execute(id, input)
      await queryClient.invalidateQueries({
        queryKey: ['tenant', empresaId, 'caixa-terminal', 'movimentacoes', id],
      })
      return result
    }
  )
}
