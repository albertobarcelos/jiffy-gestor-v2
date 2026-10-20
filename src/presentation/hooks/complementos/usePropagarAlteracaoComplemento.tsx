'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import type { VinculoComplementoOverride } from '@/src/domain/repositories/IComplementoOverrideRepository'
import {
  chaveUsoComplemento,
  montarVinculosPropagacao,
  type AlteracaoComplementoPropagavel,
  type OrigemUsoComplemento,
} from '@/src/domain/policies/complemento/propagarAlteracaoComplemento'
import { PropagarAlteracaoComplementoDialog } from '@/src/presentation/components/features/complementos/PropagarAlteracaoComplementoDialog'
import { criarPropagarAlteracaoComplementoUseCase } from '@/src/presentation/hooks/complementos/criarPropagarAlteracaoComplementoUseCase'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

export type DecisaoPropagacaoComplemento =
  | { tipo: 'cancelado' }
  | { tipo: 'so-origem' }
  | { tipo: 'aplicar'; vinculos: VinculoComplementoOverride[] }

type Pedido = {
  complementoId: string
  alteracao: AlteracaoComplementoPropagavel
  usos: ComplementoUsoNoMenu[]
  resolve: (decisao: DecisaoPropagacaoComplemento) => void
}

type Passo = 'perguntar' | 'escolher'

/**
 * Pergunta se valor ou ativo do complemento vão para outros usos.
 * `cancelado` não grava. `so-origem` grava só o local. `aplicar` traz os vínculos marcados.
 */
export function usePropagarAlteracaoComplemento(): {
  pedirConfirmacao: (opts: {
    complementoId: string
    origem?: OrigemUsoComplemento
    alteracao: AlteracaoComplementoPropagavel
  }) => Promise<DecisaoPropagacaoComplemento>
  aplicarVinculos: (vinculos: VinculoComplementoOverride[]) => Promise<void>
  aberto: boolean
  dialog: ReactNode
} {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [passo, setPasso] = useState<Passo>('perguntar')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const pedidoRef = useRef<Pedido | null>(null)

  const fechar = useCallback((decisao: DecisaoPropagacaoComplemento) => {
    pedidoRef.current?.resolve(decisao)
    pedidoRef.current = null
    setPedido(null)
    setPasso('perguntar')
    setSelecionados(new Set())
  }, [])

  const pedirConfirmacao = useCallback(
    async (opts: {
      complementoId: string
      origem?: OrigemUsoComplemento
      alteracao: AlteracaoComplementoPropagavel
    }): Promise<DecisaoPropagacaoComplemento> => {
      if (pedidoRef.current) return { tipo: 'so-origem' }

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Não foi possível listar os cardápios. A alteração fica só neste local.')
        return { tipo: 'so-origem' }
      }

      let usos: ComplementoUsoNoMenu[] = []
      try {
        usos = await criarPropagarAlteracaoComplementoUseCase().listarUsosParaPropagar({
          complementoId: opts.complementoId,
          token,
          origem: opts.origem,
        })
      } catch {
        showToast.error('Não foi possível listar os cardápios. A alteração fica só neste local.')
        return { tipo: 'so-origem' }
      }

      if (usos.length === 0) return { tipo: 'so-origem' }

      return new Promise(resolve => {
        const next: Pedido = {
          complementoId: opts.complementoId,
          alteracao: opts.alteracao,
          usos,
          resolve,
        }
        pedidoRef.current = next
        setPedido(next)
        setPasso('perguntar')
        setSelecionados(new Set())
      })
    },
    []
  )

  const aplicarVinculos = useCallback(async (vinculos: VinculoComplementoOverride[]) => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      throw new Error('Token não encontrado. Faça login novamente.')
    }
    await criarPropagarAlteracaoComplementoUseCase().aplicarVinculos({ token, vinculos })
  }, [])

  const confirmarEscolha = useCallback(() => {
    const atual = pedidoRef.current
    if (!atual) return
    const escolhidos = atual.usos.filter(uso => selecionados.has(chaveUsoComplemento(uso)))
    if (escolhidos.length === 0) {
      fechar({ tipo: 'so-origem' })
      return
    }
    fechar({
      tipo: 'aplicar',
      vinculos: montarVinculosPropagacao({
        complementoId: atual.complementoId,
        usos: escolhidos,
        alteracao: atual.alteracao,
      }),
    })
  }, [fechar, selecionados])

  const dialog = (
    <PropagarAlteracaoComplementoDialog
      open={pedido !== null}
      passo={passo}
      alteracao={pedido?.alteracao ?? null}
      usos={pedido?.usos ?? []}
      selecionados={selecionados}
      onNao={() => fechar({ tipo: 'so-origem' })}
      onSim={() => setPasso('escolher')}
      onVoltar={() => setPasso('perguntar')}
      onConfirmarEscolha={confirmarEscolha}
      onToggleUso={(chave, marcado) => {
        setSelecionados(prev => {
          const next = new Set(prev)
          if (marcado) next.add(chave)
          else next.delete(chave)
          return next
        })
      }}
      onToggleTodos={marcado => {
        const atual = pedidoRef.current
        if (!atual) return
        setSelecionados(
          marcado ? new Set(atual.usos.map(uso => chaveUsoComplemento(uso))) : new Set()
        )
      }}
      onDismiss={() => fechar({ tipo: 'cancelado' })}
    />
  )

  return { pedirConfirmacao, aplicarVinculos, aberto: pedido !== null, dialog }
}
