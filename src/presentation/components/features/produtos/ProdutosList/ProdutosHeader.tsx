'use client'

import Link from 'next/link'
import { MdSearch } from 'react-icons/md'

interface ProdutosHeaderProps {
  totalLocal: number
  totalApi: number
  searchText: string
  onSearchChange: (value: string) => void
  onNovoProduto: () => void
}

export function ProdutosHeader({
  totalLocal,
  totalApi,
  searchText,
  onSearchChange,
  onNovoProduto,
}: ProdutosHeaderProps) {
  return (
    <div className="md:px-[30px] px-1 flex-shrink-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="mb-1">
            <p className="text-primary text-sm font-semibold font-nunito">Produtos Cadastrados</p>
            <p className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
              Total {totalLocal} de {totalApi}
            </p>
          </div>

          <div className="flex flex-row max-w-[350px] mb-1 ml-6 gap-1 items-center">
            <div className="relative h-8 w-full">
              <MdSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
                size={18}
              />
              <input
                id="produtos-search"
                type="text"
                placeholder="Pesquisar produto..."
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row mb-2 items-center justify-end flex-1 md:gap-4 gap-1">
            <Link
              href="/produtos/atualizar-produtos-lote"
              className="md:h-8 h-6 md:px-4 px-2 bg-info text-primary-text border border-primary/50 rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center gap-2 hover:bg-primary/10 transition-colors"
            >
              Produtos em Lote
            </Link>
            <button
              type="button"
              onClick={onNovoProduto}
              className="md:h-8 h-6 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
