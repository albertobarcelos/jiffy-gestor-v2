'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import {
  aplicarAlteracaoProdutoNosDestinos,
  listarMenusDoProduto,
} from '@/src/application/use-cases/produtos/PropagarAlteracaoProdutoUseCase'
import { PropagarAlteracaoProdutoDialog } from '@/src/presentation/components/features/produtos/PropagarAlteracaoProdutoDialog'
import type {
  DestinoAlteracaoProduto,
  MenuAlvoPropagacao,
  OrigemAlteracaoProduto,
  SnapshotProdutoPropagavel,
} from '@/src/shared/types/propagarAlteracaoProduto'

type Pedido = {
  origem: OrigemAlteracaoProduto
  produtoId: string
  menuIdAtual?: string
  menusIniciais?: MenuAlvoPropagacao[]
  resolve: (value: DestinoAlteracaoProduto | null) => void
}

/**
 * Pergunta se a alteração deve ir para outros destinos.
 * Gravação extra usa só GET/PATCH já existentes (produto e snapshot do menu).
 * `null` = cancelou. Destinos vazios = salvar só no local.
 */
export function usePropagarAlteracaoProduto(): {
  pedirConfirmacao: (opts: {
    origem: OrigemAlteracaoProduto
    produtoId: string
    menuIdAtual?: string
    menusIniciais?: MenuAlvoPropagacao[]
  }) => Promise<DestinoAlteracaoProduto | null>
  aplicarNosDestinos: (params: {
    produtoId: string
    snapshot: SnapshotProdutoPropagavel
    destinos: DestinoAlteracaoProduto
  }) => Promise<void>
  dialog: ReactNode
} {
  const invalidate = useInvalidateTenantQueries()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [passo, setPasso] = useState<'perguntar' | 'escolher'>('perguntar')
  const [menus, setMenus] = useState<MenuAlvoPropagacao[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [cadastroBaseMarcado, setCadastroBaseMarcado] = useState(false)
  const [busy, setBusy] = useState(false)
  const pedidoRef = useRef<Pedido | null>(null)

  const fechar = useCallback((resultado: DestinoAlteracaoProduto | null) => {
    pedidoRef.current?.resolve(resultado)
    pedidoRef.current = null
    setPedido(null)
    setPasso('perguntar')
    setMenus([])
    setSelecionados(new Set())
    setCadastroBaseMarcado(false)
    setBusy(false)
  }, [])

  const pedirConfirmacao = useCallback(
    async (opts: {
      origem: OrigemAlteracaoProduto
      produtoId: string
      menuIdAtual?: string
      menusIniciais?: MenuAlvoPropagacao[]
    }): Promise<DestinoAlteracaoProduto | null> => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      let lista = opts.menusIniciais ?? []
      if (lista.length === 0 && token) {
        try {
          lista = await listarMenusDoProduto({ produtoId: opts.produtoId, token })
        } catch {
          lista = []
        }
      }
      if (opts.menuIdAtual) {
        lista = lista.filter(m => m.id !== opts.menuIdAtual)
      }

      if (opts.origem === 'cadastroBase' && lista.length === 0) {
        return { aplicarNoCadastroBase: false, menuIds: [] }
      }

      return new Promise(resolve => {
        const next: Pedido = { ...opts, resolve }
        pedidoRef.current = next
        setPedido(next)
        setMenus(lista)
        setPasso('perguntar')
        setSelecionados(new Set())
        setCadastroBaseMarcado(false)
      })
    },
    []
  )

  const aplicarNosDestinos = useCallback(
    async (params: {
      produtoId: string
      snapshot: SnapshotProdutoPropagavel
      destinos: DestinoAlteracaoProduto
    }) => {
      if (!params.destinos.aplicarNoCadastroBase && params.destinos.menuIds.length === 0) {
        return
      }
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado')
      await aplicarAlteracaoProdutoNosDestinos({
        produtoId: params.produtoId,
        token,
        snapshot: params.snapshot,
        aplicarNoCadastroBase: params.destinos.aplicarNoCadastroBase,
        menuIds: params.destinos.menuIds,
      })
      await invalidate(['menu-produtos'])
      await invalidate(['menu-grupos'])
      await invalidate(['produtos'])
      await invalidate(['produto', params.produtoId])
    },
    [invalidate]
  )

  const onSim = useCallback(() => {
    if (pedido?.origem === 'menu' && menus.length === 0) {
      setCadastroBaseMarcado(true)
    }
    setPasso('escolher')
  }, [pedido?.origem, menus.length])

  const dialog = (
    <PropagarAlteracaoProdutoDialog
      open={Boolean(pedido)}
      passo={passo}
      origem={pedido?.origem ?? 'cadastroBase'}
      incluirCadastroBase={pedido?.origem === 'menu'}
      menus={menus}
      selecionados={selecionados}
      cadastroBaseMarcado={cadastroBaseMarcado}
      busy={busy}
      onNao={() => fechar({ aplicarNoCadastroBase: false, menuIds: [] })}
      onSim={onSim}
      onVoltar={() => setPasso('perguntar')}
      onConfirmarEscolha={() =>
        fechar({
          aplicarNoCadastroBase: cadastroBaseMarcado,
          menuIds: Array.from(selecionados),
        })
      }
      onToggleMenu={(id, checked) => {
        setSelecionados(prev => {
          const next = new Set(prev)
          if (checked) next.add(id)
          else next.delete(id)
          return next
        })
      }}
      onToggleCadastroBase={setCadastroBaseMarcado}
      onDismiss={() => fechar(null)}
    />
  )

  return { pedirConfirmacao, aplicarNosDestinos, dialog }
}
