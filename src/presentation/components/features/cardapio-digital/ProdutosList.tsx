'use client'

import { useState } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import ProdutoCard from './ProdutoCard'
import ProdutoDetalhesModal from './ProdutoDetalhesModal'

interface ProdutosListProps {
  produtos: Produto[]
  mesaId: string
}

/**
 * Lista de produtos do cardápio
 * Grid responsivo com cards premium
 */
export default function ProdutosList({ produtos, mesaId }: ProdutosListProps) {
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {produtos.map((produto, index) => (
          <div
            key={produto.getId()}
            style={{
              animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
            }}
          >
            <ProdutoCard
              produto={produto}
              onDetalhes={() => setProdutoSelecionado(produto)}
            />
          </div>
        ))}
      </div>

      {/* Modal de Detalhes */}
      {produtoSelecionado && (
        <ProdutoDetalhesModal
          produto={produtoSelecionado}
          mesaId={mesaId}
          onClose={() => setProdutoSelecionado(null)}
        />
      )}
    </>
  )
}
