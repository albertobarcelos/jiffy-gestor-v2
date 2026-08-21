'use client'

import Link from 'next/link'
import { InputAdornment, TextField } from '@mui/material'
import { MdSearch } from 'react-icons/md'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'

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
    <div className="flex-shrink-0 px-1 md:px-[30px]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-4">
          <div className="md:mb-1">
            <p className="text-sm font-semibold text-primary">Produtos Cadastrados</p>
            <p className="text-sm font-medium text-tertiary md:text-[22px]">
              Total {totalLocal} de {totalApi}
            </p>
          </div>

          <div className="w-full md:mb-1 md:ml-6 md:max-w-[350px]">
            <TextField
              id="produtos-search"
              size="small"
              fullWidth
              value={searchText}
              onChange={e => onSearchChange(e.target.value)}
              label="Pesquisar"
              placeholder="Nome ou código"
              InputLabelProps={{ shrink: true }}
              sx={{
                ...sxEntradaCompactaProduto,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  height: 32,
                  minHeight: 32,
                },
                '& .MuiOutlinedInput-input': {
                  padding: '4px 8px',
                  fontSize: '0.8125rem',
                },
                '& .MuiInputAdornment-root': {
                  marginRight: '2px',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.8125rem',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdSearch className="text-secondary-text" size={16} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="flex gap-2 md:mb-1 md:flex-1 md:items-center md:justify-end md:gap-3">
            <Link
              href="/produtos/atualizar-produtos-lote"
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-info px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/10 md:h-8 md:flex-none md:px-4 md:text-sm"
            >
              Produtos em Lote
            </Link>
            <button
              type="button"
              onClick={onNovoProduto}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-info transition-colors hover:bg-primary/90 md:h-8 md:flex-none md:px-5 md:text-sm"
            >
              Novo
              <span className="text-base leading-none">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
