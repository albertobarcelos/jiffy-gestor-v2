'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Componente principal de Estoque
 * Replica o design e funcionalidades do Flutter
 */
export function EstoqueView() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida' | 'inventario'>('entrada')
  const [searchText, setSearchText] = useState('')

  return (
    <div className="flex flex-col h-full">
      {/* Header com seções de Movimentação e Produtos */}
      <div className="px-[30px] pt-[30px] pb-[18px]">
        <div className="flex items-start justify-between">
          {/* Seção Movimentação */}
          <div className="flex-1">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Movimentação
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/estoque/entrada')}
                className="h-[38px] px-[26px] bg-primary text-info rounded-[40px] font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <span className="text-lg">📥</span>
                Entrada
              </button>
              <button
                onClick={() => router.push('/estoque/inventario')}
                className="h-[38px] px-[26px] bg-primary text-info rounded-[40px] font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <span className="text-base">📦</span>
                Inventário
              </button>
              <button
                onClick={() => router.push('/estoque/saida')}
                className="h-[38px] px-[26px] bg-primary text-info rounded-[40px] font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <span className="text-base">📤</span>
                Saída
              </button>
            </div>
          </div>

          {/* Seção Produtos */}
          <div className="flex-1 flex flex-col items-end">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Produtos
            </p>
            <button
              onClick={() => router.push('/estoque/produtos')}
              className="h-[38px] px-[26px] bg-primary text-info rounded-[40px] font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <span className="text-lg">📊</span>
              Conferir
            </button>
          </div>
        </div>
      </div>

      {/* Divisor amarelo */}
      <div className="relative">
        <div className="h-[63px] border-t-2 border-alternate"></div>
        <div className="absolute top-3 left-[30px] right-[30px] flex gap-[10px]">
          {/* Barra de pesquisa */}
          <div className="flex-[3]">
            <div className="h-[38px] relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full px-5 pl-12 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                🔍
              </span>
            </div>
          </div>

          {/* Botão Filtrar */}
          <div className="flex-1">
            <button className="h-[40px] px-[30px] rounded-[40px] border-[0.6px] border-secondary bg-info text-secondary font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary-bg transition-colors">
              <span>🔽</span>
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs e conteúdo */}
      <div className="flex-1 overflow-hidden px-[30px] mt-0">
        <div className="h-full bg-info rounded-[10px] flex flex-col">
          {/* Tabs */}
          <div className="border-b border-alternate/20">
            <div className="flex">
              <button
                onClick={() => setActiveTab('entrada')}
                className={`px-6 py-3 font-medium font-exo text-sm transition-colors ${
                  activeTab === 'entrada'
                    ? 'text-alternate border-b-2 border-alternate'
                    : 'text-primary'
                }`}
              >
                Entrada
              </button>
              <button
                onClick={() => setActiveTab('saida')}
                className={`px-6 py-3 font-medium font-exo text-sm transition-colors ${
                  activeTab === 'saida'
                    ? 'text-alternate border-b-2 border-alternate'
                    : 'text-primary'
                }`}
              >
                Saída
              </button>
              <button
                onClick={() => setActiveTab('inventario')}
                className={`px-6 py-3 font-medium font-exo text-sm transition-colors ${
                  activeTab === 'inventario'
                    ? 'text-alternate border-b-2 border-alternate'
                    : 'text-primary'
                }`}
              >
                Inventário
              </button>
            </div>
          </div>

          {/* Conteúdo da tab */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'entrada' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-secondary-text text-lg mb-2">
                    Nenhuma movimentação de entrada encontrada
                  </p>
                  <p className="text-secondary-text text-sm">
                    As movimentações de entrada aparecerão aqui
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'saida' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-secondary-text text-lg mb-2">
                    Nenhuma movimentação de saída encontrada
                  </p>
                  <p className="text-secondary-text text-sm">
                    As movimentações de saída aparecerão aqui
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'inventario' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-secondary-text text-lg mb-2">
                    Nenhum inventário encontrado
                  </p>
                  <p className="text-secondary-text text-sm">
                    Os inventários aparecerão aqui
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

