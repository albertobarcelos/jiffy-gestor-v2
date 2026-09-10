'use client'

import { Label } from '@/src/presentation/components/ui/label'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { MdClear, MdSearch } from 'react-icons/md'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { BUSCA_PRODUTO_INPUT_ID } from '../hooks/form/useNovoPedidoAtalhosTeclado'
import { PedidoCatalogoGradeSkeleton, PEDIDO_CATALOGO_GRADE_CLASS } from './PedidoCatalogoGradeSkeleton'
import { PedidoCatalogoProdutoBotao } from './PedidoCatalogoProdutoBotao'

export function PedidoProdutosCatalogoColuna() {
  const {
    adicionarProduto,
    buscaProdutoTexto,
    grupoSelecionadoId,
    grupos,
    isLoadingGruposVenda,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    menuCatalogoIndisponivel,
    produtosError,
    produtosList,
    setBuscaProdutoTexto,
    tipoInicioPedido,
  } = useNovoPedidoFormContext()

  const emBusca = buscaProdutoTexto.length >= 2
  const podeExibirProdutos = emBusca || !!grupoSelecionadoId
  const grupoSelecionado = grupos.find(
    (g: { getId: () => string }) => g.getId() === grupoSelecionadoId
  )
  const corHexGrupo = grupoSelecionado?.getCorHex() || '#6b7280'
  const tituloGrade = emBusca
    ? `Resultados para "${buscaProdutoTexto}"`
    : `Produtos do grupo: `
  const isLoadingAtual = emBusca ? isLoadingBuscaProdutos : isLoadingProdutos
  const isLoadingCatalogo = isLoadingGruposVenda || (podeExibirProdutos && isLoadingAtual)
  const mensagemMenuIndisponivel =
    tipoInicioPedido === 'entrega'
      ? 'Configure o menu em Configurações → Delivery.'
      : 'Configure o menu em Configurações → Empresa.'

  return (
    <div className="flex min-h-0 min-w-0 flex-[3.8] basis-0 flex-col gap-2">
      <div className="relative shrink-0">
        <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          id={BUSCA_PRODUTO_INPUT_ID}
          type="text"
          autoComplete="off"
          placeholder="Pesquisar produto pelo nome..."
          value={buscaProdutoTexto}
          onChange={(e) => setBuscaProdutoTexto(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {buscaProdutoTexto.length > 0 && (
          <button
            type="button"
            onClick={() => setBuscaProdutoTexto('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpar busca"
          >
            <MdClear className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-gray-50">
        {menuCatalogoIndisponivel ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="max-w-sm text-center text-sm text-gray-600">{mensagemMenuIndisponivel}</p>
          </div>
        ) : isLoadingCatalogo || podeExibirProdutos ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3 pt-2">
            <Label className="mb-2 shrink-0 text-sm text-gray-600">
              {isLoadingGruposVenda && !emBusca && !grupoSelecionado ? (
                <Skeleton animation="wave" variant="text" width={200} height={20} />
              ) : (
                <>
                  {tituloGrade}
                  {!emBusca && (
                    <span className="font-semibold">{grupoSelecionado?.getNome()}</span>
                  )}
                </>
              )}
            </Label>
            {isLoadingCatalogo ? (
              <PedidoCatalogoGradeSkeleton />
            ) : !emBusca && produtosError ? (
              <div className="flex flex-1 items-center justify-center py-4 text-center text-red-500">
                Erro ao carregar produtos:{' '}
                {produtosError instanceof Error ? produtosError.message : 'Erro desconhecido'}
              </div>
            ) : produtosList.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-4 text-gray-500">
                Nenhum produto encontrado neste grupo
              </div>
            ) : (
              <div className={`scrollbar-thin ${PEDIDO_CATALOGO_GRADE_CLASS} overflow-y-auto`}>
                {produtosList.map(produto => (
                    <div key={produto.getId()} className="min-w-0">
                      <PedidoCatalogoProdutoBotao
                        produto={produto}
                        corHex={corHexGrupo}
                        onSelect={adicionarProduto}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center text-sm text-gray-500">
              Selecione uma categoria à esquerda ou pesquise pelo nome do produto
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
