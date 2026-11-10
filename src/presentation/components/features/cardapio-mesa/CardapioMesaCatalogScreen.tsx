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
import CarrinhoCompleto from './CarrinhoCompleto'
import BannerPromocoesHorizontal from './BannerPromocoesHorizontal'
import BannerPromocoesVertical from './BannerPromocoesVertical'

type Props = { mesaId: string }

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function GruposChipsMobile({
  grupos,
  grupoId,
  onSelect,
}: {
  grupos: GrupoProduto[]
  grupoId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto border-b px-3 py-2 md:hidden"
      style={{ borderColor: 'var(--cardapio-border, #333)' }}
    >
      {grupos.map(grupo => {
        const ativo = grupo.getId() === grupoId
        return (
          <button
            key={grupo.getId()}
            type="button"
            onClick={() => onSelect(grupo.getId())}
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
  )
}

function GruposSidebarDesktop({
  grupos,
  grupoId,
  onSelect,
}: {
  grupos: GrupoProduto[]
  grupoId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <aside
      className="hidden h-full w-36 shrink-0 flex-col overflow-hidden border-r md:flex lg:w-56"
      style={{
        backgroundColor: 'var(--cardapio-menu-bg)',
        borderColor: 'var(--cardapio-border)',
      }}
    >
      <div className="flex-1 space-y-2 overflow-y-auto p-2 lg:p-3">
        {grupos.map(grupo => {
          const ativo = grupo.getId() === grupoId
          const corGrupo = grupo.getCorHex() || '#FF7A00'
          return (
            <button
              key={grupo.getId()}
              type="button"
              onClick={() => onSelect(grupo.getId())}
              className="group w-full rounded-lg px-1 py-1 transition-colors lg:px-2 lg:py-2"
              style={{
                backgroundColor: ativo
                  ? 'var(--cardapio-menu-item-active)'
                  : 'var(--cardapio-menu-item)',
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <div
                  className="flex h-16 w-full items-center justify-center rounded-lg transition-colors lg:h-20"
                  style={{
                    backgroundColor: ativo
                      ? 'rgba(255,255,255,0.18)'
                      : 'var(--cardapio-bg-elevated)',
                  }}
                >
                  <DinamicIcon
                    iconName={grupo.getIconName() || 'food'}
                    color={ativo ? '#FFFFFF' : corGrupo}
                    size={48}
                  />
                </div>
                <p
                  className="w-full text-center text-xs font-medium lg:text-sm"
                  style={{
                    color: ativo ? '#FFFFFF' : 'var(--cardapio-text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.4em',
                  }}
                >
                  {grupo.getNome()}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default function CardapioMesaCatalogScreen({ mesaId }: Props) {
  const router = useRouter()
  const { menuVendaGestorId, isLoading: empresaLoading } = useEmpresaMe()
  const token = useAuthStore(s => s.tenantAuth?.getAccessToken())
  const [grupoId, setGrupoId] = useState<string | null>(null)
  const [produtoSel, setProdutoSel] = useState<Produto | null>(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [carrinhoCount, setCarrinhoCount] = useState(0)

  const atualizarCarrinhoCount = () => {
    void obterCarrinho(lerMesaQrSession()?.sessionToken || mesaId).then(c =>
      setCarrinhoCount(c.totalItens)
    )
  }

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
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <header
        className="z-20 flex shrink-0 items-center gap-2 border-b px-3 py-3"
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
          onClick={() => setCarrinhoAberto(true)}
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

      <GruposChipsMobile grupos={grupos} grupoId={grupoId} onSelect={setGrupoId} />

      <div className="shrink-0 px-3 pb-2 pt-2 md:hidden">
        <BannerPromocoesHorizontal />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <GruposSidebarDesktop grupos={grupos} grupoId={grupoId} onSelect={setGrupoId} />

        <div
          className="hidden h-full w-44 shrink-0 flex-col overflow-hidden border-r p-1 md:flex lg:w-56"
          style={{
            backgroundColor: 'var(--cardapio-bg-secondary)',
            borderColor: 'var(--cardapio-border)',
          }}
        >
          <BannerPromocoesVertical />
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4"
          style={{ backgroundColor: 'var(--cardapio-bg-tertiary, var(--cardapio-bg-primary))' }}
        >
          {produtosQuery.isPending ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
            </div>
          ) : produtos.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: 'var(--cardapio-text-secondary)' }}
            >
              {grupoId
                ? 'Nenhum produto neste grupo.'
                : 'Selecione uma categoria do menu'}
            </p>
          ) : (
            <div className="space-y-3">
              {produtos.map(produto => (
                <button
                  key={produto.getId()}
                  type="button"
                  onClick={() => setProdutoSel(produto)}
                  className="flex w-full gap-3 rounded-2xl p-3 text-left shadow-sm transition-colors md:gap-4 md:p-4"
                  style={{
                    backgroundColor: 'var(--cardapio-card-bg, var(--cardapio-bg-secondary))',
                    borderWidth: 1,
                    borderColor: 'var(--cardapio-card-border, transparent)',
                  }}
                >
                  <div
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl md:h-28 md:w-28 lg:h-36 lg:w-36"
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
                    <p
                      className="font-semibold md:text-lg"
                      style={{ color: 'var(--cardapio-text-primary)' }}
                    >
                      {produto.getNome()}
                    </p>
                    {produto.getDescricao() ? (
                      <p
                        className="mt-0.5 line-clamp-2 text-xs md:line-clamp-3 md:text-sm"
                        style={{ color: 'var(--cardapio-text-secondary)' }}
                      >
                        {produto.getDescricao()}
                      </p>
                    ) : null}
                    <p className="mt-1 font-bold text-orange-500 md:text-lg">
                      {formatarPreco(produto.getValor())}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {produtoSel ? (
        <ProdutoMesaAddModal
          mesaId={mesaId}
          menuId={menuId}
          produto={produtoSel}
          onClose={() => setProdutoSel(null)}
          onAdded={() => {
            setProdutoSel(null)
            atualizarCarrinhoCount()
          }}
        />
      ) : null}

      <CarrinhoCompleto
        mesaId={mesaId}
        variant="panel"
        open={carrinhoAberto}
        onClose={() => setCarrinhoAberto(false)}
        onChanged={atualizarCarrinhoCount}
        onContinueShopping={() => setCarrinhoAberto(false)}
        onAfterEnviar={() => {
          setCarrinhoAberto(false)
          router.push(`/cardapio-mesa/mesa/${mesaId}`)
        }}
      />
    </div>
  )
}
