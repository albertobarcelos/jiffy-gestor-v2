'use client'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Label } from '@/src/presentation/components/ui/label'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdClear, MdSearch } from 'react-icons/md'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { BUSCA_PRODUTO_INPUT_ID } from '../hooks/form/useNovoPedidoAtalhosTeclado'

export function PedidoProdutosCatalogoColuna() {
  const {
    adicionarProduto,
    buscaProdutoTexto,
    grupoSelecionadoId,
    grupos,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    produtosError,
    produtosList,
    setBuscaProdutoTexto,
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
        {!podeExibirProdutos ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center text-sm text-gray-500">
              Selecione uma categoria à esquerda ou pesquise pelo nome do produto
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3 pt-2">
            <Label className="mb-2 shrink-0 text-sm text-gray-600">
              {tituloGrade}
              {!emBusca && (
                <span className="font-semibold">{grupoSelecionado?.getNome()}</span>
              )}
            </Label>
            {isLoadingAtual ? (
              <div className="flex flex-1 items-center justify-center py-4 text-gray-500">
                <JiffyLoading />
              </div>
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
              <div
                className="scrollbar-thin grid min-h-0 flex-1 grid-cols-2 content-start gap-1 overflow-y-auto rounded-lg border p-1.5 sm:grid-cols-3 lg:grid-cols-4"
                style={{ backgroundColor: `${corHexGrupo}15` }}
              >
                {produtosList.map(
                  (produto: {
                    getId: () => string
                    getNome: () => string
                    getValor: () => number
                  }) => (
                    <div key={produto.getId()} className="aspect-square w-full min-w-0">
                      <button
                        type="button"
                        onClick={() => adicionarProduto(produto.getId())}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = corHexGrupo
                          e.currentTarget.style.backgroundColor = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = corHexGrupo
                          e.currentTarget.style.backgroundColor = '#ffffff'
                        }}
                        className="flex h-full w-full min-h-0 cursor-pointer flex-col items-center rounded-md border-2 px-1 py-1.5 text-center transition-all active:scale-95"
                        style={{
                          borderColor: corHexGrupo,
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <span className="flex min-h-0 w-full flex-1 items-end justify-center pb-0.5">
                          <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-900">
                            {produto.getNome()}
                          </span>
                        </span>
                        <span className="shrink-0 w-full text-center text-[14px] font-semibold tabular-nums text-gray-900">
                          {transformarParaReal(produto.getValor())}
                        </span>
                        <span className="min-h-0 w-full flex-1" aria-hidden="true" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
