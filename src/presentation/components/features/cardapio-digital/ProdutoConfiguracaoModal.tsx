'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import Image from 'next/image'
import { MdClose, MdAdd, MdRemove, MdCheck, MdArrowForward } from 'react-icons/md'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'
import { getProdutoImagem } from '@/src/presentation/utils/produtoImagens'

interface GrupoComplemento {
  id: string
  nome: string
  complementos: Complemento[]
  obrigatorio: boolean
  qtdMinima: number
  qtdMaxima: number
}

interface ComplementoSelecionado {
  complementoId: string
  quantidade: number
}

interface ProdutoConfiguracaoModalProps {
  produto: Produto
  mesaId: string
  onClose: () => void
  onAdicionado: () => void
}

type PassoAtual = 1 | 2 | 3

/**
 * Modal de configuração do produto para cardápio digital
 * Layout em etapas: Observação -> Remover -> Acrescentar
 */
export default function ProdutoConfiguracaoModal({
  produto,
  mesaId,
  onClose,
  onAdicionado,
}: ProdutoConfiguracaoModalProps) {
  const { auth } = useAuthStore()
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [gruposComplementos, setGruposComplementos] = useState<GrupoComplemento[]>([])
  const [complementosRemovidos, setComplementosRemovidos] = useState<Record<string, ComplementoSelecionado>>({})
  const [complementosAdicionados, setComplementosAdicionados] = useState<Record<string, ComplementoSelecionado>>({})
  const [isLoadingComplementos, setIsLoadingComplementos] = useState(false)
  const [passoAtual, setPassoAtual] = useState<PassoAtual>(1)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const nome = produto.getNome()
  const valorBase = produto.getValor()
  const ativo = produto.isAtivo()
  // Busca a imagem do produto: primeiro tenta do backend, depois do mapeamento manual
  const imagemUrlBackend = undefined // produto.getImagemUrl?.() || undefined (quando backend estiver pronto)
  const imagemUrl = getProdutoImagem(produto.getId(), imagemUrlBackend)
  const descricao = produto.getDescricao()

  // Carregar complementos do produto
  useEffect(() => {
    const loadComplementos = async () => {
      if (!produto.getId() || !auth?.getAccessToken()) {
        return
      }

      setIsLoadingComplementos(true)
      try {
        const token = auth.getAccessToken()
        const response = await fetch(`/api/produtos/${produto.getId()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar complementos')
        }

        const produtoData = await response.json()
        const grupos: GrupoComplemento[] = (produtoData.gruposComplementos || []).map((grupo: any) => ({
          id: grupo.id,
          nome: grupo.nome,
          complementos: (grupo.complementos || []).map((item: any) => Complemento.fromJSON(item)),
          obrigatorio: Boolean(grupo.obrigatorio),
          qtdMinima:
            typeof grupo.qtdMinima === 'number'
              ? grupo.qtdMinima
              : grupo.obrigatorio
                ? 1
                : 0,
          qtdMaxima: typeof grupo.qtdMaxima === 'number' && grupo.qtdMaxima > 0 ? grupo.qtdMaxima : 0,
        }))

        setGruposComplementos(grupos)
        setExpandedGroups(
          grupos.reduce((acc, grupo) => {
            acc[grupo.id] = true
            return acc
          }, {} as Record<string, boolean>)
        )

        // Inicializar complementos removidos com os complementos padrão do produto (se houver)
        // Por enquanto, começamos vazio
      } catch (error) {
        console.error('Erro ao carregar complementos:', error)
        showToast.error('Erro ao carregar complementos do produto')
      } finally {
        setIsLoadingComplementos(false)
      }
    }

    loadComplementos()
  }, [produto, auth])

  // Calcular valor total
  const calcularValorTotal = useCallback(() => {
    let valorComplementosAdicionados = 0

    Object.values(complementosAdicionados).forEach((sel) => {
      const complemento = gruposComplementos
        .flatMap((g) => g.complementos)
        .find((c) => c.getId() === sel.complementoId)

      if (complemento) {
        valorComplementosAdicionados += complemento.getValor() * sel.quantidade
      }
    })

    const valorUnitario = valorBase + valorComplementosAdicionados
    return valorUnitario * quantidade
  }, [valorBase, quantidade, complementosAdicionados, gruposComplementos])

  const valorTotal = calcularValorTotal()

  // Verificar se há seleções no passo atual
  const temSelecaoNoPasso = (): boolean => {
    switch (passoAtual) {
      case 1:
        return observacoes.trim().length > 0
      case 2:
        return Object.keys(complementosRemovidos).length > 0
      case 3:
        return Object.keys(complementosAdicionados).length > 0
      default:
        return false
    }
  }

  // Toggle complemento para remover
  const toggleComplementoRemover = (complementoId: string) => {
    if (complementosRemovidos[complementoId]) {
      const newRemovidos = { ...complementosRemovidos }
      delete newRemovidos[complementoId]
      setComplementosRemovidos(newRemovidos)
    } else {
      const complemento = gruposComplementos
        .flatMap((g) => g.complementos)
        .find((c) => c.getId() === complementoId)

      if (complemento) {
        setComplementosRemovidos({
          ...complementosRemovidos,
          [complementoId]: {
            complementoId,
            quantidade: 1,
          },
        })
      }
    }
  }

  // Toggle complemento para adicionar
  const toggleComplementoAdicionar = (complementoId: string, grupo: GrupoComplemento) => {
    if (complementosAdicionados[complementoId]) {
      const newAdicionados = { ...complementosAdicionados }
      delete newAdicionados[complementoId]
      setComplementosAdicionados(newAdicionados)
    } else {
      const qtdMaxima = grupo.qtdMaxima > 0 ? grupo.qtdMaxima : 999
      setComplementosAdicionados({
        ...complementosAdicionados,
        [complementoId]: {
          complementoId,
          quantidade: Math.min(1, qtdMaxima),
        },
      })
    }
  }

  // Ajustar quantidade de complemento adicionado
  const ajustarQuantidadeComplementoAdicionado = (complementoId: string, delta: number, grupo: GrupoComplemento) => {
    const current = complementosAdicionados[complementoId]
    if (!current) return

    const novaQuantidade = Math.max(
      grupo.qtdMinima,
      Math.min(grupo.qtdMaxima > 0 ? grupo.qtdMaxima : 999, current.quantidade + delta)
    )

    if (novaQuantidade <= grupo.qtdMinima && grupo.qtdMinima === 0) {
      const newAdicionados = { ...complementosAdicionados }
      delete newAdicionados[complementoId]
      setComplementosAdicionados(newAdicionados)
    } else {
      setComplementosAdicionados({
        ...complementosAdicionados,
        [complementoId]: {
          ...current,
          quantidade: novaQuantidade,
        },
      })
    }
  }

  // Avançar para próximo passo
  const avancarPasso = () => {
    if (passoAtual < 3) {
      setPassoAtual((passoAtual + 1) as PassoAtual)
    } else {
      handleAdicionarAoCarrinho()
    }
  }

  // Pular passo
  const pularPasso = () => {
    if (passoAtual < 3) {
      setPassoAtual((passoAtual + 1) as PassoAtual)
    }
  }

  const handleAdicionarAoCarrinho = async () => {
    if (!ativo) {
      showToast.error('Produto indisponível')
      return
    }

    setAdicionando(true)
    try {
      const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId

      // Salvar dados do produto no cache
      const produtoCache = {
        nome: produto.getNome(),
        valor: produto.getValor(),
        imagemUrl: undefined,
      }
      localStorage.setItem(`produto_cache_${produto.getId()}`, JSON.stringify(produtoCache))

      // Converter complementos adicionados para array
      const complementosArray = Object.values(complementosAdicionados).map((sel) => {
        const complemento = gruposComplementos
          .flatMap((g) => g.complementos)
          .find((c) => c.getId() === sel.complementoId)

        return {
          complementoId: sel.complementoId,
          complementoNome: complemento ? complemento.getNome() : '',
          quantidade: sel.quantidade,
          valorAdicional: complemento ? complemento.getValor() * sel.quantidade : 0,
        }
      })

      // Converter complementos removidos para array
      const complementosRemovidosArray = Object.values(complementosRemovidos).map((sel) => {
        const complemento = gruposComplementos
          .flatMap((g) => g.complementos)
          .find((c) => c.getId() === sel.complementoId)

        return {
          complementoId: sel.complementoId,
          complementoNome: complemento ? complemento.getNome() : '',
          quantidade: sel.quantidade,
          valor: complemento ? complemento.getValor() : 0,
        }
      })

      await adicionarItemCarrinho(
        sessionId,
        produto.getId(),
        quantidade,
        complementosArray,
        observacoes,
        complementosRemovidosArray
      )
      showToast.success('Produto adicionado ao carrinho!')
      onAdicionado()
      onClose()
    } catch (error) {
      showToast.error('Erro ao adicionar produto ao carrinho')
      console.error('Erro:', error)
    } finally {
      setAdicionando(false)
    }
  }

  const passos = [
    {
      numero: 1,
      titulo: 'Faça uma observação ao pedido',
      descricao: 'Ex: Carne bem passada, Não esquentar o pão, etc.',
    },
    {
      numero: 2,
      titulo: `Deseja retirar do seu "${nome}"?`,
      descricao: 'Selecione os itens que deseja remover',
    },
    {
      numero: 3,
      titulo: `Deseja Acrescentar no seu "${nome}"?`,
      descricao: 'Selecione os itens que deseja adicionar',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header com botão fechar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Personalizar Pedido</h2>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
          >
            <MdClose className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Conteúdo Principal - Layout em 2 colunas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna Esquerda - Informações do Produto e Passos */}
          <div className="w-80 border-r border-gray-200 flex flex-col overflow-y-auto">
            {/* Imagem do Produto */}
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
              {imagemUrl ? (
                <Image
                  src={imagemUrl}
                  alt={nome}
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-5xl">📦</span>
                  </div>
                </div>
              )}
            </div>

            {/* Nome e Descrição */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{nome}</h3>
              {descricao ? (
                <p className="text-sm text-gray-600">{descricao}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Produto disponível no cardápio</p>
              )}
            </div>

            {/* Quantidade */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantidade</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                  className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
                  disabled={quantidade <= 1}
                >
                  <MdRemove className="w-5 h-5 text-gray-700" />
                </button>
                <span className="text-xl font-bold text-gray-900 w-12 text-center">{quantidade}</span>
                <button
                  onClick={() => setQuantidade(quantidade + 1)}
                  className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
                >
                  <MdAdd className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Lista de Passos */}
            <div className="flex-1 p-4 space-y-3">
              {passos.map((passo) => {
                const isAtivo = passo.numero === passoAtual
                const isCompleto = passo.numero < passoAtual

                return (
                  <div
                    key={passo.numero}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      isAtivo
                        ? 'border-primary bg-primary/5'
                        : isCompleto
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPassoAtual(passo.numero as PassoAtual)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                          isAtivo
                            ? 'bg-primary text-white'
                            : isCompleto
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isCompleto ? <MdCheck className="w-5 h-5" /> : passo.numero}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold mb-1 ${
                            isAtivo ? 'text-primary' : isCompleto ? 'text-green-700' : 'text-gray-700'
                          }`}
                        >
                          {passo.titulo}
                        </p>
                        <p className="text-xs text-gray-500">{passo.descricao}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold text-primary">{formatarPreco(valorTotal)}</span>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Área de Configuração */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingComplementos ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Passo 1: Observação */}
                {passoAtual === 1 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {passos[0].titulo}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{passos[0].descricao}</p>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Digite suas observações aqui..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows={6}
                    />
                  </div>
                )}

                {/* Passo 2: Remover Complementos */}
                {passoAtual === 2 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {passos[1].titulo}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{passos[1].descricao}</p>
                    {gruposComplementos.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        Este produto não possui complementos para remover.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {gruposComplementos.map((grupo) => {
                          const isExpanded = expandedGroups[grupo.id] ?? true

                          return (
                            <div key={grupo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() =>
                                  setExpandedGroups({ ...expandedGroups, [grupo.id]: !isExpanded })
                                }
                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                              >
                                <span className="font-semibold text-gray-900">{grupo.nome}</span>
                                {isExpanded ? (
                                  <MdRemove className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <MdAdd className="w-5 h-5 text-gray-600" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-4 space-y-2">
                                  {grupo.complementos.map((complemento) => {
                                    const isRemovido = !!complementosRemovidos[complemento.getId()]

                                    return (
                                      <div
                                        key={complemento.getId()}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                          isRemovido
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        <button
                                          onClick={() => toggleComplementoRemover(complemento.getId())}
                                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                            isRemovido
                                              ? 'border-red-500 bg-red-500 text-white'
                                              : 'border-gray-300'
                                          }`}
                                        >
                                          {isRemovido && <MdCheck className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900">{complemento.getNome()}</p>
                                          <p className="text-sm text-gray-600">
                                            {formatarPreco(complemento.getValor())}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Passo 3: Adicionar Complementos */}
                {passoAtual === 3 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {passos[2].titulo}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{passos[2].descricao}</p>
                    {gruposComplementos.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        Este produto não possui complementos disponíveis.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {gruposComplementos.map((grupo) => {
                          const isExpanded = expandedGroups[grupo.id] ?? true

                          return (
                            <div key={grupo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() =>
                                  setExpandedGroups({ ...expandedGroups, [grupo.id]: !isExpanded })
                                }
                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">{grupo.nome}</span>
                                  {grupo.obrigatorio && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Obrigatório
                                    </span>
                                  )}
                                </div>
                                {isExpanded ? (
                                  <MdRemove className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <MdAdd className="w-5 h-5 text-gray-600" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-4 space-y-2">
                                  {grupo.complementos.map((complemento) => {
                                    const isAdicionado = !!complementosAdicionados[complemento.getId()]
                                    const qtdSelecionada = complementosAdicionados[complemento.getId()]?.quantidade || 0

                                    return (
                                      <div
                                        key={complemento.getId()}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                          isAdicionado
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        <button
                                          onClick={() => toggleComplementoAdicionar(complemento.getId(), grupo)}
                                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                            isAdicionado
                                              ? 'border-primary bg-primary text-white'
                                              : 'border-gray-300'
                                          }`}
                                        >
                                          {isAdicionado && <MdCheck className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900">{complemento.getNome()}</p>
                                          <p className="text-sm text-gray-600">
                                            {formatarPreco(complemento.getValor())}
                                          </p>
                                        </div>

                                        {isAdicionado && (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() =>
                                                ajustarQuantidadeComplementoAdicionado(
                                                  complemento.getId(),
                                                  -1,
                                                  grupo
                                                )
                                              }
                                              className="bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
                                              disabled={qtdSelecionada <= grupo.qtdMinima && grupo.qtdMinima > 0}
                                            >
                                              <MdRemove className="w-4 h-4 text-gray-700" />
                                            </button>
                                            <span className="w-8 text-center font-semibold text-gray-900">
                                              {qtdSelecionada}
                                            </span>
                                            <button
                                              onClick={() =>
                                                ajustarQuantidadeComplementoAdicionado(
                                                  complemento.getId(),
                                                  1,
                                                  grupo
                                                )
                                              }
                                              className="bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
                                              disabled={grupo.qtdMaxima > 0 && qtdSelecionada >= grupo.qtdMaxima}
                                            >
                                              <MdAdd className="w-4 h-4 text-gray-700" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer com Botões */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {temSelecaoNoPasso() ? (
              <button
                onClick={avancarPasso}
                disabled={adicionando}
                className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {passoAtual === 3 ? (
                  <>
                    {adicionando ? 'Adicionando...' : 'Concluir'}
                  </>
                ) : (
                  <>
                    Próximo
                    <MdArrowForward className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={pularPasso}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                {passoAtual === 3 ? 'Concluir sem adicionar' : 'Pular'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
