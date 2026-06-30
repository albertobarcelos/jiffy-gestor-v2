'use client'

import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { MdSearch } from 'react-icons/md'
import { Input } from '@/src/presentation/components/ui/input'
import {
  sxEntradaCompactaProduto,
  sxEntradaCompactaProdutoSelect,
} from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { FILTRO_COLUNA_TODOS, LABEL_FILTRO_COLUNA } from '../constants'
import { filtrosDisponiveisPorAba } from '../rules/produtosLoteFiltros'
import type { FiltroColunaVazia, TabPainelLote } from '../types'

export interface LoteFiltrosProps {
  activeTab: TabPainelLote
  searchText: string
  onSearchTextChange: (value: string) => void
  filterStatus: 'Todos' | 'Ativo' | 'Desativado'
  onFilterStatusChange: (value: 'Todos' | 'Ativo' | 'Desativado') => void
  ativoLocalFilter: 'Todos' | 'Sim' | 'Não'
  onAtivoLocalFilterChange: (value: 'Todos' | 'Sim' | 'Não') => void
  ativoDeliveryFilter: 'Todos' | 'Sim' | 'Não'
  onAtivoDeliveryFilterChange: (value: 'Todos' | 'Sim' | 'Não') => void
  grupoProdutoFilter: string
  onGrupoProdutoFilterChange: (value: string) => void
  filtroColunaVazia: FiltroColunaVazia
  onFiltroColunaVaziaChange: (value: FiltroColunaVazia) => void
  gruposProdutos: GrupoProduto[]
  isLoadingGruposProdutos: boolean
  onClearFilters: () => void
}

export function LoteFiltros({
  activeTab,
  searchText,
  onSearchTextChange,
  filterStatus,
  onFilterStatusChange,
  ativoLocalFilter,
  onAtivoLocalFilterChange,
  ativoDeliveryFilter,
  onAtivoDeliveryFilterChange,
  grupoProdutoFilter,
  onGrupoProdutoFilterChange,
  filtroColunaVazia,
  onFiltroColunaVaziaChange,
  gruposProdutos,
  isLoadingGruposProdutos,
  onClearFilters,
}: LoteFiltrosProps) {
  return (
    <>
      <div className="h-[4px] border-t-2 border-primary/70" />
      <div className="bg-white md:px-[20px] py-2 border-b border-gray-100">
        <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-x-visible md:px-0">
          <div className="flex min-w-max flex-nowrap items-end gap-2 md:min-w-0 md:flex-wrap md:gap-3">
            <div className="w-[min(250px,48vw)] min-w-[152px] shrink-0">
              <Input
                id="precos-search"
                label="Pesquisar"
                size="small"
                value={searchText}
                onChange={(e) => onSearchTextChange(e.target.value)}
                placeholder="Nome ou código"
                className="bg-info"
                sx={{
                  ...sxEntradaCompactaProduto,
                  '& .MuiOutlinedInput-root': { backgroundColor: 'var(--color-info)' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdSearch size={18} className="text-secondary-text" aria-hidden />
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <div className="w-[118px] shrink-0 min-w-[108px]">
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                <InputLabel id="lote-filter-status-label">Status</InputLabel>
                <Select
                  labelId="lote-filter-status-label"
                  label="Status"
                  value={filterStatus}
                  onChange={(e: SelectChangeEvent<string>) =>
                    onFilterStatusChange(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
                  }
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Ativo">Ativo</MenuItem>
                  <MenuItem value="Desativado">Desativado</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-[132px] shrink-0 min-w-[120px]">
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                <InputLabel id="lote-filter-local-label">Ativo no local</InputLabel>
                <Select
                  labelId="lote-filter-local-label"
                  label="Ativo no local"
                  value={ativoLocalFilter}
                  onChange={(e: SelectChangeEvent<string>) =>
                    onAtivoLocalFilterChange(e.target.value as 'Todos' | 'Sim' | 'Não')
                  }
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Sim">Sim</MenuItem>
                  <MenuItem value="Não">Não</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-[148px] shrink-0 min-w-[136px]">
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                <InputLabel id="lote-filter-delivery-label">Ativo no delivery</InputLabel>
                <Select
                  labelId="lote-filter-delivery-label"
                  label="Ativo no delivery"
                  value={ativoDeliveryFilter}
                  onChange={(e: SelectChangeEvent<string>) =>
                    onAtivoDeliveryFilterChange(e.target.value as 'Todos' | 'Sim' | 'Não')
                  }
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Sim">Sim</MenuItem>
                  <MenuItem value="Não">Não</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-[min(220px,38vw)] min-w-[160px] shrink-0 md:max-w-[260px] md:flex-1">
              <FormControl
                fullWidth
                size="small"
                variant="outlined"
                sx={sxEntradaCompactaProdutoSelect}
                disabled={isLoadingGruposProdutos}
              >
                <InputLabel id="lote-filter-grupo-label">Grupo de produtos</InputLabel>
                <Select
                  labelId="lote-filter-grupo-label"
                  label="Grupo de produtos"
                  value={grupoProdutoFilter}
                  onChange={(e: SelectChangeEvent<string>) => onGrupoProdutoFilterChange(e.target.value)}
                >
                  <MenuItem value="">
                    <span className="text-secondary-text">
                      {isLoadingGruposProdutos ? 'Carregando...' : 'Todos'}
                    </span>
                  </MenuItem>
                  {!isLoadingGruposProdutos &&
                    gruposProdutos.map((grupo) => (
                      <MenuItem key={grupo.getId()} value={grupo.getId()}>
                        {grupo.getNome()}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            {filtrosDisponiveisPorAba(activeTab).length > 1 ? (
              <div className="w-[min(280px,88vw)] min-w-[200px] shrink-0">
                <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                  <InputLabel id="lote-filter-coluna-vazia-label">Listar sem dado em</InputLabel>
                  <Select
                    labelId="lote-filter-coluna-vazia-label"
                    label="Listar sem dado em"
                    value={filtroColunaVazia}
                    onChange={(e: SelectChangeEvent<string>) =>
                      onFiltroColunaVaziaChange(e.target.value as FiltroColunaVazia)
                    }
                    MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                    renderValue={(selected) =>
                      LABEL_FILTRO_COLUNA[selected as FiltroColunaVazia] ?? String(selected)
                    }
                  >
                    {(Object.entries(LABEL_FILTRO_COLUNA) as [FiltroColunaVazia, string][])
                      .filter(([key]) => filtrosDisponiveisPorAba(activeTab).includes(key))
                      .map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </div>
            ) : null}

            <div className="shrink-0">
              <button
                type="button"
                onClick={onClearFilters}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-primary-text hover:bg-gray-50"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}