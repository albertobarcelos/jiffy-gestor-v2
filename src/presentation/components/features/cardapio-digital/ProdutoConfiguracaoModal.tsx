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
import { CarrinhoItem } from '@/src/infrastructure/api/cardapio/cardapioApiService'

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
  itemCarrinho?: CarrinhoItem // Dados do item do carrinho para pré-preenchimento
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
  itemCarrinho,
}: ProdutoConfiguracaoModalProps) {
  const { auth } = useAuthStore()
  const [quantidade, setQuantidade] = useState(itemCarrinho?.quantidade || 1)
  const [observacoes, setObservacoes] = useState(itemCarrinho?.observacoes || '')
  const [adicionando, setAdicionando] = useState(false)
  const [gruposComplementos, setGruposComplementos] = useState<GrupoComplemento[]>([])
  const [complementosRemovidos, setComplementosRemovidos] = useState<Record<string, ComplementoSelecionado>>({})
  const [complementosAdicionados, setComplementosAdicionados] = useState<Record<string, ComplementoSelecionado>>({})
  const [isLoadingComplementos, setIsLoadingComplementos] = useState(false)
  const [passoAtual, setPassoAtual] = useState<PassoAtual>(1)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [dadosCarregados, setDadosCarregados] = useState(false)

  // Resetar flag quando o produto mudar
  useEffect(() => {
    setDadosCarregados(false)
    setQuantidade(itemCarrinho?.quantidade || 1)
    setObservacoes(itemCarrinho?.observacoes || '')
    setComplementosRemovidos({})
    setComplementosAdicionados({})
  }, [produto.getId(), itemCarrinho?.id])

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

        // Se houver itemCarrinho e ainda não carregamos os dados, pré-preencher os complementos
        if (itemCarrinho && !dadosCarregados) {
          // Pré-preencher complementos adicionados
          const complementosAdicionadosMap: Record<string, ComplementoSelecionado> = {}
          if (itemCarrinho.complementos && itemCarrinho.complementos.length > 0) {
            itemCarrinho.complementos.forEach((comp: any) => {
              // A quantidade do complemento já vem no objeto
              const qtdComplemento = comp.quantidade || 1
              complementosAdicionadosMap[comp.complementoId] = {
                complementoId: comp.complementoId,
                quantidade: qtdComplemento,
              }
            })
          }
          setComplementosAdicionados(complementosAdicionadosMap)

          // Pré-preencher complementos removidos
          const complementosRemovidosMap: Record<string, ComplementoSelecionado> = {}
          if (itemCarrinho.complementosRemovidos && itemCarrinho.complementosRemovidos.length > 0) {
            itemCarrinho.complementosRemovidos.forEach((comp: any) => {
              complementosRemovidosMap[comp.complementoId] = {
                complementoId: comp.complementoId,
                quantidade: comp.quantidade || 1,
              }
            })
          }
          setComplementosRemovidos(complementosRemovidosMap)
          setDadosCarregados(true)
        }
      } catch (error) {
        console.error('Erro ao carregar complementos:', error)
        showToast.error('Erro ao carregar complementos do produto')
      } finally {
        setIsLoadingComplementos(false)
      }
    }

    loadComplementos()
    // Resetar flag quando o produto mudar
    if (produto.getId()) {
      setDadosCarregados(false)
    }
  }, [produto, auth])

  // Calcular valor total
  const calcularValorTotal = useCallback(() => {
    let valorComplementosAdicionados = 0
    let valorComplementosRemovidos = 0

    // Soma valores dos complementos adicionados (apenas os que aumentam o preço)
    Object.values(complementosAdicionados).forEach((sel) => {
      const complemento = gruposComplementos
        .flatMap((g) => g.complementos)
        .find((c) => c.getId() === sel.complementoId)

      if (complemento) {
        const tipoImpacto = complemento.getTipoImpactoPreco()
        // Soma apenas se for "aumenta" ou "nenhum"
        if (tipoImpacto === 'aumenta' || tipoImpacto === 'nenhum') {
          valorComplementosAdicionados += complemento.getValor() * sel.quantidade
        }
      }
    })

    // Subtrai valores dos complementos removidos (apenas os que diminuem o preço)
    Object.values(complementosRemovidos).forEach((sel) => {
      const complemento = gruposComplementos
        .flatMap((g) => g.complementos)
        .find((c) => c.getId() === sel.complementoId)

      if (complemento) {
        const tipoImpacto = complemento.getTipoImpactoPreco()
        // Subtrai apenas se for "diminui"
        if (tipoImpacto === 'diminui') {
          valorComplementosRemovidos += complemento.getValor() * sel.quantidade
        }
      }
    })

    const valorUnitario = valorBase + valorComplementosAdicionados - valorComplementosRemovidos
    return valorUnitario * quantidade
  }, [valorBase, quantidade, complementosAdicionados, complementosRemovidos, gruposComplementos])

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
    } else if (passoAtual === 3) {
      // No passo 3, se não houver seleção, concluir sem adicionar complementos
      handleAdicionarAoCarrinho()
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
        imagemUrl: imagemUrl, // Usa a imagem do mapeamento ou do backend
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
          tipoImpactoPreco: complemento ? complemento.getTipoImpactoPreco() : undefined,
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
          tipoImpactoPreco: complemento ? complemento.getTipoImpactoPreco() : undefined,
        }
      })

      await adicionarItemCarrinho(
        sessionId,
        produto.getId(),
        quantidade,
        complementosArray,
        observacoes,
        complementosRemovidosArray,
        valorTotal // Passa o valor total já calculado no modal
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
      <div
        className="rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--cardapio-card-bg)' }}
      >
        {/* Header com botão fechar */}
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--cardapio-border)' }}
        >
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--cardapio-text-primary)' }}
          >
            Personalizar Pedido
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors"
            style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
            }}
          >
            <MdClose
              className="w-6 h-6"
              style={{ color: 'var(--cardapio-text-secondary)' }}
            />
          </button>
        </div>

        {/* Conteúdo Principal - Layout em 2 colunas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna Esquerda - Informações do Produto e Passos */}
          <div
            className="w-80 flex flex-col overflow-y-auto"
            style={{ borderRight: '1px solid var(--cardapio-border)' }}
          >
            {/* Imagem do Produto */}
            <div
              className="relative h-48 flex-shrink-0"
              style={{
                background: 'linear-gradient(to bottom right, var(--cardapio-bg-secondary), var(--cardapio-bg-tertiary))',
              }}
            >
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
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--cardapio-bg-tertiary)' }}
                  >
                    <span className="text-5xl">📦</span>
                  </div>
                </div>
              )}
            </div>

            {/* Nome e Descrição */}
            <div
              className="p-4"
              style={{ borderBottom: '1px solid var(--cardapio-border)' }}
            >
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                {nome}
              </h3>
              {descricao ? (
                <p
                  className="text-sm"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                >
                  {descricao}
                </p>
              ) : (
                <p
                  className="text-sm italic"
                  style={{ color: 'var(--cardapio-text-tertiary)' }}
                >
                  Produto disponível no cardápio
                </p>
              )}
            </div>

            {/* Quantidade */}
            <div
              className="p-4"
              style={{ borderBottom: '1px solid var(--cardapio-border)' }}
            >
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              >
                Quantidade
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                  className="rounded-full p-2 transition-colors"
                  style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                  }}
                  disabled={quantidade <= 1}
                >
                  <MdRemove
                    className="w-5 h-5"
                    style={{ color: 'var(--cardapio-text-secondary)' }}
                  />
                </button>
                <span
                  className="text-xl font-bold w-12 text-center"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  {quantidade}
                </span>
                <button
                  onClick={() => setQuantidade(quantidade + 1)}
                  className="rounded-full p-2 transition-colors"
                  style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                  }}
                >
                  <MdAdd
                    className="w-5 h-5"
                    style={{ color: 'var(--cardapio-text-secondary)' }}
                  />
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
                    className="p-3 rounded-lg border-2 transition-all cursor-pointer"
                    style={{
                      borderColor: isAtivo
                        ? 'var(--cardapio-accent-primary)'
                        : isCompleto
                          ? 'var(--cardapio-accent-success)'
                          : 'var(--cardapio-border)',
                      backgroundColor: isAtivo
                        ? 'var(--cardapio-bg-secondary)'
                        : isCompleto
                          ? 'var(--cardapio-bg-secondary)'
                          : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isAtivo && !isCompleto) {
                        e.currentTarget.style.borderColor = 'var(--cardapio-border-hover)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAtivo && !isCompleto) {
                        e.currentTarget.style.borderColor = 'var(--cardapio-border)'
                      }
                    }}
                    onClick={() => setPassoAtual(passo.numero as PassoAtual)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{
                          backgroundColor: isAtivo
                            ? 'var(--cardapio-accent-primary)'
                            : isCompleto
                              ? 'var(--cardapio-accent-success)'
                              : 'var(--cardapio-bg-hover)',
                          color: isAtivo || isCompleto
                            ? 'var(--cardapio-btn-primary-text)'
                            : 'var(--cardapio-text-tertiary)',
                        }}
                      >
                        {isCompleto ? <MdCheck className="w-5 h-5" /> : passo.numero}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold mb-1"
                          style={{
                            color: isAtivo
                              ? 'var(--cardapio-accent-primary)'
                              : isCompleto
                                ? 'var(--cardapio-accent-success)'
                                : 'var(--cardapio-text-secondary)',
                          }}
                        >
                          {passo.titulo}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--cardapio-text-tertiary)' }}
                        >
                          {passo.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div
              className="p-4"
              style={{
                borderTop: '1px solid var(--cardapio-border)',
                backgroundColor: 'var(--cardapio-bg-secondary)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-lg font-semibold"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                >
                  Total
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: 'var(--cardapio-accent-primary)' }}
                >
                  {formatarPreco(valorTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Área de Configuração */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingComplementos ? (
              <div className="flex items-center justify-center h-full">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2"
                  style={{ borderColor: 'var(--cardapio-accent-primary)' }}
                ></div>
              </div>
            ) : (
              <>
                {/* Passo 1: Observação */}
                {passoAtual === 1 && (
                  <div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ color: 'var(--cardapio-text-primary)' }}
                    >
                      {passos[0].titulo}
                    </h3>
                    <p
                      className="text-sm mb-4"
                      style={{ color: 'var(--cardapio-text-secondary)' }}
                    >
                      {passos[0].descricao}
                    </p>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Digite suas observações aqui..."
                      className="w-full px-4 py-3 rounded-lg resize-none transition-colors"
                      style={{
                        backgroundColor: 'var(--cardapio-bg-secondary)',
                        borderColor: 'var(--cardapio-border)',
                        color: 'var(--cardapio-text-primary)',
                        borderWidth: '1px',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--cardapio-accent-primary)'
                        e.currentTarget.style.outline = 'none'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--cardapio-border)'
                      }}
                      rows={6}
                    />
                  </div>
                )}

                {/* Passo 2: Remover Complementos */}
                {passoAtual === 2 && (
                  <div>
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ color: 'var(--cardapio-text-primary)' }}
                    >
                      {passos[1].titulo}
                    </h3>
                    <p
                      className="text-sm mb-4"
                      style={{ color: 'var(--cardapio-text-secondary)' }}
                    >
                      {passos[1].descricao}
                    </p>
                    {gruposComplementos.length === 0 ? (
                      <p
                        className="text-center py-8"
                        style={{ color: 'var(--cardapio-text-tertiary)' }}
                      >
                        Este produto não possui complementos para remover.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {gruposComplementos.map((grupo) => {
                          const isExpanded = expandedGroups[grupo.id] ?? true

                          return (
                            <div
                              key={grupo.id}
                              className="rounded-lg overflow-hidden"
                              style={{ border: '1px solid var(--cardapio-border)' }}
                            >
                              <button
                                onClick={() =>
                                  setExpandedGroups({ ...expandedGroups, [grupo.id]: !isExpanded })
                                }
                                className="w-full px-4 py-3 transition-colors flex items-center justify-between"
                                style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-secondary)'
                                }}
                              >
                                <span
                                  className="font-semibold"
                                  style={{ color: 'var(--cardapio-text-primary)' }}
                                >
                                  {grupo.nome}
                                </span>
                                {isExpanded ? (
                                  <MdRemove
                                    className="w-5 h-5"
                                    style={{ color: 'var(--cardapio-text-tertiary)' }}
                                  />
                                ) : (
                                  <MdAdd
                                    className="w-5 h-5"
                                    style={{ color: 'var(--cardapio-text-tertiary)' }}
                                  />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-4 space-y-2">
                                  {grupo.complementos
                                    .filter((complemento) => {
                                      const tipoImpacto = complemento.getTipoImpactoPreco()
                                      // Mostra apenas complementos com tipoImpactoPreco = "nenhum" ou "diminui"
                                      return tipoImpacto === 'nenhum' || tipoImpacto === 'diminui'
                                    })
                                    .map((complemento) => {
                                      const isRemovido = !!complementosRemovidos[complemento.getId()]

                                      return (
                                      <div
                                        key={complemento.getId()}
                                        className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all"
                                        style={{
                                          borderColor: isRemovido
                                            ? 'var(--cardapio-accent-error)'
                                            : 'var(--cardapio-border)',
                                          backgroundColor: isRemovido
                                            ? 'var(--cardapio-bg-secondary)'
                                            : 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isRemovido) {
                                            e.currentTarget.style.borderColor = 'var(--cardapio-border-hover)'
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isRemovido) {
                                            e.currentTarget.style.borderColor = 'var(--cardapio-border)'
                                          }
                                        }}
                                      >
                                        <button
                                          onClick={() => toggleComplementoRemover(complemento.getId())}
                                          className="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                                          style={{
                                            borderColor: isRemovido
                                              ? 'var(--cardapio-accent-error)'
                                              : 'var(--cardapio-border)',
                                            backgroundColor: isRemovido
                                              ? 'var(--cardapio-accent-error)'
                                              : 'transparent',
                                            color: isRemovido
                                              ? 'var(--cardapio-btn-primary-text)'
                                              : 'transparent',
                                          }}
                                        >
                                          {isRemovido && <MdCheck className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1">
                                          <p
                                            className="font-medium"
                                            style={{ color: 'var(--cardapio-text-primary)' }}
                                          >
                                            {complemento.getNome()}
                                          </p>
                                          <p
                                            className="text-sm"
                                            style={{ color: 'var(--cardapio-text-secondary)' }}
                                          >
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
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ color: 'var(--cardapio-text-primary)' }}
                    >
                      {passos[2].titulo}
                    </h3>
                    <p
                      className="text-sm mb-4"
                      style={{ color: 'var(--cardapio-text-secondary)' }}
                    >
                      {passos[2].descricao}
                    </p>
                    {gruposComplementos.length === 0 ? (
                      <p
                        className="text-center py-8"
                        style={{ color: 'var(--cardapio-text-tertiary)' }}
                      >
                        Este produto não possui complementos disponíveis.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {gruposComplementos.map((grupo) => {
                          const isExpanded = expandedGroups[grupo.id] ?? true

                          return (
                            <div
                              key={grupo.id}
                              className="rounded-lg overflow-hidden"
                              style={{ border: '1px solid var(--cardapio-border)' }}
                            >
                              <button
                                onClick={() =>
                                  setExpandedGroups({ ...expandedGroups, [grupo.id]: !isExpanded })
                                }
                                className="w-full px-4 py-3 transition-colors flex items-center justify-between"
                                style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-secondary)'
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="font-semibold"
                                    style={{ color: 'var(--cardapio-text-primary)' }}
                                  >
                                    {grupo.nome}
                                  </span>
                                  {grupo.obrigatorio && (
                                    <span
                                      className="text-xs px-2 py-1 rounded"
                                      style={{
                                        backgroundColor: 'var(--cardapio-accent-error)',
                                        color: 'var(--cardapio-btn-primary-text)',
                                        opacity: 0.9,
                                      }}
                                    >
                                      Obrigatório
                                    </span>
                                  )}
                                </div>
                                {isExpanded ? (
                                  <MdRemove
                                    className="w-5 h-5"
                                    style={{ color: 'var(--cardapio-text-tertiary)' }}
                                  />
                                ) : (
                                  <MdAdd
                                    className="w-5 h-5"
                                    style={{ color: 'var(--cardapio-text-tertiary)' }}
                                  />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-4 space-y-2">
                                  {grupo.complementos
                                    .filter((complemento) => {
                                      const tipoImpacto = complemento.getTipoImpactoPreco()
                                      // Mostra apenas complementos com tipoImpactoPreco = "nenhum" ou "aumenta"
                                      return tipoImpacto === 'nenhum' || tipoImpacto === 'aumenta'
                                    })
                                    .map((complemento) => {
                                      const isAdicionado = !!complementosAdicionados[complemento.getId()]
                                      const qtdSelecionada = complementosAdicionados[complemento.getId()]?.quantidade || 0

                                      return (
                                      <div
                                        key={complemento.getId()}
                                        className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all"
                                        style={{
                                          borderColor: isAdicionado
                                            ? 'var(--cardapio-accent-primary)'
                                            : 'var(--cardapio-border)',
                                          backgroundColor: isAdicionado
                                            ? 'var(--cardapio-bg-secondary)'
                                            : 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isAdicionado) {
                                            e.currentTarget.style.borderColor = 'var(--cardapio-border-hover)'
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isAdicionado) {
                                            e.currentTarget.style.borderColor = 'var(--cardapio-border)'
                                          }
                                        }}
                                      >
                                        <button
                                          onClick={() => toggleComplementoAdicionar(complemento.getId(), grupo)}
                                          className="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                                          style={{
                                            borderColor: isAdicionado
                                              ? 'var(--cardapio-accent-primary)'
                                              : 'var(--cardapio-border)',
                                            backgroundColor: isAdicionado
                                              ? 'var(--cardapio-accent-primary)'
                                              : 'transparent',
                                            color: isAdicionado
                                              ? 'var(--cardapio-btn-primary-text)'
                                              : 'transparent',
                                          }}
                                        >
                                          {isAdicionado && <MdCheck className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1">
                                          <p
                                            className="font-medium"
                                            style={{ color: 'var(--cardapio-text-primary)' }}
                                          >
                                            {complemento.getNome()}
                                          </p>
                                          <p
                                            className="text-sm"
                                            style={{ color: 'var(--cardapio-text-secondary)' }}
                                          >
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
                                              className="rounded-full p-1 transition-colors"
                                              style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                                              }}
                                              disabled={qtdSelecionada <= grupo.qtdMinima && grupo.qtdMinima > 0}
                                            >
                                              <MdRemove
                                                className="w-4 h-4"
                                                style={{ color: 'var(--cardapio-text-secondary)' }}
                                              />
                                            </button>
                                            <span
                                              className="w-8 text-center font-semibold"
                                              style={{ color: 'var(--cardapio-text-primary)' }}
                                            >
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
                                              className="rounded-full p-1 transition-colors"
                                              style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                                              }}
                                              disabled={grupo.qtdMaxima > 0 && qtdSelecionada >= grupo.qtdMaxima}
                                            >
                                              <MdAdd
                                                className="w-4 h-4"
                                                style={{ color: 'var(--cardapio-text-secondary)' }}
                                              />
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
        <div
          className="p-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: '1px solid var(--cardapio-border)' }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg transition-colors font-medium"
            style={{ color: 'var(--cardapio-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {temSelecaoNoPasso() ? (
              <button
                onClick={avancarPasso}
                disabled={adicionando}
                className="px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--cardapio-btn-primary)',
                  color: 'var(--cardapio-btn-primary-text)',
                }}
                onMouseEnter={(e) => {
                  if (!adicionando) {
                    e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!adicionando) {
                    e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-primary)'
                  }
                }}
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
                className="px-6 py-3 rounded-lg font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--cardapio-bg-hover)',
                  color: 'var(--cardapio-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                }}
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
