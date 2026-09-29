'use client'

import { useQueryClient } from '@tanstack/react-query'
import { fetchBffJson } from '@/src/infrastructure/api/bffClient'
import type {
  ItemAplicarCardapio,
  ItemAplicarCategoria,
  ItemAplicarPagamento,
  ItemImportarCardapio,
  ResultadoAplicarCardapio,
  ResultadoAplicarCategoria,
  ResultadoAplicarPagamento,
  ResultadoImportarCardapio,
} from '@/src/domain/integracoes/cardapioMarketplace'
import type {
  ListaCardapioRemoto,
  ListaCategoriasCardapio,
  ListaPagamentosCardapio,
  ListaProdutosCardapio,
} from '@/src/domain/integracoes/ICardapioMarketplaceHub'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

export function useCardapioAiqfomeProdutos(menuId: string | null) {
  return useSecureTenantQuery<ListaProdutosCardapio>(
    ['integracoes', 'cardapio', 'aiqfome', 'produtos', menuId],
    ({ token }) =>
      fetchBffJson<ListaProdutosCardapio>(
        `/api/integracoes/cardapio/aiqfome/produtos?menuId=${encodeURIComponent(menuId ?? '')}`,
        token
      ),
    { enabled: Boolean(menuId), staleTime: 15_000 }
  )
}

export function useCardapioAiqfomeCategorias(menuId: string | null) {
  return useSecureTenantQuery<ListaCategoriasCardapio>(
    ['integracoes', 'cardapio', 'aiqfome', 'categorias', menuId],
    ({ token }) =>
      fetchBffJson<ListaCategoriasCardapio>(
        `/api/integracoes/cardapio/aiqfome/categorias?menuId=${encodeURIComponent(menuId ?? '')}`,
        token
      ),
    { enabled: Boolean(menuId), staleTime: 15_000 }
  )
}

export function useCardapioAiqfomePagamentos(enabled: boolean) {
  return useSecureTenantQuery<ListaPagamentosCardapio>(
    ['integracoes', 'cardapio', 'aiqfome', 'pagamentos'],
    ({ token }) => fetchBffJson<ListaPagamentosCardapio>('/api/integracoes/cardapio/aiqfome/pagamentos', token),
    { enabled, staleTime: 15_000 }
  )
}

export function useCardapioAiqfomeRemoto(busca: string) {
  const termo = busca.trim()
  return useSecureTenantQuery<ListaCardapioRemoto>(
    ['integracoes', 'cardapio', 'aiqfome', 'remoto', termo],
    ({ token }) => {
      const query = new URLSearchParams()
      if (termo) query.set('busca', termo)
      const qs = query.toString()
      return fetchBffJson<ListaCardapioRemoto>(
        `/api/integracoes/cardapio/aiqfome/remoto${qs ? `?${qs}` : ''}`,
        token
      )
    },
    { staleTime: 15_000 }
  )
}

function invalidarCardapioAiqfome(
  queryClient: ReturnType<typeof useQueryClient>,
  empresaId: string | null
) {
  if (!empresaId) return
  void queryClient.invalidateQueries({
    queryKey: ['tenant', empresaId, 'integracoes', 'cardapio', 'aiqfome'],
  })
  void queryClient.invalidateQueries({
    queryKey: ['tenant', empresaId, 'menu-produtos'],
  })
}

export function useAplicarCardapioAiqfome(menuId: string | null) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  return useSecureTenantMutation<
    { resultados: ResultadoAplicarCardapio[] },
    { itens: ItemAplicarCardapio[] }
  >(
    ({ token }, variables) =>
      fetchBffJson<{ resultados: ResultadoAplicarCardapio[] }>(
        '/api/integracoes/cardapio/aiqfome/aplicar',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ menuId, itens: variables.itens }),
        }
      ),
    {
      onSuccess: () => invalidarCardapioAiqfome(queryClient, empresaId),
    }
  )
}

export function useAplicarCategoriasAiqfome(menuId: string | null) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  return useSecureTenantMutation<
    { resultados: ResultadoAplicarCategoria[] },
    { itens: ItemAplicarCategoria[] }
  >(
    ({ token }, variables) =>
      fetchBffJson<{ resultados: ResultadoAplicarCategoria[] }>(
        '/api/integracoes/cardapio/aiqfome/categorias/aplicar',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ menuId, itens: variables.itens }),
        }
      ),
    {
      onSuccess: () => invalidarCardapioAiqfome(queryClient, empresaId),
    }
  )
}

export function useAplicarPagamentosAiqfome() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  return useSecureTenantMutation<
    { resultados: ResultadoAplicarPagamento[] },
    { itens: ItemAplicarPagamento[] }
  >(
    ({ token }, variables) =>
      fetchBffJson<{ resultados: ResultadoAplicarPagamento[] }>(
        '/api/integracoes/cardapio/aiqfome/pagamentos/aplicar',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ itens: variables.itens }),
        }
      ),
    {
      onSuccess: () => invalidarCardapioAiqfome(queryClient, empresaId),
    }
  )
}

export function useImportarCardapioAiqfome(menuId: string | null) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  return useSecureTenantMutation<
    { resultados: ResultadoImportarCardapio[] },
    { grupoId?: string | null; itens: ItemImportarCardapio[] }
  >(
    ({ token }, variables) =>
      fetchBffJson<{ resultados: ResultadoImportarCardapio[] }>(
        '/api/integracoes/cardapio/aiqfome/importar',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            menuId,
            grupoId: variables.grupoId ?? null,
            itens: variables.itens,
          }),
        }
      ),
    {
      onSuccess: () => invalidarCardapioAiqfome(queryClient, empresaId),
    }
  )
}
