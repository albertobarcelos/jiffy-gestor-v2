'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack, MdShoppingCart } from 'react-icons/md'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { resolverMenuCatalogoNovoPedido } from '@/src/domain/policies/pedido/CatalogoVendaPolicy'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  fetchGruposCatalogoVenda,
  fetchProdutosCatalogoPagina,
} from '@/src/presentation/components/features/pedidos/novoPedidoProdutosApi'
import type { Produto } from '@/src/domain/entities/Produto'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { gravarMesaQrSession, lerMesaQrSession } from './mesaQrSession'
import ProdutoMesaAddModal from './ProdutoMesaAddModal'

type Props = { mesaId: string }

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export default function CardapioMesaCatalogScreen({ mesaId }: Props) {
  const router = useRouter()
  const { menuVendaGestorId, isLoading: empresaLoading } = useEmpresaMe()
  const token = useAuthStore(s => s.tenantAuth?.getAccessToken())
  const [grupoId, setGrupoId] = useState<string | null>(null)
  const [produtoSel, setProdutoSel] = useState<Produto | null>(null)
  const [carrinhoCount, setCarrinhoCount] = useState(0)

  const menuId = useMemo(
    () => resolverMenuCatalogoNovoPedido('balcao', null, menuVendaGestorId),
    [menuVendaGestorId]
  )

  useEffect(() => {
    const session = lerMesaQrSession()
    if (session && menuId && session.menuId !== menuId) {
      gravarMesaQrSession({ ...session, menuId })
    }
  }, [menuId])

  useEffect(() => {
    const sessionId = lerMesaQrSession()?.sessionToken || mesaId
    const tick = async () => {
      try {
        const c = await obterCarrinho(sessionId)
        setCarrinhoCount(c.totalItens)
      } catch {
        /* ignore */
      }
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [mesaId])

  const gruposQuery = useSecureTenantQuery(
    ['cardapio-mesa', 'grupos', menuId],
    async ({ token: tenantToken }) => {
      if (!menuId) return [] as GrupoProduto[]
      return fetchGruposCatalogoVenda(menuId, tenantToken)
    },
    { enabled: !!token && !!menuId, staleTime: 1000 * 60 * 5 }
  )

  const grupos = gruposQuery.data ?? []

  useEffect(() => {
    if (!grupoId && grupos.length > 0) setGrupoId(grupos[0].getId())
  }, [grupos, grupoId])

  const produtosQuery = useSecureTenantQuery(
    ['cardapio-mesa', 'produtos', menuId, grupoId],
    async ({ token: tenantToken }) => {
      if (!menuId || !grupoId) return [] as Produto[]
      const page = await fetchProdutosCatalogoPagina(tenantToken, menuId, {
        grupoProdutoId: grupoId,
        limit: 100,
        offset: 0,
      })
      return page.produtos
    },
    { enabled: !!token && !!menuId && !!grupoId, staleTime: 1000 * 60 * 2 }
  )

  const produtos = produtosQuery.data ?? []

  if (!token) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow">
        <p className="mb-2 font-semibold text-gray-900">Faça login no gestor</p>
        <p className="text-sm text-gray-600">
          Na V1 o catálogo usa o mesmo Menu do pedido balcão e precisa da sessão da empresa.
        </p>
      </div>
    )
  }

  if (empresaLoading || (menuId && gruposQuery.isPending)) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!menuId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow">
        <p className="font-semibold text-gray-900">Menu de venda do gestor não configurado</p>
        <p className="mt-2 text-sm text-gray-600">
          Configure o menuVendaGestorId da empresa (mesmo usado no pedido balcão).
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b px-3 py-3"
        style={{
          backgroundColor: 'var(--cardapio-bg-secondary)',
          borderColor: 'var(--cardapio-border, #333)',
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/cardapio-mesa/mesa/${mesaId}`)}
          className="rounded-full p-2"
          style={{ color: 'var(--cardapio-text-primary)' }}
          aria-label="Voltar"
        >
          <MdArrowBack className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-lg font-bold" style={{ color: 'var(--cardapio-text-primary)' }}>
          Cardápio
        </h1>
        <button
          type="button"
          onClick={() => router.push(`/cardapio-mesa/mesa/${mesaId}/carrinho`)}
          className="relative rounded-full p-2"
          style={{ color: 'var(--cardapio-text-primary)' }}
          aria-label="Carrinho"
        >
          <MdShoppingCart className="h-6 w-6" />
          {carrinhoCount > 0 ? (
            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
              {carrinhoCount > 99 ? '99+' : carrinhoCount}
            </span>
          ) : null}
        </button>
      </header>

      <div
        className="flex gap-2 overflow-x-auto border-b px-3 py-2"
        style={{ borderColor: 'var(--cardapio-border, #333)' }}
      >
        {grupos.map(grupo => {
          const ativo = grupo.getId() === grupoId
          return (
            <button
              key={grupo.getId()}
              type="button"
              onClick={() => setGrupoId(grupo.getId())}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                ativo ? 'ring-2 ring-orange-500' : ''
              }`}
              style={{
                backgroundColor: 'var(--cardapio-bg-elevated, rgba(255,255,255,0.08))',
                color: 'var(--cardapio-text-primary)',
              }}
            >
              <DinamicIcon
                iconName={grupo.getIconName() || 'food'}
                color={grupo.getCorHex() || '#FF7A00'}
                size={16}
              />
              {grupo.getNome()}
            </button>
          )
        })}
      </div>

      <div className="flex-1 space-y-3 p-3">
        {produtosQuery.isPending ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
          </div>
        ) : produtos.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--cardapio-text-secondary)' }}>
            Nenhum produto neste grupo.
          </p>
        ) : (
          produtos.map(produto => (
            <button
              key={produto.getId()}
              type="button"
              onClick={() => setProdutoSel(produto)}
              className="flex w-full gap-3 rounded-2xl p-3 text-left shadow-sm"
              style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
            >
              <div
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl"
                style={{ backgroundColor: 'var(--cardapio-bg-elevated, #333)' }}
              >
                {produto.getImagemUrl() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={produto.getImagemUrl()!}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
                  {produto.getNome()}
                </p>
                {produto.getDescricao() ? (
                  <p
                    className="mt-0.5 line-clamp-2 text-xs"
                    style={{ color: 'var(--cardapio-text-secondary)' }}
                  >
                    {produto.getDescricao()}
                  </p>
                ) : null}
                <p className="mt-1 font-bold text-orange-500">{formatarPreco(produto.getValor())}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {produtoSel ? (
        <ProdutoMesaAddModal
          mesaId={mesaId}
          menuId={menuId}
          produto={produtoSel}
          onClose={() => setProdutoSel(null)}
          onAdded={() => {
            setProdutoSel(null)
            void obterCarrinho(lerMesaQrSession()?.sessionToken || mesaId).then(c =>
              setCarrinhoCount(c.totalItens)
            )
          }}
        />
      ) : null}
    </div>
  )
}
