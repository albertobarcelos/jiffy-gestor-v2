'use client'

import type React from 'react'
import { Label } from '@/src/presentation/components/ui/label'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Produto } from '@/src/domain/entities/Produto'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  MdLaunch,
  MdDelete,
  MdClear,
  MdArrowBack,
  MdEdit,
  MdExpandLess,
  MdExpandMore,
  MdSearch,
} from 'react-icons/md'
import type { ProdutoSelecionado } from './novoPedidoModal.types'

export interface ProdutosPedidoStepProps {
  produtos: ProdutoSelecionado[]
  gruposExpandido: boolean
  setGruposExpandido: React.Dispatch<React.SetStateAction<boolean>>
  totalProdutos: number
  grupos: GrupoProduto[]
  isLoadingGrupos: boolean
  grupoSelecionadoId: string | null
  setGrupoSelecionadoId: React.Dispatch<React.SetStateAction<string | null>>
  gruposScrollRef: React.RefObject<HTMLDivElement | null>
  handleMouseDown: React.MouseEventHandler<HTMLDivElement>
  handleMouseMove: React.MouseEventHandler<HTMLDivElement>
  handleMouseUp: React.MouseEventHandler<HTMLDivElement>
  handleMouseLeave: React.MouseEventHandler<HTMLDivElement>
  hasMovedRef: React.MutableRefObject<boolean>
  isDragging: boolean
  isLoadingProdutos: boolean
  produtosError: unknown
  produtosList: Produto[]
  adicionarProduto: (produtoId: string) => void
  valoresEmEdicao: Record<string, string>
  setValoresEmEdicao: React.Dispatch<React.SetStateAction<Record<string, string>>>
  atualizarProduto: (index: number, campo: keyof ProdutoSelecionado, valor: unknown) => void
  longPressIndexRef: React.MutableRefObject<number | null>
  longPressTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  abrirModalEdicaoProduto: (index: number) => void
  formatarDescontoAcrescimo: (p: ProdutoSelecionado) => string
  formatarNumeroComMilhar: (valor: number) => string
  calcularTotalProduto: (p: ProdutoSelecionado) => number
  removerProduto: (index: number) => void
  atualizarComplemento: (
    produtoIndex: number,
    compIndex: number,
    campo: 'quantidade',
    valor: number
  ) => void
  removerComplemento: (produtoIndex: number, compIndex: number) => void
  abrirModalComplementosProdutoExistente: (index: number) => void
  formatarValorComplemento: (
    valor: number,
    tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
  ) => string
  longPressComplementoIndexRef: React.MutableRefObject<number | null>
  longPressComplementoTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  /** Abre o painel de busca global de produtos (lupa no cabeçalho dos grupos). */
  onAbrirBuscaProdutos?: () => void
}

/**
 * Passo 2: lista de produtos do pedido e grade por grupos.
 */
export function ProdutosPedidoStep(props: ProdutosPedidoStepProps) {
  const {
    produtos,
    gruposExpandido,
    setGruposExpandido,
    totalProdutos,
    grupos,
    isLoadingGrupos,
    grupoSelecionadoId,
    setGrupoSelecionadoId,
    gruposScrollRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    hasMovedRef,
    isDragging,
    isLoadingProdutos,
    produtosError,
    produtosList,
    adicionarProduto,
    valoresEmEdicao,
    setValoresEmEdicao,
    atualizarProduto,
    longPressIndexRef,
    longPressTimeoutRef,
    abrirModalEdicaoProduto,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    calcularTotalProduto,
    removerProduto,
    atualizarComplemento,
    removerComplemento,
    abrirModalComplementosProdutoExistente,
    formatarValorComplemento,
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
    onAbrirBuscaProdutos,
  } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 py-1">
      {/* Área de Edição de Produtos Selecionados: altura fixa quando grupos visíveis, cresce quando grupos ocultos */}
      <div
        className={`scrollbar-thin overflow-y-auto rounded-lg border bg-gray-50 ${
          gruposExpandido ? 'h-48 flex-shrink-0' : 'min-h-64 flex-1'
        }`}
      >
        {produtos.length > 0 ? (
          <div className="min-w-0 overflow-x-auto p-1">
            {/* Cabeçalho da tabela — colunas com largura fixa nas monetárias para não quebrar linha */}
            <div className="mb-1 flex gap-0.5 border-b border-gray-300 pb-1">
              <div className="flex w-9 flex-shrink-0 items-center justify-center">
                <span className="text-center text-[10px] font-semibold leading-tight text-gray-700 sm:text-xs">
                  Qtd
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-gray-700 sm:text-xs">Produto</span>
              </div>
              <div className="flex w-[6.75rem] flex-shrink-0 items-center justify-end sm:w-[7rem]">
                <span className="whitespace-nowrap text-right text-[10px] font-semibold text-gray-700 sm:text-xs">
                  Desc./Acres.
                </span>
              </div>
              <div className="flex w-[6.75rem] flex-shrink-0 items-center justify-end sm:w-[7.25rem]">
                <span className="whitespace-nowrap text-right text-[10px] font-semibold text-gray-700 sm:text-xs">
                  Val Unit.
                </span>
              </div>
              <div className="flex w-[7.5rem] flex-shrink-0 items-center justify-end sm:w-[8rem]">
                <span className="whitespace-nowrap text-right text-[10px] font-semibold text-gray-700 sm:text-xs">
                  Total
                </span>
              </div>
              <div className="flex w-[72px] flex-shrink-0 items-center justify-end pr-0.5">
                <span className="text-[10px] font-semibold text-gray-700 sm:text-xs">Ações</span>
              </div>
            </div>
            {/* Linhas de produtos */}
            <div className="space-y-0.5">
              {produtos.map((produto, index) => {
                // calcularTotalProduto já inclui complementos e desconto/acréscimo
                const totalProdutoComComplementos = calcularTotalProduto(produto)
                const produtoEntityAcoes = produtosList.find(p => p.getId() === produto.produtoId)
                // Botão sempre que o produto estiver na lista do grupo (modal permite vincular complementos ao produto)
                const exibirBotaoComplementos = !!produtoEntityAcoes

                return (
                  <div key={index} className="space-y-0">
                    {/* Linha do Produto Principal */}
                    <div
                      className={`flex min-w-0 items-center gap-0.5 rounded ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } cursor-pointer hover:bg-gray-100`}
                      onMouseDown={e => {
                        // Iniciar long press apenas se não for em um input ou button
                        const target = e.target as HTMLElement
                        if (
                          target.tagName === 'INPUT' ||
                          target.tagName === 'BUTTON' ||
                          target.closest('button') ||
                          target.closest('input')
                        ) {
                          return
                        }

                        longPressIndexRef.current = index
                        longPressTimeoutRef.current = setTimeout(() => {
                          if (longPressIndexRef.current === index) {
                            abrirModalEdicaoProduto(index)
                          }
                        }, 800) // 800ms para long press
                      }}
                      onMouseUp={() => {
                        // Limpar timeout se soltar antes do tempo
                        if (longPressTimeoutRef.current) {
                          clearTimeout(longPressTimeoutRef.current)
                          longPressTimeoutRef.current = null
                        }
                        longPressIndexRef.current = null
                      }}
                      onMouseLeave={() => {
                        // Limpar timeout se sair da área
                        if (longPressTimeoutRef.current) {
                          clearTimeout(longPressTimeoutRef.current)
                          longPressTimeoutRef.current = null
                        }
                        longPressIndexRef.current = null
                      }}
                    >
                      {/* Quantidade — coluna estreita; valores monetários usam larguras fixas à direita */}
                      <div className="w-9 flex-shrink-0">
                        <input
                          type="number"
                          min={1}
                          value={Math.floor(produto.quantidade)}
                          onChange={e => {
                            const valor = parseInt(e.target.value) || 1
                            atualizarProduto(index, 'quantidade', Math.max(1, valor))
                          }}
                          style={{
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                          }}
                          className="h-7 w-full min-w-0 border-0 bg-transparent px-0.5 py-0 text-center text-xs tabular-nums focus:bg-white focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      {/* Nome do Produto */}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-gray-900">{produto.nome}</span>
                      </div>
                      {/* Desconto/Acréscimo */}
                      <div className="w-[6.75rem] flex-shrink-0 sm:w-[7rem]">
                        <span className="block whitespace-nowrap text-right text-xs text-gray-600">
                          {formatarDescontoAcrescimo(produto)}
                        </span>
                      </div>
                      {/* Valor Unitário */}
                      <div className="w-[6.75rem] flex-shrink-0 sm:w-[7.25rem]">
                        <input
                          type="text"
                          value={
                            valoresEmEdicao[index] !== undefined
                              ? valoresEmEdicao[index]
                              : produto.valorUnitario > 0
                                ? formatarNumeroComMilhar(produto.valorUnitario)
                                : ''
                          }
                          onChange={e => {
                            let valorStr = e.target.value

                            // Se vazio, limpa o campo
                            if (valorStr === '') {
                              setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                              atualizarProduto(index, 'valorUnitario', 0)
                              return
                            }

                            // Remove pontos (separadores de milhar) e vírgula, mantém apenas números
                            valorStr = valorStr
                              .replace(/\./g, '')
                              .replace(',', '')
                              .replace(/\D/g, '')

                            // Se vazio após limpeza, limpa o campo
                            if (valorStr === '') {
                              setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                              atualizarProduto(index, 'valorUnitario', 0)
                              return
                            }

                            // Converte para número (centavos) e divide por 100 para obter reais
                            const valorCentavos = parseInt(valorStr, 10)
                            const valorReais = valorCentavos / 100

                            // Formata com separadores de milhar
                            const valorFormatado = formatarNumeroComMilhar(valorReais)

                            // Atualiza o estado de edição com o valor formatado
                            setValoresEmEdicao(prev => ({
                              ...prev,
                              [index]: valorFormatado,
                            }))

                            // Atualiza o valor do produto
                            atualizarProduto(index, 'valorUnitario', valorReais)
                          }}
                          onFocus={e => {
                            // Ao focar, mantém o valor formatado (ex: "8,00" ou "1.000.000,00")
                            const valorAtual = produto.valorUnitario
                            if (valorAtual > 0) {
                              const valorFormatado = formatarNumeroComMilhar(valorAtual)
                              setValoresEmEdicao(prev => ({
                                ...prev,
                                [index]: valorFormatado,
                              }))
                            } else {
                              setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                            }
                            // Seleciona todo o texto para facilitar substituição
                            setTimeout(() => e.target.select(), 0)
                          }}
                          onBlur={e => {
                            // Garante formatação correta ao perder o foco
                            const valor = produto.valorUnitario
                            if (valor > 0) {
                              const valorFormatado = formatarNumeroComMilhar(valor)
                              setValoresEmEdicao(prev => ({
                                ...prev,
                                [index]: valorFormatado,
                              }))
                              // Remove do estado após um pequeno delay para mostrar formato final
                              setTimeout(() => {
                                setValoresEmEdicao(prev => {
                                  const novo = { ...prev }
                                  delete novo[index]
                                  return novo
                                })
                              }, 100)
                            } else {
                              // Remove do estado se vazio
                              setValoresEmEdicao(prev => {
                                const novo = { ...prev }
                                delete novo[index]
                                return novo
                              })
                            }
                          }}
                          placeholder="0,00"
                          style={{
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                          }}
                          className="h-7 w-full min-w-0 whitespace-nowrap border-0 bg-transparent px-0.5 py-0 text-right text-xs tabular-nums focus:bg-white focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {/* Total */}
                      <div className="w-[7.5rem] flex-shrink-0 sm:w-[8rem]">
                        <span className="block whitespace-nowrap text-right text-xs font-semibold tabular-nums text-gray-900">
                          R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                        </span>
                      </div>
                      {/* Ações: colunas fixas (editar | complementos | excluir) */}
                      <div
                        className="flex w-[72px] flex-shrink-0 items-center justify-end gap-0"
                        role="group"
                        aria-label="Ações do produto"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <button
                            onClick={() => abrirModalEdicaoProduto(index)}
                            type="button"
                            title="Editar produto"
                            className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-gray-200"
                          >
                            <MdEdit className="h-4 w-4 text-primary" />
                          </button>
                        </div>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          {exibirBotaoComplementos ? (
                            <button
                              onClick={() => abrirModalComplementosProdutoExistente(index)}
                              type="button"
                              className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-gray-200"
                              title="Complementos (editar ou vincular)"
                            >
                              <MdLaunch className="h-4 w-4 text-primary" />
                            </button>
                          ) : (
                            <span className="block h-6 w-6 shrink-0" aria-hidden />
                          )}
                        </div>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                          <button
                            onClick={() => removerProduto(index)}
                            type="button"
                            title="Remover produto"
                            className="flex h-6 w-6 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-100"
                          >
                            <MdDelete className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Linhas dos Complementos */}
                    {produto.complementos.map((complemento, compIndex) => {
                      const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                      const valorEmEdicao = valoresEmEdicao[compKey]

                      return (
                        <div
                          key={compKey}
                          className={`-mt-0 flex min-w-0 items-center gap-0.5 rounded ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } cursor-pointer hover:bg-gray-100`}
                          style={{ minHeight: '22px' }}
                          onMouseDown={e => {
                            // Iniciar long press apenas se não for em um input ou button
                            const target = e.target as HTMLElement
                            if (
                              target.tagName === 'INPUT' ||
                              target.tagName === 'BUTTON' ||
                              target.closest('button') ||
                              target.closest('input')
                            ) {
                              return
                            }

                            // Verificar se o produto permite editar complementos
                            const produtoEntity = produtosList.find(
                              p => p.getId() === produto.produtoId
                            )
                            if (!produtoEntity) return

                            longPressComplementoIndexRef.current = index
                            longPressComplementoTimeoutRef.current = setTimeout(() => {
                              if (longPressComplementoIndexRef.current === index) {
                                abrirModalComplementosProdutoExistente(index)
                              }
                            }, 800) // 800ms para long press
                          }}
                          onMouseUp={() => {
                            // Limpar timeout se soltar antes do tempo
                            if (longPressComplementoTimeoutRef.current) {
                              clearTimeout(longPressComplementoTimeoutRef.current)
                              longPressComplementoTimeoutRef.current = null
                            }
                            longPressComplementoIndexRef.current = null
                          }}
                          onMouseLeave={() => {
                            // Limpar timeout se sair da área
                            if (longPressComplementoTimeoutRef.current) {
                              clearTimeout(longPressComplementoTimeoutRef.current)
                              longPressComplementoTimeoutRef.current = null
                            }
                            longPressComplementoIndexRef.current = null
                          }}
                        >
                          {/* Quantidade do Complemento — alinhada à coluna Qtd */}
                          <div className="w-9 flex-shrink-0 pl-2">
                            <input
                              type="number"
                              min={1}
                              value={complemento.quantidade}
                              onChange={e => {
                                const valor = parseInt(e.target.value) || 1
                                atualizarComplemento(
                                  index,
                                  compIndex,
                                  'quantidade',
                                  Math.max(1, valor)
                                )
                              }}
                              style={{
                                MozAppearance: 'textfield',
                                WebkitAppearance: 'none',
                                appearance: 'none',
                              }}
                              className="h-5 w-full min-w-0 border-0 bg-transparent px-0.5 py-0 text-right text-xs tabular-nums focus:bg-white focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                          {/* Nome do Complemento com indentação */}
                          <div className="min-w-0 flex-1 pl-2">
                            <span className="block truncate text-xs leading-tight text-gray-600">
                              {complemento.nome}
                            </span>
                          </div>
                          {/* Espaço reservado à coluna Desc./Acres. */}
                          <div className="w-[6.75rem] flex-shrink-0 sm:w-[7rem]" aria-hidden />
                          {/* Valor Unitário do Complemento */}
                          <div className="w-[6.75rem] flex-shrink-0 sm:w-[7.25rem]">
                            <span className="block whitespace-nowrap text-right text-xs tabular-nums leading-tight text-gray-600">
                              {formatarValorComplemento(
                                complemento.valor,
                                complemento.tipoImpactoPreco
                              )}
                            </span>
                          </div>
                          {/* Coluna Total vazia nos complementos */}
                          <div className="w-[7.5rem] flex-shrink-0 sm:w-[8rem]" aria-hidden />
                          {/* Mesma grade de ações da linha do produto */}
                          <div className="flex w-[72px] flex-shrink-0 items-center justify-end gap-0.5">
                            <span className="block h-5 w-6 shrink-0" aria-hidden />
                            <span className="block h-5 w-6 shrink-0" aria-hidden />
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                              <button
                                onClick={() => removerComplemento(index, compIndex)}
                                type="button"
                                title="Remover complemento"
                                className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-50"
                              >
                                <MdClear className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
          </div>
        )}
      </div>

      {/* Total do Pedido */}
      <div className="flex flex-shrink-0 items-center justify-end gap-2">
        <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
        <span className="text-lg font-semibold text-primary">
          {transformarParaReal(totalProdutos)}
        </span>
      </div>

      {/* Seção recolhível: Grupos de produtos — ao ocultar, a área de produtos selecionados acima ganha mais altura */}
      <div className="flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50">
        <div
          className="flex items-center justify-between gap-2 border-b border-gray-200/50 px-2 py-1.5"
          role="region"
          aria-label="Cabeçalho dos grupos de produtos"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {grupoSelecionadoId ? (
              <Button
                variant="outlined"
                size="sm"
                onClick={() => setGrupoSelecionadoId(null)}
                type="button"
                className="h-7 shrink-0 gap-1 px-2 py-0"
              >
                <MdArrowBack className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-xs font-medium">Voltar</span>
              </Button>
            ) : null}
            <span className="truncate text-sm font-semibold text-gray-700">Grupos de produtos</span>
            {/* Busca global de produtos */}
            <button
              type="button"
              aria-label="Buscar produtos"
              onClick={() => onAbrirBuscaProdutos?.()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-200/80 hover:text-gray-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MdSearch className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setGruposExpandido(!gruposExpandido)}
            className="flex shrink-0 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-gray-100/80"
            aria-expanded={gruposExpandido}
          >
            {gruposExpandido ? (
              <>
                <span className="text-xs text-gray-500">Ocultar Grupos</span>
                <MdExpandLess className="h-5 w-5 flex-shrink-0 text-gray-600" />
              </>
            ) : (
              <>
                <span className="text-xs text-gray-500">Mostrar grupos</span>
                <MdExpandMore className="h-5 w-5 flex-shrink-0 text-gray-600" />
              </>
            )}
          </button>
        </div>
        {gruposExpandido && (
          <div className="space-y-1.5 px-2 pb-2 pt-0.5">
            {/* Grid ou Lista Horizontal de Grupos */}
            <div className="space-y-1.5">
              {!grupoSelecionadoId ? (
                <Label className="text-sm text-gray-600">Selecione um grupo:</Label>
              ) : null}
              {isLoadingGrupos ? (
                <div className="py-4 text-center text-gray-500">
                  <JiffyLoading />
                </div>
              ) : grupos.length === 0 ? (
                <div className="py-4 text-center text-gray-500">Nenhum grupo encontrado</div>
              ) : !grupoSelecionadoId ? (
                // Grid de Grupos (quando nenhum grupo está selecionado)
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {grupos.map(grupo => {
                    const corHex = grupo.getCorHex()
                    const iconName = grupo.getIconName()
                    return (
                      <div key={grupo.getId()} className="relative">
                        <button
                          onClick={() => setGrupoSelecionadoId(grupo.getId())}
                          className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 p-1.5 text-center transition-all hover:opacity-80"
                          style={{
                            borderColor: corHex,
                            backgroundColor: `${corHex}15`,
                          }}
                        >
                          <div
                            className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center"
                            style={{
                              borderColor: corHex,
                            }}
                          >
                            <DinamicIcon iconName={iconName} color={corHex} size={34} />
                          </div>
                          <div className="line-clamp-2 w-full overflow-hidden text-ellipsis px-1 text-[10px] font-medium text-gray-900">
                            {grupo.getNome()}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Lista Horizontal de Grupos (quando um grupo está selecionado)
                <div
                  ref={gruposScrollRef}
                  className="scrollbar-thin flex cursor-grab select-none gap-2 overflow-x-auto pb-1.5 active:cursor-grabbing"
                  style={{ scrollbarWidth: 'thin' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  {grupos.map(grupo => {
                    const corHex = grupo.getCorHex()
                    const iconName = grupo.getIconName()
                    const isSelected = grupoSelecionadoId === grupo.getId()
                    return (
                      <div
                        key={grupo.getId()}
                        className="relative flex-shrink-0"
                        style={{ width: '100px' }}
                      >
                        <button
                          onClick={e => {
                            // Só executar o clique se não houve movimento significativo durante o arraste
                            if (!hasMovedRef.current && !isDragging) {
                              setGrupoSelecionadoId(grupo.getId())
                            }
                          }}
                          onMouseDown={e => {
                            // Permitir que o evento propague para o container para iniciar o arraste
                            // O onClick só será executado se não houver movimento
                          }}
                          className="pointer-events-auto flex aspect-square h-full w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 p-1.5 text-center transition-all"
                          style={{
                            borderColor: corHex,
                            backgroundColor: isSelected ? corHex : `${corHex}15`,
                            color: isSelected ? '#ffffff' : '#1f2937',
                          }}
                        >
                          <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center">
                            <DinamicIcon
                              iconName={iconName}
                              color={isSelected ? '#ffffff' : corHex}
                              size={34}
                            />
                          </div>
                          <div className="line-clamp-2 w-full overflow-hidden text-ellipsis px-1 text-[10px] font-medium">
                            {grupo.getNome()}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grid de Produtos do Grupo Selecionado */}
            {grupoSelecionadoId &&
              (() => {
                const grupoSelecionado = grupos.find(g => g.getId() === grupoSelecionadoId)
                const corHexGrupo = grupoSelecionado?.getCorHex() || '#6b7280'
                return (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600">
                      Produtos do grupo:{' '}
                      <span className="font-semibold">{grupoSelecionado?.getNome()}</span>
                    </Label>
                    {isLoadingProdutos ? (
                      <div className="py-4 text-center text-gray-500">
                        <JiffyLoading />
                      </div>
                    ) : produtosError ? (
                      <div className="py-4 text-center text-red-500">
                        Erro ao carregar produtos:{' '}
                        {produtosError instanceof Error
                          ? produtosError.message
                          : 'Erro desconhecido'}
                      </div>
                    ) : produtosList.length === 0 ? (
                      <div className="py-4 text-center text-gray-500">
                        Nenhum produto encontrado neste grupo
                      </div>
                    ) : (
                      <div
                        className="grid max-h-60 grid-cols-3 gap-1.5 overflow-y-auto rounded-lg border p-1 sm:grid-cols-4 md:grid-cols-6"
                        style={{
                          backgroundColor: `${corHexGrupo}15`,
                        }}
                      >
                        {produtosList.map(produto => {
                          return (
                            <div
                              key={produto.getId()}
                              className="relative aspect-square w-full min-w-0"
                            >
                              <button
                                type="button"
                                onClick={() => adicionarProduto(produto.getId())}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = corHexGrupo
                                  e.currentTarget.style.backgroundColor = '#ffffff'
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = corHexGrupo
                                  e.currentTarget.style.backgroundColor = '#ffffff'
                                }}
                                className="flex h-full min-h-0 w-full flex-col items-stretch overflow-hidden rounded-lg border-2 p-1 text-center transition-all"
                                style={{
                                  borderColor: corHexGrupo,
                                  backgroundColor: '#ffffff',
                                }}
                              >
                                {/* Quebra em espaços (palavra inteira na linha seguinte); até 3 linhas + ... */}
                                <div className="flex min-h-0 flex-1 flex-col justify-center px-0.5">
                                  <p className="line-clamp-3 w-full max-w-full break-normal text-center text-[10px] font-medium leading-tight text-gray-900">
                                    {produto.getNome()}
                                  </p>
                                </div>
                                <div className="mt-auto shrink-0 text-[10px] font-semibold tabular-nums text-primary-text">
                                  {transformarParaReal(produto.getValor())}
                                </div>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}
          </div>
        )}
      </div>
    </div>
  )
}
