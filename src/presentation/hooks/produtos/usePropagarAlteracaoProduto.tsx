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
import {
  completarDestinosSyncCadastroPrincipal,
  ehMenuPrincipal,
  idMenuPrincipalDeLista,
  labelCadastroNaPropagacao,
  menusParaPerguntarReplicacao,
  syncCadastroComMenuPrincipalAtivo,
} from '@/src/domain/policies/produto/syncCadastroComMenuPrincipal'

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
  principalId?: string | null
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

function aplicarPoliticaDestinos(params: {
  destinos: DestinoAlteracaoProduto
  origem: OrigemAlteracaoProduto
  menuIdAtual?: string
  principalId?: string | null
  variante: VariantePropagacaoProduto
}): DestinoAlteracaoProduto {
  return completarDestinosSyncCadastroPrincipal({
    destinos: params.destinos,
    origem: params.origem,
    menuIdAtual: params.menuIdAtual,
    principalId: params.principalId,
    variante: params.variante,
  })
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
    const atual = pedidoRef.current
    const destinos =
      resultado && atual
        ? aplicarPoliticaDestinos({
            destinos: resultado,
            origem: atual.origem,
            menuIdAtual: atual.menuIdAtual,
            principalId: atual.principalId,
            variante: atual.variante,
          })
        : resultado
    atual?.resolve(destinos)
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
      principalId?: string | null
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
          principalId: params.principalId,
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

      const wrap = (
        destinos: DestinoAlteracaoProduto,
        principalId?: string | null
      ): DestinoAlteracaoProduto =>
        aplicarPoliticaDestinos({
          destinos,
          origem: opts.origem,
          menuIdAtual: opts.menuIdAtual,
          principalId,
          variante,
        })

      // --- Lista base: ativo/inativo → só o menu principal (sem perguntar os outros) ---
      if (opts.origem === 'cadastroBase' && variante === 'statusAtivo' && token) {
        if (syncCadastroComMenuPrincipalAtivo()) {
          let principalId: string | null = null
          try {
            principalId = idMenuPrincipalDeLista(await buscarMenusDaEmpresa({ token }))
          } catch {
            principalId = null
          }
          return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
        }
        let menusDoProduto: MenuAlvoPropagacao[] = []
        let principalId: string | null = null
        try {
          const [vinculados, todosMenus] = await Promise.all([
            listarMenusDoProduto({ produtoId: opts.produtoId, token }),
            buscarMenusDaEmpresa({ token }),
          ])
          menusDoProduto = vinculados
          principalId = idMenuPrincipalDeLista(todosMenus)
        } catch {
          menusDoProduto = []
        }
        const vinculadosIds = new Set(menusDoProduto.map(m => m.id).filter(Boolean))
        return abrirDialogo({
          opts,
          variante,
          lista: menusDoProduto,
          principalId,
          preSelecionados: vinculadosIds,
          menusJaVinculados: vinculadosIds,
          confirmacaoStatusGlobal: true,
          passoInicial: 'perguntar',
        })
      }

      // --- Cadastro: espelha só o principal, sem diálogo de outros menus ---
      if (opts.origem === 'cadastroBase' && variante === 'dados' && token) {
        let todosMenus: Array<{ id: string; nome: string; tipo?: string }> = []
        try {
          todosMenus = await buscarMenusDaEmpresa({ token })
        } catch {
          todosMenus = []
        }
        const principalId = idMenuPrincipalDeLista(todosMenus)

        if (syncCadastroComMenuPrincipalAtivo()) {
          return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
        }

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
        const temVinculo = vinculadosIds.size > 0
        const outros = menusParaPerguntarReplicacao({
          menus: todosMenus,
          origem: 'cadastroBase',
          principalId,
          variante,
        })

        if (todosMenus.length === 0) {
          return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
        }

        if (todosMenus.length === 1 || outros.length === 0) {
          return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
        }

        return abrirDialogo({
          opts,
          variante,
          lista: outros,
          principalId,
          preSelecionados: new Set(
            [...vinculadosIds].filter(id => outros.some(m => m.id === id))
          ),
          menusJaVinculados: vinculadosIds,
          fluxoListaCadastroBase: true,
          exigePeloMenosUmMenu: temVinculo,
          passoInicial: 'escolher',
        })
      }

      if (
        opts.origem === 'cadastroBase' &&
        variante === 'imagem' &&
        token &&
        syncCadastroComMenuPrincipalAtivo()
      ) {
        let principalId: string | null = null
        try {
          principalId = idMenuPrincipalDeLista(await buscarMenusDaEmpresa({ token }))
        } catch {
          principalId = null
        }
        return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
      }

      let lista = opts.menusIniciais ?? []
      let menusEmpresa: Array<{ id: string; nome: string; tipo?: string }> = []
      if (token) {
        try {
          const precisaEmpresa =
            opts.fonteMenus === 'empresa' ||
            variante === 'vinculoMenus' ||
            (variante === 'imagem' && opts.origem === 'cadastroBase') ||
            syncCadastroComMenuPrincipalAtivo()

          if (precisaEmpresa) {
            menusEmpresa = await buscarMenusDaEmpresa({ token })
          }

          if (lista.length === 0) {
            if (
              opts.fonteMenus === 'empresa' ||
              variante === 'vinculoMenus' ||
              (variante === 'imagem' && opts.origem === 'cadastroBase')
            ) {
              lista = menusEmpresa.map(m => ({ id: m.id, nome: m.nome }))
            } else {
              lista = await listarMenusDoProduto({
                produtoId: opts.produtoId,
                token,
              })
              if (
                variante === 'imagem' &&
                lista.filter(m => !excluir.has(m.id)).length === 0
              ) {
                if (menusEmpresa.length === 0) {
                  menusEmpresa = await buscarMenusDaEmpresa({ token })
                }
                lista = menusEmpresa.map(m => ({ id: m.id, nome: m.nome }))
              }
            }
          }
        } catch {
          lista = lista.length > 0 ? lista : []
        }
      }

      const principalId = idMenuPrincipalDeLista(menusEmpresa)
      lista = lista.filter(m => !excluir.has(m.id))
      lista = menusParaPerguntarReplicacao({
        menus: lista,
        origem: opts.origem,
        menuIdAtual: opts.menuIdAtual,
        principalId,
        variante,
      })

      const origemEhPrincipal = ehMenuPrincipal(opts.menuIdAtual, principalId)

      if (opts.origem === 'cadastroBase' && lista.length === 0) {
        return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
      }
      if (
        (variante === 'imagem' || variante === 'vinculoMenus') &&
        lista.length === 0
      ) {
        return wrap({ aplicarNoCadastroBase: false, menuIds: [] }, principalId)
      }

      // Origem menu principal (ou único cardápio): sem outros destinos → espelha cadastro, sem diálogo.
      // Origem menu secundário com a ponte ligada: ainda pergunta cadastro+principal.
      if (opts.origem === 'menu' && lista.length === 0) {
        const perguntarCadastroSecundario =
          syncCadastroComMenuPrincipalAtivo() &&
          !origemEhPrincipal &&
          variante !== 'imagem' &&
          variante !== 'vinculoMenus'
        if (!perguntarCadastroSecundario) {
          return wrap({ aplicarNoCadastroBase: true, menuIds: [] }, principalId)
        }
      }

      return abrirDialogo({
        opts,
        variante,
        lista,
        principalId,
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
  const origemEhPrincipal = ehMenuPrincipal(pedido?.menuIdAtual, pedido?.principalId)
  const incluirCadastroBase =
    !fluxoLista &&
    !confirmacaoStatusGlobal &&
    pedido?.variante !== 'imagem' &&
    pedido?.variante !== 'vinculoMenus' &&
    pedido?.origem === 'menu' &&
    !origemEhPrincipal

  const dialog = (
    <PropagarAlteracaoProdutoDialog
      open={Boolean(pedido)}
      passo={passo}
      origem={pedido?.origem ?? 'cadastroBase'}
      variante={pedido?.variante ?? 'dados'}
      novoAtivo={pedido?.novoAtivo}
      menusJaSalvos={pedido?.menusJaSalvos}
      incluirCadastroBase={incluirCadastroBase}
      labelCadastroBase={labelCadastroNaPropagacao({
        origem: pedido?.origem ?? 'cadastroBase',
        menuIdAtual: pedido?.menuIdAtual,
        principalId: pedido?.principalId,
      })}
      espelhoCadastroPrincipal={syncCadastroComMenuPrincipalAtivo()}
      origemEhMenuPrincipal={origemEhPrincipal}
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
