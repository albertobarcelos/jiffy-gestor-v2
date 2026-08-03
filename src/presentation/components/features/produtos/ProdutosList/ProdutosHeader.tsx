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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="mb-1">
            <p className="text-sm font-semibold text-primary">Produtos Cadastrados</p>
            <p className="text-sm font-medium text-tertiary md:text-[22px]">
              Total {totalLocal} de {totalApi}
            </p>
          </div>

          <div className="mb-1 ml-0 w-full max-w-[350px] md:ml-6">
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

          <div className="mb-1 flex flex-1 flex-col items-stretch justify-end gap-1 md:flex-row md:items-center md:gap-3">
            <Link
              href="/produtos/atualizar-produtos-lote"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/50 bg-info px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/10 md:px-4 md:text-sm"
            >
              Produtos em Lote
            </Link>
            <button
              type="button"
              onClick={onNovoProduto}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-5 text-xs font-semibold text-info transition-colors hover:bg-primary/90 md:text-sm"
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
