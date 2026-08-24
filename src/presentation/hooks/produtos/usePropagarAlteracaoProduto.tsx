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
  VariantePropagacaoProduto,
} from '@/src/shared/types/propagarAlteracaoProduto'
import {
  aplicarImagemProdutoNosMenus,
  buscarMenusDaEmpresa,
} from '@/src/presentation/utils/uploadImagemProdutoMenus'

type Pedido = {
  origem: OrigemAlteracaoProduto
  variante: VariantePropagacaoProduto
  produtoId: string
  menuIdAtual?: string
  menusIniciais?: MenuAlvoPropagacao[]
  menusJaSalvos?: MenuAlvoPropagacao[]
  excluirMenuIds?: string[]
  fonteMenus?: 'produto' | 'empresa'
  novoAtivo?: boolean
  /** Fluxo da lista de produtos base (dados): lista de menus sem passo "perguntar". */
  fluxoListaCadastroBase?: boolean
  /** Confirmação global de ativo/inativo na lista base. */
  confirmacaoStatusGlobal?: boolean
  /** Se true, não permite confirmar com zero menus. */
  exigePeloMenosUmMenu?: boolean
  resolve: (value: DestinoAlteracaoProduto | null) => void
}

type PedirConfirmacaoOpts = {
  origem: OrigemAlteracaoProduto
  produtoId: string
  menuIdAtual?: string
  menusIniciais?: MenuAlvoPropagacao[]
  menusJaSalvos?: MenuAlvoPropagacao[]
  variante?: VariantePropagacaoProduto
  /** Obrigatório em `statusAtivo`: true = ativar, false = desativar. */
  novoAtivo?: boolean
  excluirMenuIds?: string[]
  fonteMenus?: 'produto' | 'empresa'
  /** Abre direto na lista de menus (ex.: imagem sem vínculo prévio). */
  passoInicial?: 'perguntar' | 'escolher'
  /** Impede confirmar sem pelo menos um menu marcado. */
  exigePeloMenosUmMenu?: boolean
}

/**
 * Pergunta se a alteração deve ir para outros destinos.
 * Gravação extra usa só GET/PATCH já existentes (produto e snapshot do menu).
 * `null` = cancelou. Destinos vazios = salvar só no local.
 */
export function usePropagarAlteracaoProduto(): {
  pedirConfirmacao: (opts: PedirConfirmacaoOpts) => Promise<DestinoAlteracaoProduto | null>
  aplicarNosDestinos: (params: {
    produtoId: string
    snapshot: SnapshotProdutoPropagavel
    destinos: DestinoAlteracaoProduto
  }) => Promise<void>
  aplicarImagemNosDestinos: (params: {
    produtoId: string
    file: File
    destinos: DestinoAlteracaoProduto
    vincularSeAusente?: boolean
  }) => Promise<void>
  dialog: ReactNode
} {
  const invalidate = useInvalidateTenantQueries()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [passo, setPasso] = useState<'perguntar' | 'escolher'>('perguntar')
  const [menus, setMenus] = useState<MenuAlvoPropagacao[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [menusJaVinculadosIds, setMenusJaVinculadosIds] = useState<Set<string>>(new Set())
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
    setMenusJaVinculadosIds(new Set())
    setCadastroBaseMarcado(false)
    setBusy(false)
  }, [])

  const abrirDialogo = useCallback(
    (params: {
      opts: PedirConfirmacaoOpts
      variante: VariantePropagacaoProduto
      lista: MenuAlvoPropagacao[]
      preSelecionados?: Set<string>
      menusJaVinculados?: Set<string>
      fluxoListaCadastroBase?: boolean
      confirmacaoStatusGlobal?: boolean
      exigePeloMenosUmMenu?: boolean
      passoInicial?: 'perguntar' | 'escolher'
    }): Promise<DestinoAlteracaoProduto | null> => {
      return new Promise(resolve => {
        const next: Pedido = {
          ...params.opts,
          variante: params.variante,
          fluxoListaCadastroBase: params.fluxoListaCadastroBase,
          confirmacaoStatusGlobal: params.confirmacaoStatusGlobal,
          exigePeloMenosUmMenu: params.exigePeloMenosUmMenu,
          resolve,
        }
        pedidoRef.current = next
        setPedido(next)
        setMenus(params.lista)
        setPasso(params.passoInicial ?? 'perguntar')
        setSelecionados(params.preSelecionados ?? new Set())
        setMenusJaVinculadosIds(params.menusJaVinculados ?? new Set())
        setCadastroBaseMarcado(false)
      })
    },
    []
  )

  const pedirConfirmacao = useCallback(
    async (opts: PedirConfirmacaoOpts): Promise<DestinoAlteracaoProduto | null> => {
      const variante = opts.variante ?? 'dados'
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      const excluir = new Set(
        [opts.menuIdAtual, ...(opts.excluirMenuIds ?? [])]
          .map(id => (typeof id === 'string' ? id.trim() : String(id ?? '').trim()))
          .filter(Boolean)
      )

      // --- Lista base: ativo/inativo → confirmação global (todos os menus vinculados) ---
      if (opts.origem === 'cadastroBase' && variante === 'statusAtivo' && token) {
        let menusDoProduto: MenuAlvoPropagacao[] = []
        try {
          menusDoProduto = await listarMenusDoProduto({
            produtoId: opts.produtoId,
            token,
          })
        } catch {
          menusDoProduto = []
        }
        const vinculadosIds = new Set(menusDoProduto.map(m => m.id).filter(Boolean))
        return abrirDialogo({
          opts,
          variante,
          lista: menusDoProduto,
          preSelecionados: vinculadosIds,
          menusJaVinculados: vinculadosIds,
          confirmacaoStatusGlobal: true,
          passoInicial: 'perguntar',
        })
      }

      // --- Fluxo lista de produtos base (alteração de dados): regras de vínculo/menus ---
      if (opts.origem === 'cadastroBase' && variante === 'dados' && token) {
        let todosMenus: MenuAlvoPropagacao[] = []
        let menusDoProduto: MenuAlvoPropagacao[] = []
        try {
          todosMenus = (await buscarMenusDaEmpresa({ token })).map(m => ({
            id: m.id,
            nome: m.nome,
          }))
          menusDoProduto = await listarMenusDoProduto({
            produtoId: opts.produtoId,
            token,
          })
        } catch {
          todosMenus = []
          menusDoProduto = []
        }

        const vinculadosIds = new Set(
          menusDoProduto.map(m => m.id).filter(Boolean)
        )
        const temVinculo = vinculadosIds.size > 0

        if (todosMenus.length === 0) {
          return { aplicarNoCadastroBase: false, menuIds: [] }
        }

        // 1 menu + produto já vinculado a ele → aplica direto, sem diálogo
        if (
          temVinculo &&
          todosMenus.length === 1 &&
          vinculadosIds.has(todosMenus[0].id)
        ) {
          return { aplicarNoCadastroBase: false, menuIds: [todosMenus[0].id] }
        }

        return abrirDialogo({
          opts,
          variante,
          lista: todosMenus,
          preSelecionados: new Set(vinculadosIds),
          menusJaVinculados: vinculadosIds,
          fluxoListaCadastroBase: true,
          exigePeloMenosUmMenu: temVinculo,
          passoInicial: 'escolher',
        })
      }

      let lista = opts.menusIniciais ?? []
      if (lista.length === 0 && token) {
        try {
          const precisaEmpresa =
            opts.fonteMenus === 'empresa' ||
            variante === 'vinculoMenus' ||
            (variante === 'imagem' && opts.origem === 'cadastroBase')

          if (precisaEmpresa) {
            lista = (await buscarMenusDaEmpresa({ token })).map(m => ({
              id: m.id,
              nome: m.nome,
            }))
          } else {
            lista = await listarMenusDoProduto({
              produtoId: opts.produtoId,
              token,
            })
            if (
              variante === 'imagem' &&
              lista.filter(m => !excluir.has(m.id)).length === 0
            ) {
              lista = (await buscarMenusDaEmpresa({ token })).map(m => ({
                id: m.id,
                nome: m.nome,
              }))
            }
          }
        } catch {
          lista = []
        }
      }
      lista = lista.filter(m => !excluir.has(m.id))

      if (opts.origem === 'cadastroBase' && lista.length === 0) {
        return { aplicarNoCadastroBase: false, menuIds: [] }
      }
      if (
        (variante === 'imagem' || variante === 'vinculoMenus') &&
        lista.length === 0
      ) {
        return { aplicarNoCadastroBase: false, menuIds: [] }
      }

      return abrirDialogo({
        opts,
        variante,
        lista,
        passoInicial: opts.passoInicial ?? 'perguntar',
        exigePeloMenosUmMenu: opts.exigePeloMenosUmMenu,
      })
    },
    [abrirDialogo]
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
      await invalidate(['menu-produto'])
      await invalidate(['produtos'])
      await invalidate(['produto', params.produtoId])
    },
    [invalidate]
  )

  const aplicarImagemNosDestinos = useCallback(
    async (params: {
      produtoId: string
      file: File
      destinos: DestinoAlteracaoProduto
      vincularSeAusente?: boolean
    }) => {
      if (params.destinos.menuIds.length === 0) return
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado')
      await aplicarImagemProdutoNosMenus({
        token,
        produtoId: params.produtoId,
        menuIds: params.destinos.menuIds,
        file: params.file,
        vincularSeAusente: params.vincularSeAusente ?? true,
      })
      await invalidate(['menu-produtos'])
      await invalidate(['produto', params.produtoId])
    },
    [invalidate]
  )

  const onSim = useCallback(() => {
    if (
      pedido?.variante !== 'imagem' &&
      pedido?.variante !== 'vinculoMenus' &&
      pedido?.origem === 'menu' &&
      menus.length === 0
    ) {
      setCadastroBaseMarcado(true)
    }
    setPasso('escolher')
  }, [pedido?.origem, pedido?.variante, menus.length])

  const fluxoLista = Boolean(pedido?.fluxoListaCadastroBase)
  const confirmacaoStatusGlobal = Boolean(pedido?.confirmacaoStatusGlobal)
  const exigeMenu = Boolean(pedido?.exigePeloMenosUmMenu)
  const podeConfirmarLista = !exigeMenu || selecionados.size > 0

  const dialog = (
    <PropagarAlteracaoProdutoDialog
      open={Boolean(pedido)}
      passo={passo}
      origem={pedido?.origem ?? 'cadastroBase'}
      variante={pedido?.variante ?? 'dados'}
      novoAtivo={pedido?.novoAtivo}
      menusJaSalvos={pedido?.menusJaSalvos}
      incluirCadastroBase={
        !fluxoLista &&
        !confirmacaoStatusGlobal &&
        pedido?.variante !== 'imagem' &&
        pedido?.variante !== 'vinculoMenus' &&
        pedido?.origem === 'menu'
      }
      fluxoListaCadastroBase={fluxoLista}
      confirmacaoStatusGlobal={confirmacaoStatusGlobal}
      exigePeloMenosUmMenu={exigeMenu}
      menusJaVinculadosIds={menusJaVinculadosIds}
      menus={menus}
      selecionados={selecionados}
      cadastroBaseMarcado={cadastroBaseMarcado}
      busy={busy}
      confirmarEscolhaDisabled={fluxoLista ? !podeConfirmarLista : false}
      onNao={() => fechar({ aplicarNoCadastroBase: false, menuIds: [] })}
      onSim={onSim}
      onVoltar={() => setPasso('perguntar')}
      onConfirmarEscolha={() => {
        if (confirmacaoStatusGlobal) {
          fechar({
            aplicarNoCadastroBase: false,
            menuIds: Array.from(selecionados),
          })
          return
        }
        if (fluxoLista && !podeConfirmarLista) return
        fechar({
          aplicarNoCadastroBase: cadastroBaseMarcado,
          menuIds: Array.from(selecionados),
        })
      }}
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

  return { pedirConfirmacao, aplicarNosDestinos, aplicarImagemNosDestinos, dialog }
}
