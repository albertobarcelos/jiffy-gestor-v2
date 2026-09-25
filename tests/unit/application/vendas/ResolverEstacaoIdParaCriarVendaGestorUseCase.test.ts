import { describe, expect, it, vi } from 'vitest'
import { ResolverEstacaoIdParaCriarVendaGestorUseCase } from '@/src/application/use-cases/vendas/ResolverEstacaoIdParaCriarVendaGestorUseCase'
import {
  MSG_ESTACAO_FALHA_VALIDACAO_CRIAR_PEDIDO,
  MSG_ESTACAO_OBRIGATORIA_CRIAR_PEDIDO,
} from '@/src/domain/policies/pedido/estacaoCriarVendaGestor'
import type { IEstacaoParaCriarVendaPort } from '@/src/domain/repositories/IEstacaoParaCriarVendaPort'

describe('ResolverEstacaoIdParaCriarVendaGestorUseCase', () => {
  it('retorna estacaoId quando a porta resolve', async () => {
    const port: IEstacaoParaCriarVendaPort = {
      resolverEstacaoId: vi.fn(async () => '  est-1  '),
    }
    const useCase = new ResolverEstacaoIdParaCriarVendaGestorUseCase(port)

    await expect(useCase.execute('token')).resolves.toEqual({
      ok: true,
      estacaoId: 'est-1',
    })
  })

  it('retorna AUSENTE quando não há estação neste PC', async () => {
    const port: IEstacaoParaCriarVendaPort = {
      resolverEstacaoId: vi.fn(async () => null),
    }
    const useCase = new ResolverEstacaoIdParaCriarVendaGestorUseCase(port)

    await expect(useCase.execute('token')).resolves.toEqual({
      ok: false,
      codigo: 'AUSENTE',
      mensagem: MSG_ESTACAO_OBRIGATORIA_CRIAR_PEDIDO,
    })
  })

  it('retorna FALHA_VALIDACAO quando a porta lança', async () => {
    const port: IEstacaoParaCriarVendaPort = {
      resolverEstacaoId: vi.fn(async () => {
        throw new Error('rede')
      }),
    }
    const useCase = new ResolverEstacaoIdParaCriarVendaGestorUseCase(port)

    await expect(useCase.execute('token')).resolves.toEqual({
      ok: false,
      codigo: 'FALHA_VALIDACAO',
      mensagem: MSG_ESTACAO_FALHA_VALIDACAO_CRIAR_PEDIDO,
    })
  })
})
