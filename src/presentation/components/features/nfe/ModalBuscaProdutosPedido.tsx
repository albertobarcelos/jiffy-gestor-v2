'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type Ref,
} from 'react'
import Modal from '@mui/material/Modal'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import { useQuery } from '@tanstack/react-query'
import { MdClose, MdAdd, MdRemove } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  PainelPedidoBackdrop,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'

const PANEL_MS = { enter: 420, exit: 380 } as const

const BuscaProdutosSlide = forwardRef(function BuscaProdutosSlide(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide ref={ref} direction="left" {...props} />
})
BuscaProdutosSlide.displayName = 'BuscaProdutosSlide'

/** Uma linha na cesta — cada clique na lista gera uma linha nova (pode repetir o mesmo produto). */
export type ItemCestaBuscaProduto = {
  linhaId: string
  produto: Produto
  quantidade: number
}

function gerarIdLinhaCesta(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Valor numérico em pt-BR sem símbolo de moeda (ex.: 15,00 ou 1.234,56). */
function formatarValorNumericoPtBr(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

export interface ModalBuscaProdutosPedidoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Após animação de fechamento */
  onAfterClose?: () => void
  token: string | null
  onConfirm: (itens: Array<{ produto: Produto; quantidade: number }>) => void
}

async function fetchTodosProdutos(token: string, nomeBusca: string): Promise<Produto[]> {
  const params = new URLSearchParams({
    ativo: 'true',
    limit: '100',
    offset: '0',
  })
  const trimmed = nomeBusca.trim()
  if (trimmed) params.set('name', trimmed)

  const response = await fetch(`/api/produtos?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(typeof err?.message === 'string' ? err.message : 'Erro ao carregar produtos')
  }
  const data = await response.json()
  const items = Array.isArray(data.items) ? data.items : []
  return items.map((item: Record<string, unknown>) => Produto.fromJSON(item))
}

/**
 * Painel lateral: cesta acima + busca + lista (cada clique adiciona uma linha independente).
 * Mesma largura/altura do `ModalLancamentoProdutoPainel`.
 */
export function ModalBuscaProdutosPedido({
  open,
  onOpenChange,
  onAfterClose,
  token,
  onConfirm,
}: ModalBuscaProdutosPedidoProps) {
  const [internalOpen, setInternalOpen] = useState(open)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  /** Linhas independentes (mesmo produto pode aparecer várias vezes). */
  const [cesta, setCesta] = useState<ItemCestaBuscaProduto[]>([])

  useEffect(() => {
    if (open) setInternalOpen(true)
  }, [open])

  const handleSlideExited = useCallback(() => {
    setInternalOpen(false)
    setSearch('')
    setDebouncedSearch('')
    setCesta([])
    onAfterClose?.()
  }, [onAfterClose])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const {
    data: produtos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['modal-busca-produtos-pedido', debouncedSearch, token],
    queryFn: () => {
      if (!token) return Promise.resolve([] as Produto[])
      return fetchTodosProdutos(token, debouncedSearch)
    },
    enabled: open && !!token,
    staleTime: 0,
    gcTime: 1000 * 60,
    refetchOnWindowFocus: false,
  })

  // Atualiza entidade Produto nas linhas quando o mesmo id volta nos resultados da API
  useEffect(() => {
    if (!open || produtos.length === 0) return
    const mapPorId = new Map(produtos.map(p => [p.getId(), p]))
    setCesta(prev =>
      prev.map(row => {
        const fresh = mapPorId.get(row.produto.getId())
        if (fresh) return { ...row, produto: fresh }
        return row
      })
    )
  }, [open, produtos])

  /** Cada clique cria uma nova linha na cesta (mesmo produto pode repetir). */
  const adicionarProdutoNaCesta = useCallback((produto: Produto) => {
    setCesta(prev => [...prev, { linhaId: gerarIdLinhaCesta(), produto, quantidade: 1 }])
  }, [])

  const removerLinhaCesta = (linhaId: string) => {
    setCesta(prev => prev.filter(r => r.linhaId !== linhaId))
  }

  const ajustarQuantidadeCesta = (linhaId: string, delta: number) => {
    setCesta(prev =>
      prev.map(row => {
        if (row.linhaId !== linhaId) return row
        const q = Math.max(1, Math.floor(row.quantidade) + delta)
        return { ...row, quantidade: q }
      })
    )
  }

  const setQuantidadeCestaDireto = (linhaId: string, raw: string) => {
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) return
    const q = Math.max(1, Math.floor(n))
    setCesta(prev => prev.map(row => (row.linhaId === linhaId ? { ...row, quantidade: q } : row)))
  }

  const handleConfirmar = () => {
    const itens: Array<{ produto: Produto; quantidade: number }> = []
    for (const row of cesta) {
      if (row.quantidade >= 1) {
        itens.push({
          produto: row.produto,
          quantidade: Math.floor(row.quantidade),
        })
      }
    }
    if (itens.length === 0) {
      showToast.error('Adicione ao menos um produto tocando na lista abaixo.')
      return
    }
    onConfirm(itens)
    onOpenChange(false)
  }

  const produtosOrdenados = useMemo(
    () => [...produtos].sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR')),
    [produtos]
  )

  const temItensNaCesta = cesta.length > 0

  if (!internalOpen) return null

  return (
    <Modal
      open={internalOpen}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onOpenChange(false)
        }
      }}
      closeAfterTransition
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        zIndex: 1400,
        '& .MuiBackdrop-root': {
          zIndex: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
      }}
    >
      <BuscaProdutosSlide
        in={open}
        timeout={{ enter: PANEL_MS.enter, exit: PANEL_MS.exit }}
        onExited={handleSlideExited}
        appear
        mountOnEnter
        unmountOnExit={false}
      >
        <div
          className="absolute right-0 top-0 z-[1] flex h-[100dvh] max-h-[100dvh] w-[95vw] max-w-[100vw] flex-col overflow-hidden rounded-bl-xl rounded-tl-xl bg-white shadow-xl outline-none sm:w-[90vw] md:w-[min(900px,35vw)]"
          role="dialog"
          aria-modal
          aria-labelledby="modal-busca-produtos-titulo"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <h2
              id="modal-busca-produtos-titulo"
              className="min-w-0 flex-1 font-exo text-lg font-semibold text-primary-text sm:text-xl"
            >
              Buscar produtos
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-gray-100"
              aria-label="Fechar"
            >
              <MdClose size={22} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f9fafb]">
            {/* Cesta: lista corrida no estilo do passo Produtos do Novo Pedido */}
            <div className="flex max-h-[38vh] shrink-0 flex-col border-b border-gray-200 bg-[#f9fafb]">
              <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Selecionados para o pedido
              </p>
              <div className="min-h-[4.5rem] overflow-y-auto px-2 pb-3 pt-1">
                {!temItensNaCesta ? (
                  <p className="px-2 py-4 text-center text-sm text-gray-500">
                    Toque em um produto na lista abaixo para incluir. Cada toque adiciona uma linha;
                    o mesmo produto pode aparecer em várias linhas.
                  </p>
                ) : (
                  <div className="rounded-lg border bg-gray-50 p-1">
                    <div className="mb-1 flex gap-0.5 border-b border-gray-300 pb-1">
                      <div className="flex w-[7.25rem] flex-shrink-0 items-center justify-center">
                        <span className="text-center text-[10px] font-semibold leading-tight text-gray-700 sm:text-xs">
                          Qtd
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-gray-700 sm:text-xs">
                          Produto
                        </span>
                      </div>
                      <div className="flex w-[7rem] flex-shrink-0 items-center justify-end sm:w-[7.25rem]">
                        <span className="whitespace-nowrap text-[10px] font-semibold text-gray-700 sm:text-xs">
                          Total
                        </span>
                      </div>
                      <div className="flex w-9 flex-shrink-0 items-center justify-center">
                        <span className="text-[10px] font-semibold text-gray-700 sm:text-xs">
                          &nbsp;
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {cesta.map((item, index) => (
                        <div
                          key={item.linhaId}
                          className={`flex min-w-0 items-center gap-0.5 rounded px-0.5 py-1 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <div className="w-[7.25rem] flex-shrink-0">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                disabled={item.quantidade <= 1}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                                aria-label="Diminuir quantidade"
                                onClick={() => ajustarQuantidadeCesta(item.linhaId, -1)}
                              >
                                <MdRemove className="h-3.5 w-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantidade}
                                onChange={e =>
                                  setQuantidadeCestaDireto(item.linhaId, e.target.value)
                                }
                                className="h-7 w-10 border-0 bg-transparent px-0 text-center text-xs tabular-nums [-moz-appearance:textfield] focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                aria-label="Quantidade"
                              />
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                aria-label="Aumentar quantidade"
                                onClick={() => ajustarQuantidadeCesta(item.linhaId, 1)}
                              >
                                <MdAdd className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-gray-900">
                              {item.produto.getNome()}
                              {Math.max(1, Math.floor(item.quantidade)) > 1 ? (
                                <span className="text-gray-600">
                                  {' '}
                                  ({formatarValorNumericoPtBr(item.produto.getValor())})
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="w-[7rem] flex-shrink-0 text-right sm:w-[7.25rem]">
                            <span className="block whitespace-nowrap text-xs font-semibold tabular-nums text-primary">
                              {transformarParaReal(
                                item.produto.getValor() * Math.max(1, Math.floor(item.quantidade))
                              )}
                            </span>
                          </div>
                          <div className="flex w-9 flex-shrink-0 justify-center">
                            <button
                              type="button"
                              onClick={() => removerLinhaCesta(item.linhaId)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                              aria-label="Remover linha"
                            >
                              <MdClose className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-b border-gray-200/80 bg-[#f9fafb] px-4 py-3">
              <Input
                id="busca-produtos-pedido"
                label="Pesquisar"
                type="search"
                autoComplete="off"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nome do produto"
                className="w-full"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {!token ? (
                <p className="py-6 text-center text-sm text-gray-500">Sessão inválida.</p>
              ) : isLoading ? (
                <div className="flex justify-center py-12">
                  <JiffyLoading />
                </div>
              ) : isError ? (
                <div className="py-6 text-center text-sm text-red-600">
                  {(error as Error)?.message || 'Erro ao carregar.'}
                  <button
                    type="button"
                    className="mt-2 block w-full text-primary underline"
                    onClick={() => refetch()}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : produtosOrdenados.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Nenhum produto encontrado.</p>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 bg-white">
                  {produtosOrdenados.map(produto => {
                    const id = produto.getId()
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary/5 active:bg-primary/10"
                          onClick={() => adicionarProdutoNaCesta(produto)}
                        >
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900">
                            {produto.getNome()}
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                            {transformarParaReal(produto.getValor())}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div
            className="grid w-full shrink-0 border-t border-gray-200"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            <div className="min-w-0 border-r border-gray-200">
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={handleConfirmar}
                className="h-12 min-h-12 w-full font-semibold shadow-none"
                sx={footerSavePrimaryBarSx(true)}
              >
                Confirmar
              </Button>
            </div>
            <div className="min-w-0">
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                onClick={() => onOpenChange(false)}
                className="h-12 min-h-12 w-full font-semibold shadow-none"
                sx={footerBarPrimaryMutedSx(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </BuscaProdutosSlide>
    </Modal>
  )
}
