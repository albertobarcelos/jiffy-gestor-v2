'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Button } from '@/src/presentation/components/ui/button'
import { ConfigurarNcmModal } from './ConfigurarNcmModal'

interface ProdutoFiscal {
  id: string
  produtoId: string
  ncm: string
  cest?: string
  origemMercadoria?: number
  tipoProduto?: string
  indicadorProducaoEscala?: string
  criadoEm: string
  atualizadoEm: string
}

export function MapearProdutosView() {
  const { auth } = useAuthStore()
  const [produtosFiscais, setProdutosFiscais] = useState<ProdutoFiscal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduto, setSelectedProduto] = useState<ProdutoFiscal | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadProdutosFiscais()
  }, [])

  const loadProdutosFiscais = async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/produtos-fiscais', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao carregar produtos fiscais')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setProdutosFiscais(result.data.produtos || [])
      }
    } catch (error: any) {
      console.error('Erro ao carregar produtos fiscais:', error)
      showToast.error(error.message || 'Erro ao carregar produtos fiscais')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDoubleClick = (produto: ProdutoFiscal) => {
    setSelectedProduto(produto)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedProduto(null)
  }

  const handleModalSuccess = () => {
    loadProdutosFiscais()
    handleModalClose()
  }

  const formatarData = (dataISO: string): string => {
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR')
  }

  const getOrigemLabel = (origem?: number): string => {
    if (origem === undefined || origem === null) return '--'
    const labels: { [key: number]: string } = {
      0: 'Nacional',
      1: 'Estrangeira - Importação direta',
      2: 'Estrangeira - Adquirida no mercado interno',
      3: 'Nacional - Mercadoria com >40% de conteúdo estrangeiro',
      4: 'Nacional - Produzida em conformidade com processos produtivos',
      5: 'Nacional - Mercadoria com <40% de conteúdo estrangeiro',
      6: 'Estrangeira - Importação direta sem similar nacional',
      7: 'Estrangeira - Adquirida no mercado interno sem similar nacional',
      8: 'Nacional - Mercadoria com >70% de conteúdo estrangeiro',
    }
    return labels[origem] || `Origem ${origem}`
  }

  const getTipoProdutoLabel = (tipo?: string): string => {
    if (!tipo) return '--'
    const labels: { [key: string]: string } = {
      '00': 'Mercadoria para Revenda',
      '01': 'Matéria Prima',
      '02': 'Embalagem',
      '03': 'Produto em Processo',
      '04': 'Produto Acabado',
      '05': 'Subproduto',
      '06': 'Produto Intermediário',
      '07': 'Material de Uso e Consumo',
      '08': 'Ativo Imobilizado',
      '09': 'Serviços',
      '10': 'Outros Insumos',
      '99': 'Outros',
      'KT': 'Kit',
    }
    return labels[tipo] || tipo
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-secondary-text">Carregando produtos fiscais...</div>
      </div>
    )
  }

  return (
    <>
      <ConfigurarNcmModal
        open={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        produtoFiscal={selectedProduto}
      />

      <div className="flex flex-col h-full w-full p-6 bg-info">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-secondary-text mb-2">
            Mapear Produtos - NCM, CEST e CFOP
          </h2>
          <p className="text-sm text-secondary-text/70">
            Classifique produtos para que notas e impostos sejam calculados corretamente
          </p>
        </div>

        {produtosFiscais.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-secondary-text/70 mb-4">
              Nenhum produto fiscal cadastrado ainda.
            </p>
            <p className="text-sm text-secondary-text/50">
              Os produtos fiscais aparecerão aqui quando forem cadastrados.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="bg-white rounded-lg shadow-sm border border-secondary/10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Produto ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        NCM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        CEST
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Origem
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Tipo Produto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Atualizado em
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/10">
                    {produtosFiscais.map((produto) => (
                      <tr
                        key={produto.id}
                        onDoubleClick={() => handleDoubleClick(produto)}
                        className="hover:bg-secondary/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {produto.produtoId}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {produto.ncm || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {produto.cest || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {getOrigemLabel(produto.origemMercadoria)}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {getTipoProdutoLabel(produto.tipoProduto)}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text/70">
                          {formatarData(produto.atualizadoEm)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 text-sm text-secondary-text/70">
              <p>💡 Dica: Dê duplo clique em um produto para configurá-lo</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
