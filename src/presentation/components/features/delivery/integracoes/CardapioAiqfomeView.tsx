'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type {
  AcaoCardapio,
  CategoriaCanalResumo,
  CategoriaCardapioMarketplace,
  ItemCardapioRemoto,
  PagamentoCanalResumo,
  PagamentoCardapioMarketplace,
  ProdutoCardapioMarketplace,
} from '@/src/domain/integracoes/cardapioMarketplace'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import {
  AIQFOME_CARDAPIO_PATH,
  AIQFOME_CARDAPIO_TAB_ID,
  AIQFOME_CARDAPIO_TAB_LABEL,
} from '@/src/presentation/components/features/delivery/integracoes/cardapioAiqfomeRoutes'
import {
  useAplicarCardapioAiqfome,
  useAplicarCategoriasAiqfome,
  useAplicarPagamentosAiqfome,
  useCardapioAiqfomeCategorias,
  useCardapioAiqfomePagamentos,
  useCardapioAiqfomeProdutos,
  useCardapioAiqfomeRemoto,
  useImportarCardapioAiqfome,
} from '@/src/presentation/hooks/useCardapioAiqfome'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useMenuGruposProdutos } from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { showToast } from '@/src/shared/utils/toast'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  gravarMenuCardapioSessao,
  resolverMenuCardapioInicial,
} from '@/src/shared/utils/menuCardapioSessao'

type PassoCardapio = 'categorias' | 'produtos' | 'pagamentos'

type RascunhoLinha = {
  acao: AcaoCardapio
  idItem: string | null
}

type RascunhoCategoria = {
  acao: AcaoCardapio
  categoriaId: string | null
}

type RascunhoPagamento = {
  acao: AcaoCardapio
  pagamentoId: string | null
}

const ACAO_VAZIA = '__vazio'
const ACAO_SALVA = '__salvo'

function isPrincipal(tipo: string | undefined): boolean {
  return String(tipo ?? '').toLowerCase() === 'principal'
}

function valorSelect(vinculo: unknown, acao: AcaoCardapio | null, rascunho?: { acao: AcaoCardapio }): string {
  if (rascunho) return rascunho.acao
  if (vinculo) return ACAO_SALVA
  if (acao === 'CRIAR') return 'CRIAR'
  return ACAO_VAZIA
}

export function CardapioAiqfomeView() {
  const { toGestao } = useGestaoPath()
  const addTab = useTabsStore(s => s.addTab)
  const empresaId = useTenantEmpresaId()
  const menusQuery = useMenus({ limit: 100 })
  const menus = menusQuery.data?.items ?? []
  const [menuId, setMenuId] = useState<string | null>(null)
  const [passo, setPasso] = useState<PassoCardapio>('categorias')
  const [buscaRemota, setBuscaRemota] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({})
  const [grupoId, setGrupoId] = useState('')
  const [rascunhos, setRascunhos] = useState<Record<string, RascunhoLinha>>({})
  const [rascunhosCategoria, setRascunhosCategoria] = useState<Record<string, RascunhoCategoria>>({})
  const [rascunhosPagamento, setRascunhosPagamento] = useState<Record<string, RascunhoPagamento>>({})

  useEffect(() => {
    addTab({
      id: AIQFOME_CARDAPIO_TAB_ID,
      label: AIQFOME_CARDAPIO_TAB_LABEL,
      path: AIQFOME_CARDAPIO_PATH,
    })
  }, [addTab])

  useEffect(() => {
    if (menusQuery.isPending || menuId) return
    const inicial = resolverMenuCardapioInicial({ empresaId, menus })
    if (inicial) setMenuId(inicial)
  }, [empresaId, menuId, menus, menusQuery.isPending])

  useEffect(() => {
    const timer = window.setTimeout(() => setBuscaDebounced(buscaRemota), 300)
    return () => window.clearTimeout(timer)
  }, [buscaRemota])

  const categoriasQuery = useCardapioAiqfomeCategorias(menuId)
  const produtosQuery = useCardapioAiqfomeProdutos(menuId)
  const pagamentosQuery = useCardapioAiqfomePagamentos(Boolean(menuId))
  const remotoQuery = useCardapioAiqfomeRemoto(buscaDebounced)
  const remotoCompletoQuery = useCardapioAiqfomeRemoto('')
  const aplicarCategorias = useAplicarCategoriasAiqfome(menuId)
  const aplicarPagamentos = useAplicarPagamentosAiqfome()
  const aplicar = useAplicarCardapioAiqfome(menuId)
  const importar = useImportarCardapioAiqfome(menuId)
  const gruposQuery = useMenuGruposProdutos({
    menuId: menuId ?? undefined,
    limit: 100,
    enabled: Boolean(menuId) && passo === 'produtos',
  })
  const grupos = useMemo(
    () => gruposQuery.data?.pages.flatMap(page => page.items) ?? [],
    [gruposQuery.data]
  )

  const categorias = categoriasQuery.data?.categorias ?? []
  const remotoCategorias = categoriasQuery.data?.remoto ?? []
  const pagamentos = pagamentosQuery.data?.pagamentos ?? []
  const remotoPagamentos = pagamentosQuery.data?.remoto ?? []
  const produtos = produtosQuery.data?.produtos ?? []
  const remotos = remotoQuery.data?.itens ?? []
  const remotoTodos = remotoCompletoQuery.data?.itens ?? remotos
  const avisoAiqfome = remotoQuery.data?.mensagem || produtosQuery.data?.mensagem || ''
  const podeCriarNoAiqfome = remotoQuery.data?.podeCriar ?? produtosQuery.data?.podeCriar ?? true
  const gravando =
    aplicarCategorias.isPending || aplicarPagamentos.isPending || aplicar.isPending || importar.isPending
  const categoriasPendentes = useMemo(() => {
    return categorias.flatMap(categoria => {
      const rascunho = rascunhosCategoria[categoria.grupoId]
      if (!rascunho) return []
      if (
        categoria.vinculo &&
        rascunho.acao === 'VINCULAR' &&
        rascunho.categoriaId === categoria.vinculo.idCategoria
      ) {
        return []
      }
      if (categoria.acao === rascunho.acao && rascunho.acao !== 'VINCULAR' && !categoria.vinculo) {
        return []
      }
      return [
        {
          grupoId: categoria.grupoId,
          acao: rascunho.acao,
          categoriaId: rascunho.categoriaId,
          nome: categoria.nome,
        },
      ]
    })
  }, [categorias, rascunhosCategoria])

  const pagamentosPendentes = useMemo(() => {
    return pagamentos.flatMap(pagamento => {
      const rascunho = rascunhosPagamento[pagamento.meioId]
      if (!rascunho) return []
      if (
        pagamento.vinculo &&
        rascunho.acao === 'VINCULAR' &&
        rascunho.pagamentoId === pagamento.vinculo.idPagamento
      ) {
        return []
      }
      if (pagamento.acao === rascunho.acao && rascunho.acao !== 'VINCULAR' && !pagamento.vinculo) {
        return []
      }
      return [
        {
          meioId: pagamento.meioId,
          acao: rascunho.acao,
          pagamentoId: rascunho.pagamentoId,
          nome: pagamento.nome,
        },
      ]
    })
  }, [pagamentos, rascunhosPagamento])

  const itensPendentes = useMemo(() => {
    return produtos.flatMap(produto => {
      const rascunho = rascunhos[produto.produtoId]
      if (!rascunho) return []
      if (
        produto.vinculo &&
        rascunho.acao === 'VINCULAR' &&
        rascunho.idItem === produto.vinculo.idItem
      ) {
        return []
      }
      if (produto.acao === rascunho.acao && rascunho.acao !== 'VINCULAR' && !produto.vinculo) {
        return []
      }
      const remoto = remotoTodos.find(item => item.idItem === rascunho.idItem)
      return [
        {
          produtoId: produto.produtoId,
          acao: rascunho.acao,
          idItem: rascunho.idItem,
          sku: remoto?.sku ?? null,
          categoriaId: produto.categoriaId,
          nome: produto.nome,
        },
      ]
    })
  }, [produtos, rascunhos, remotoTodos])

  const importarPendentes = useMemo(
    () => remotoTodos.filter(item => selecionados[item.idItem]),
    [remotoTodos, selecionados]
  )

  const qtdPendentes =
    passo === 'categorias'
      ? categoriasPendentes.length
      : passo === 'pagamentos'
        ? pagamentosPendentes.length
        : itensPendentes.length + importarPendentes.length
  const categoriasResolvidas = categorias.filter(item => item.vinculo).length

  const escolherMenu = (id: string) => {
    setMenuId(id)
    setPasso('categorias')
    setSelecionados({})
    setRascunhos({})
    setRascunhosCategoria({})
    setRascunhosPagamento({})
    if (empresaId) gravarMenuCardapioSessao(empresaId, id)
  }

  const definirAcaoCategoria = (categoria: CategoriaCardapioMarketplace, valor: string) => {
    if (valor === ACAO_VAZIA || valor === ACAO_SALVA) {
      setRascunhosCategoria(atual => {
        const proximo = { ...atual }
        delete proximo[categoria.grupoId]
        return proximo
      })
      return
    }
    if (valor !== 'VINCULAR' && valor !== 'CRIAR' && valor !== 'IGNORAR') return
    setRascunhosCategoria(atual => ({
      ...atual,
      [categoria.grupoId]: {
        acao: valor,
        categoriaId:
          valor === 'VINCULAR'
            ? atual[categoria.grupoId]?.categoriaId ??
              categoria.sugestao?.idCategoria ??
              categoria.vinculo?.idCategoria ??
              null
            : null,
      },
    }))
  }

  const definirCategoriaVinculo = (grupoIdAtual: string, categoriaId: string) => {
    setRascunhosCategoria(atual => ({
      ...atual,
      [grupoIdAtual]: { acao: 'VINCULAR', categoriaId },
    }))
  }

  const definirAcaoPagamento = (pagamento: PagamentoCardapioMarketplace, valor: string) => {
    if (valor === ACAO_VAZIA || valor === ACAO_SALVA) {
      setRascunhosPagamento(atual => {
        const proximo = { ...atual }
        delete proximo[pagamento.meioId]
        return proximo
      })
      return
    }
    if (valor !== 'VINCULAR' && valor !== 'IGNORAR') return
    setRascunhosPagamento(atual => ({
      ...atual,
      [pagamento.meioId]: {
        acao: valor,
        pagamentoId:
          valor === 'VINCULAR'
            ? atual[pagamento.meioId]?.pagamentoId ??
              pagamento.sugestao?.idPagamento ??
              pagamento.vinculo?.idPagamento ??
              null
            : null,
      },
    }))
  }

  const definirPagamentoVinculo = (meioId: string, pagamentoId: string) => {
    setRascunhosPagamento(atual => ({
      ...atual,
      [meioId]: { acao: 'VINCULAR', pagamentoId },
    }))
  }

  const definirAcao = (produto: ProdutoCardapioMarketplace, valor: string) => {
    if (valor === ACAO_VAZIA || valor === ACAO_SALVA) {
      setRascunhos(atual => {
        const proximo = { ...atual }
        delete proximo[produto.produtoId]
        return proximo
      })
      return
    }
    if (valor !== 'VINCULAR' && valor !== 'CRIAR' && valor !== 'IGNORAR') return
    setRascunhos(atual => ({
      ...atual,
      [produto.produtoId]: {
        acao: valor,
        idItem:
          valor === 'VINCULAR'
            ? atual[produto.produtoId]?.idItem ??
              produto.sugestao?.idItem ??
              produto.vinculo?.idItem ??
              null
            : null,
      },
    }))
  }

  const definirItemVinculo = (produtoId: string, idItem: string) => {
    setRascunhos(atual => ({
      ...atual,
      [produtoId]: { acao: 'VINCULAR', idItem },
    }))
  }

  const sincronizarCategorias = async () => {
    if (categoriasPendentes.length === 0) {
      showToast.info('Nada para sincronizar. Escolha a ação em cada categoria.')
      return
    }
    const semItem = categoriasPendentes.find(item => item.acao === 'VINCULAR' && !item.categoriaId)
    if (semItem) {
      showToast.error(`"${semItem.nome}": escolha a categoria do Aiqfome para vincular.`)
      return
    }

    try {
      const { resultados } = await aplicarCategorias.mutateAsync({
        itens: categoriasPendentes.map(item => ({
          grupoId: item.grupoId,
          acao: item.acao,
          categoriaId: item.categoriaId,
        })),
      })
      const falha = resultados.find(item => !item.salvo)
      if (falha?.erro) {
        showToast.error(falha.erro)
        return
      }
      showToast.success('Categorias gravadas. Agora sincronize os produtos.')
      setRascunhosCategoria({})
      setPasso('produtos')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível sincronizar as categorias.')
    }
  }

  const sincronizarPagamentos = async () => {
    if (pagamentosPendentes.length === 0) {
      showToast.info('Nada para sincronizar. Escolha a ação em cada forma de pagamento.')
      return
    }
    const semItem = pagamentosPendentes.find(item => item.acao === 'VINCULAR' && !item.pagamentoId)
    if (semItem) {
      showToast.error(`"${semItem.nome}": escolha o meio do Jiffy para vincular.`)
      return
    }

    try {
      const { resultados } = await aplicarPagamentos.mutateAsync({
        itens: pagamentosPendentes.map(item => ({
          meioId: item.meioId,
          acao: item.acao,
          pagamentoId: item.pagamentoId,
        })),
      })
      const falha = resultados.find(item => !item.salvo)
      if (falha?.erro) {
        showToast.error(falha.erro)
        return
      }
      showToast.success('Formas de pagamento gravadas.')
      setRascunhosPagamento({})
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível sincronizar as formas de pagamento.'
      )
    }
  }

  const sincronizarProdutos = async () => {
    if (itensPendentes.length + importarPendentes.length === 0) {
      showToast.info('Nada para sincronizar. Escolha a ação em cada linha.')
      return
    }
    const semItem = itensPendentes.find(item => item.acao === 'VINCULAR' && !item.idItem)
    if (semItem) {
      showToast.error(`"${semItem.nome}": escolha o item do Aiqfome para vincular.`)
      return
    }
    const semCategoria = itensPendentes.find(item => item.acao === 'CRIAR' && !item.categoriaId)
    if (semCategoria) {
      showToast.error(`"${semCategoria.nome}": sincronize a categoria antes de criar o produto.`)
      setPasso('categorias')
      return
    }

    try {
      if (itensPendentes.length > 0) {
        const { resultados } = await aplicar.mutateAsync({
          itens: itensPendentes.map(item => ({
            produtoId: item.produtoId,
            acao: item.acao,
            idItem: item.idItem,
            sku: item.sku,
            categoriaId: item.categoriaId,
          })),
        })
        const falha = resultados.find(item => !item.salvo)
        if (falha?.erro) {
          showToast.error(falha.erro)
          return
        }
      }

      if (importarPendentes.length > 0) {
        const { resultados } = await importar.mutateAsync({
          grupoId: grupoId || null,
          itens: importarPendentes.map(item => {
            if (item.preco == null || item.preco <= 0) {
              throw new Error(`"${item.nome}" está sem preço no Aiqfome.`)
            }
            return {
              idItem: item.idItem,
              nome: item.nome,
              descricao: item.descricao,
              preco: item.preco,
              sku: item.sku,
            }
          }),
        })
        const erro = resultados.find(item => item.erro)?.erro
        if (erro) {
          showToast.error(erro)
          return
        }
      }

      showToast.success('Sincronização gravada.')
      setRascunhos({})
      setSelecionados({})
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível sincronizar.')
    }
  }

  const sincronizar = () => {
    if (passo === 'categorias') {
      void sincronizarCategorias()
      return
    }
    if (passo === 'pagamentos') {
      void sincronizarPagamentos()
      return
    }
    void sincronizarProdutos()
  }

  if (menusQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  if (!menuId) {
    return (
      <div className="p-4">
        <p className="text-sm text-secondary-text">Nenhum cardápio cadastrado nesta empresa.</p>
        <Link href={toGestao('/menus')} className="mt-2 inline-block text-sm font-semibold text-primary">
          Cadastrar menu
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2">
        <Select value={menuId} onValueChange={escolherMenu}>
          <SelectTrigger className="!h-8 !min-h-8 w-56 text-sm" aria-label="Selecionar menu">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...menus]
              .sort((a, b) => Number(isPrincipal(String(b.tipo))) - Number(isPrincipal(String(a.tipo))))
              .map(menu => (
                <SelectItem key={menu.id} value={menu.id}>
                  {menu.nome}
                  {isPrincipal(String(menu.tipo)) ? ' (Principal)' : ''}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <nav className="flex items-center gap-1" aria-label="Passos da sincronização">
          <button
            type="button"
            onClick={() => setPasso('categorias')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              passo === 'categorias' ? 'bg-primary text-white' : 'text-secondary-text hover:bg-gray-100'
            }`}
          >
            1. Categorias
          </button>
          <button
            type="button"
            onClick={() => setPasso('produtos')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              passo === 'produtos' ? 'bg-primary text-white' : 'text-secondary-text hover:bg-gray-100'
            }`}
          >
            2. Produtos
          </button>
          <button
            type="button"
            onClick={() => setPasso('pagamentos')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              passo === 'pagamentos' ? 'bg-primary text-white' : 'text-secondary-text hover:bg-gray-100'
            }`}
          >
            3. Pagamentos
          </button>
        </nav>
        <p className="mr-auto text-xs text-secondary-text">
          {passo === 'categorias'
            ? 'Primeiro vincule, crie ou ignore as categorias. Depois os produtos.'
            : passo === 'pagamentos'
              ? 'Liste as formas do Aiqfome e vincule cada uma a um meio do Jiffy, ou ignore.'
              : 'As escolhas ficam nesta tela até sincronizar.'}
        </p>
        {passo === 'categorias' && categoriasResolvidas > 0 ? (
          <button
            type="button"
            onClick={() => setPasso('produtos')}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-primary-text"
          >
            Ir para produtos
          </button>
        ) : null}
        <button
          type="button"
          disabled={gravando}
          onClick={sincronizar}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {gravando ? 'Sincronizando…' : qtdPendentes > 0 ? `Sincronizar (${qtdPendentes})` : 'Sincronizar'}
        </button>
      </div>

      {avisoAiqfome && (remotoQuery.data?.vazio || produtosQuery.data?.vazio) ? (
        <p className="shrink-0 bg-amber-50 px-3 py-2 text-xs text-amber-900">{avisoAiqfome}</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {passo === 'categorias' ? (
          <PassoCategorias
            query={categoriasQuery}
            categorias={categorias}
            remoto={remotoCategorias}
            rascunhos={rascunhosCategoria}
            onAcao={definirAcaoCategoria}
            onCategoria={definirCategoriaVinculo}
          />
        ) : passo === 'pagamentos' ? (
          <PassoPagamentos
            query={pagamentosQuery}
            pagamentos={pagamentos}
            remoto={remotoPagamentos}
            rascunhos={rascunhosPagamento}
            onAcao={definirAcaoPagamento}
            onPagamento={definirPagamentoVinculo}
          />
        ) : (
          <PassoProdutos
            produtosQuery={produtosQuery}
            remotoQuery={remotoQuery}
            produtos={produtos}
            remotos={remotos}
            remotoTodos={remotoTodos}
            rascunhos={rascunhos}
            selecionados={selecionados}
            buscaRemota={buscaRemota}
            grupoId={grupoId}
            grupos={grupos}
            podeCriar={podeCriarNoAiqfome}
            onAcao={definirAcao}
            onItem={definirItemVinculo}
            onBusca={setBuscaRemota}
            onGrupo={setGrupoId}
            onSelecionar={(idItem, marcado) =>
              setSelecionados(atual => ({ ...atual, [idItem]: marcado }))
            }
            onVoltarCategorias={() => setPasso('categorias')}
          />
        )}
      </div>
    </div>
  )
}

function PassoCategorias({
  query,
  categorias,
  remoto,
  rascunhos,
  onAcao,
  onCategoria,
}: {
  query: ReturnType<typeof useCardapioAiqfomeCategorias>
  categorias: CategoriaCardapioMarketplace[]
  remoto: CategoriaCanalResumo[]
  rascunhos: Record<string, RascunhoCategoria>
  onAcao: (categoria: CategoriaCardapioMarketplace, valor: string) => void
  onCategoria: (grupoId: string, categoriaId: string) => void
}) {
  if (query.isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className="px-3 py-4">
        <p className="text-sm text-red-600">
          {query.error instanceof Error ? query.error.message : 'Não foi possível ler as categorias.'}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-2 text-xs font-semibold text-primary"
        >
          Tentar de novo
        </button>
      </div>
    )
  }
  if (categorias.length === 0) {
    return <p className="px-3 py-4 text-sm text-secondary-text">Nenhuma categoria neste menu.</p>
  }
  return (
    <table className="w-full min-w-[36rem] border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-secondary-text">
        <tr>
          <th className="px-3 py-2">Categoria</th>
          <th className="px-3 py-2">Decisão</th>
        </tr>
      </thead>
      <tbody>
        {categorias.map(categoria => (
          <LinhaCategoria
            key={categoria.grupoId}
            categoria={categoria}
            rascunho={rascunhos[categoria.grupoId]}
            remoto={remoto}
            onAcao={valor => onAcao(categoria, valor)}
            onCategoria={categoriaId => onCategoria(categoria.grupoId, categoriaId)}
          />
        ))}
      </tbody>
    </table>
  )
}

function PassoPagamentos({
  query,
  pagamentos,
  remoto,
  rascunhos,
  onAcao,
  onPagamento,
}: {
  query: ReturnType<typeof useCardapioAiqfomePagamentos>
  pagamentos: PagamentoCardapioMarketplace[]
  remoto: PagamentoCanalResumo[]
  rascunhos: Record<string, RascunhoPagamento>
  onAcao: (pagamento: PagamentoCardapioMarketplace, valor: string) => void
  onPagamento: (meioId: string, pagamentoId: string) => void
}) {
  if (query.isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className="px-3 py-4">
        <p className="text-sm text-red-600">
          {query.error instanceof Error
            ? query.error.message
            : 'Não foi possível ler as formas de pagamento.'}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-2 text-xs font-semibold text-primary"
        >
          Tentar de novo
        </button>
      </div>
    )
  }
  if (pagamentos.length === 0) {
    return <p className="px-3 py-4 text-sm text-secondary-text">Nenhuma forma de pagamento no Aiqfome.</p>
  }
  return (
    <table className="w-full min-w-[36rem] border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-secondary-text">
        <tr>
          <th className="px-3 py-2">Forma no Aiqfome</th>
          <th className="px-3 py-2">Decisão</th>
        </tr>
      </thead>
      <tbody>
        {pagamentos.map(pagamento => (
          <LinhaPagamento
            key={pagamento.meioId}
            pagamento={pagamento}
            rascunho={rascunhos[pagamento.meioId]}
            remoto={remoto}
            onAcao={valor => onAcao(pagamento, valor)}
            onPagamento={pagamentoId => onPagamento(pagamento.meioId, pagamentoId)}
          />
        ))}
      </tbody>
    </table>
  )
}

function LinhaPagamento({
  pagamento,
  rascunho,
  remoto,
  onAcao,
  onPagamento,
}: {
  pagamento: PagamentoCardapioMarketplace
  rascunho?: RascunhoPagamento
  remoto: PagamentoCanalResumo[]
  onAcao: (valor: string) => void
  onPagamento: (pagamentoId: string) => void
}) {
  const valor = valorSelect(pagamento.vinculo, pagamento.acao, rascunho)
  const mostraItem = valor === 'VINCULAR'
  const pagamentoId =
    rascunho?.pagamentoId ?? pagamento.sugestao?.idPagamento ?? pagamento.vinculo?.idPagamento ?? ''
  const labelSalvo = pagamento.vinculo ? `Vinculado a ${pagamento.vinculo.nome}` : ''

  return (
    <tr className="border-t border-gray-100 align-middle">
      <td className="px-3 py-1.5 font-medium text-primary-text">{pagamento.nome}</td>
      <td className="px-3 py-1.5">
        <div className="flex min-w-[16rem] flex-col gap-1">
          <Select value={valor} onValueChange={onAcao}>
            <SelectTrigger className="!h-8 !min-h-8 text-sm" aria-label={`Decisão de ${pagamento.nome}`}>
              <SelectValue placeholder="Escolher" />
            </SelectTrigger>
            <SelectContent>
              {pagamento.vinculo ? <SelectItem value={ACAO_SALVA}>{labelSalvo}</SelectItem> : null}
              {!pagamento.vinculo ? <SelectItem value={ACAO_VAZIA}>Escolher</SelectItem> : null}
              <SelectItem value="VINCULAR">Vincular</SelectItem>
              <SelectItem value="IGNORAR">Ignorar</SelectItem>
            </SelectContent>
          </Select>
          {mostraItem ? (
            <Select
              value={pagamentoId || ACAO_VAZIA}
              onValueChange={escolha => {
                if (escolha !== ACAO_VAZIA) onPagamento(escolha)
              }}
            >
              <SelectTrigger
                className="!h-8 !min-h-8 text-sm"
                aria-label={`Meio Jiffy de ${pagamento.nome}`}
              >
                <SelectValue placeholder="Meio do Jiffy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACAO_VAZIA}>Meio do Jiffy</SelectItem>
                {remoto.map(item => (
                  <SelectItem key={item.idPagamento} value={item.idPagamento}>
                    {item.nome}
                    {pagamento.sugestao?.idPagamento === item.idPagamento ? ' (sugestão)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function PassoProdutos({
  produtosQuery,
  remotoQuery,
  produtos,
  remotos,
  remotoTodos,
  rascunhos,
  selecionados,
  buscaRemota,
  grupoId,
  grupos,
  podeCriar,
  onAcao,
  onItem,
  onBusca,
  onGrupo,
  onSelecionar,
  onVoltarCategorias,
}: {
  produtosQuery: ReturnType<typeof useCardapioAiqfomeProdutos>
  remotoQuery: ReturnType<typeof useCardapioAiqfomeRemoto>
  produtos: ProdutoCardapioMarketplace[]
  remotos: ItemCardapioRemoto[]
  remotoTodos: ItemCardapioRemoto[]
  rascunhos: Record<string, RascunhoLinha>
  selecionados: Record<string, boolean>
  buscaRemota: string
  grupoId: string
  grupos: { id: string; nome: string }[]
  podeCriar: boolean
  onAcao: (produto: ProdutoCardapioMarketplace, valor: string) => void
  onItem: (produtoId: string, idItem: string) => void
  onBusca: (valor: string) => void
  onGrupo: (valor: string) => void
  onSelecionar: (idItem: string, marcado: boolean) => void
  onVoltarCategorias: () => void
}) {
  return (
    <>
      {produtosQuery.isPending ? (
        <div className="flex h-40 items-center justify-center">
          <JiffyLoading />
        </div>
      ) : produtosQuery.isError ? (
        <div className="px-3 py-4">
          <p className="text-sm text-red-600">
            {produtosQuery.error instanceof Error
              ? produtosQuery.error.message
              : 'Não foi possível ler o cardápio.'}
          </p>
          <button
            type="button"
            onClick={() => void produtosQuery.refetch()}
            className="mt-2 text-xs font-semibold text-primary"
          >
            Tentar de novo
          </button>
        </div>
      ) : produtos.length === 0 ? (
        <p className="px-3 py-4 text-sm text-secondary-text">Nenhum produto neste menu.</p>
      ) : (
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-secondary-text">
            <tr>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2 text-right">Preço</th>
              <th className="px-3 py-2">Decisão</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map(produto => (
              <LinhaProduto
                key={produto.produtoId}
                produto={produto}
                rascunho={rascunhos[produto.produtoId]}
                remotos={remotoTodos}
                podeCriar={podeCriar}
                onAcao={valor => onAcao(produto, valor)}
                onItem={idItem => onItem(produto.produtoId, idItem)}
                onVoltarCategorias={onVoltarCategorias}
              />
            ))}
          </tbody>
        </table>
      )}

      <section className="border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary-text">
            Importar do Aiqfome
          </h2>
          <input
            type="search"
            value={buscaRemota}
            onChange={event => onBusca(event.target.value)}
            placeholder="Filtrar"
            className="h-8 w-48 rounded-md border border-gray-200 px-2 text-sm outline-none focus:border-primary"
          />
          <Select value={grupoId || '__primeiro'} onValueChange={valor => onGrupo(valor === '__primeiro' ? '' : valor)}>
            <SelectTrigger className="!h-8 !min-h-8 w-48 text-sm" aria-label="Grupo do menu">
              <SelectValue placeholder="Primeiro grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__primeiro">Primeiro grupo do menu</SelectItem>
              {grupos.map(grupo => (
                <SelectItem key={grupo.id} value={grupo.id}>
                  {grupo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {remotoQuery.isPending ? (
          <div className="flex h-24 items-center justify-center">
            <JiffyLoading />
          </div>
        ) : remotoQuery.isError ? (
          <div className="px-3 pb-3">
            <p className="text-sm text-red-600">
              {remotoQuery.error instanceof Error
                ? remotoQuery.error.message
                : 'Não foi possível listar o Aiqfome.'}
            </p>
            <button
              type="button"
              onClick={() => void remotoQuery.refetch()}
              className="mt-2 text-xs font-semibold text-primary"
            >
              Tentar de novo
            </button>
          </div>
        ) : remotos.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-secondary-text">
            {remotoQuery.data?.mensagem || 'Nenhum item no Aiqfome para este filtro.'}
          </p>
        ) : (
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-secondary-text">
              <tr>
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2 text-right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {remotos.map(item => (
                <tr key={item.idItem} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(selecionados[item.idItem])}
                      onChange={event => onSelecionar(item.idItem, event.target.checked)}
                      aria-label={`Importar ${item.nome}`}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-primary-text">{item.nome}</td>
                  <td className="px-3 py-1.5 text-secondary-text">{item.sku ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {item.preco != null ? transformarParaReal(item.preco) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}

function LinhaCategoria({
  categoria,
  rascunho,
  remoto,
  onAcao,
  onCategoria,
}: {
  categoria: CategoriaCardapioMarketplace
  rascunho?: RascunhoCategoria
  remoto: CategoriaCanalResumo[]
  onAcao: (valor: string) => void
  onCategoria: (categoriaId: string) => void
}) {
  const valor = valorSelect(categoria.vinculo, categoria.acao, rascunho)
  const mostraItem = valor === 'VINCULAR'
  const categoriaId = rascunho?.categoriaId ?? categoria.sugestao?.idCategoria ?? categoria.vinculo?.idCategoria ?? ''
  const labelSalvo = categoria.vinculo ? `Vinculado a ${categoria.vinculo.nome}` : ''

  return (
    <tr className="border-t border-gray-100 align-middle">
      <td className="px-3 py-1.5 font-medium text-primary-text">{categoria.nome}</td>
      <td className="px-3 py-1.5">
        <div className="flex min-w-[16rem] flex-col gap-1">
          <Select value={valor} onValueChange={onAcao}>
            <SelectTrigger className="!h-8 !min-h-8 text-sm" aria-label={`Decisão de ${categoria.nome}`}>
              <SelectValue placeholder="Escolher" />
            </SelectTrigger>
            <SelectContent>
              {categoria.vinculo ? <SelectItem value={ACAO_SALVA}>{labelSalvo}</SelectItem> : null}
              {!categoria.vinculo ? <SelectItem value={ACAO_VAZIA}>Escolher</SelectItem> : null}
              <SelectItem value="VINCULAR">Vincular</SelectItem>
              <SelectItem value="CRIAR">Criar</SelectItem>
              <SelectItem value="IGNORAR">Ignorar</SelectItem>
            </SelectContent>
          </Select>
          {mostraItem ? (
            <Select
              value={categoriaId || ACAO_VAZIA}
              onValueChange={escolha => {
                if (escolha !== ACAO_VAZIA) onCategoria(escolha)
              }}
            >
              <SelectTrigger className="!h-8 !min-h-8 text-sm" aria-label={`Categoria Aiqfome de ${categoria.nome}`}>
                <SelectValue placeholder="Categoria do Aiqfome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACAO_VAZIA}>Categoria do Aiqfome</SelectItem>
                {remoto.map(item => (
                  <SelectItem key={item.idCategoria} value={item.idCategoria}>
                    {item.nome}
                    {categoria.sugestao?.idCategoria === item.idCategoria ? ' (sugestão)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function LinhaProduto({
  produto,
  rascunho,
  remotos,
  podeCriar,
  onAcao,
  onItem,
  onVoltarCategorias,
}: {
  produto: ProdutoCardapioMarketplace
  rascunho?: RascunhoLinha
  remotos: ItemCardapioRemoto[]
  podeCriar: boolean
  onAcao: (valor: string) => void
  onItem: (idItem: string) => void
  onVoltarCategorias: () => void
}) {
  const valor = valorSelect(produto.vinculo, produto.acao, rascunho)
  const mostraItem = valor === 'VINCULAR'
  const idItem = rascunho?.idItem ?? produto.sugestao?.idItem ?? produto.vinculo?.idItem ?? ''
  const labelSalvo = produto.vinculo ? `Vinculado a ${produto.vinculo.nome}` : ''
  const podeCriarProduto = podeCriar && Boolean(produto.categoriaId)

  return (
    <tr className="border-t border-gray-100 align-middle">
      <td className="px-3 py-1.5 font-medium text-primary-text">{produto.nome}</td>
      <td className="px-3 py-1.5 text-secondary-text">{produto.grupoNome || '—'}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{transformarParaReal(produto.preco)}</td>
      <td className="px-3 py-1.5">
        <div className="flex min-w-[16rem] flex-col gap-1">
          <Select value={valor} onValueChange={onAcao}>
            <SelectTrigger className="!h-8 !min-h-8 text-sm" aria-label={`Decisão de ${produto.nome}`}>
              <SelectValue placeholder="Escolher" />
            </SelectTrigger>
            <SelectContent>
              {produto.vinculo ? <SelectItem value={ACAO_SALVA}>{labelSalvo}</SelectItem> : null}
              {!produto.vinculo ? <SelectItem value={ACAO_VAZIA}>Escolher</SelectItem> : null}
              <SelectItem value="VINCULAR">Vincular</SelectItem>
              <SelectItem value="CRIAR" disabled={!podeCriarProduto}>
                Criar
              </SelectItem>
              <SelectItem value="IGNORAR">Ignorar</SelectItem>
            </SelectContent>
          </Select>
          {!produto.categoriaId && !produto.vinculo ? (
            <button
              type="button"
              onClick={onVoltarCategorias}
              className="text-left text-xs text-amber-800"
            >
              Sincronize a categoria para criar este produto.
            </button>
          ) : null}
          {mostraItem ? (
            <Select
              value={idItem || ACAO_VAZIA}
              onValueChange={escolha => {
                if (escolha !== ACAO_VAZIA) onItem(escolha)
              }}
            >
              <SelectTrigger className="!h-8 !min-h-8 text-sm" aria-label={`Item Aiqfome de ${produto.nome}`}>
                <SelectValue placeholder="Item do Aiqfome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACAO_VAZIA}>Item do Aiqfome</SelectItem>
                {remotos.map(item => (
                  <SelectItem key={item.idItem} value={item.idItem}>
                    {item.nome}
                    {produto.sugestao?.idItem === item.idItem ? ' (sugestão)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
