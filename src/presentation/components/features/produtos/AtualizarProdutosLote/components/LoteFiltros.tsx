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
import { FILTRO_COLUNA_TODOS, FILTRO_NCM_TODOS, FILTRO_NCM_SEM_CADASTRO, LABEL_FILTRO_COLUNA, labelFiltroNcm } from '../constants'
import { filtrosDisponiveisPorAba } from '../rules/produtosLoteFiltros'
import type { FiltroColunaVazia, TabPainelLote } from '../types'

/** Evita a borda outlined cortar o texto do label em campos estreitos. */
const sxLoteFiltrosSelect = {
  ...sxEntradaCompactaProdutoSelect,
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
    backgroundColor: '#fff',
    paddingLeft: '4px',
    paddingRight: '4px',
  },
} as const

const sxLoteFiltrosPesquisar = {
  ...sxEntradaCompactaProduto,
  '& .MuiOutlinedInput-root': { backgroundColor: 'var(--color-info)' },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
    backgroundColor: 'var(--color-info)',
    paddingLeft: '4px',
    paddingRight: '4px',
  },
} as const

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
  filtroNcm: string
  onFiltroNcmChange: (value: string) => void
  ncmsCadastrados: string[]
  isLoadingNcmsCadastrados: boolean
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
  filtroNcm,
  onFiltroNcmChange,
  ncmsCadastrados,
  isLoadingNcmsCadastrados,
  gruposProdutos,
  isLoadingGruposProdutos,
  onClearFilters,
}: LoteFiltrosProps) {
  return (
    <>
      <div className="h-[4px] border-t-2 border-primary/70" />
      <div className="bg-white md:px-[20px] pt-3 pb-2 border-b border-gray-100">
        <div className="-mx-1 overflow-x-auto overflow-y-visible px-1 pt-1 md:mx-0 md:px-0">
          <div className="flex min-w-max flex-nowrap items-end gap-2 md:gap-2.5">
            <div className="w-[min(168px,40vw)] min-w-[132px] shrink-0">
              <Input
                id="precos-search"
                label="Pesquisar"
                size="small"
                value={searchText}
                onChange={(e) => onSearchTextChange(e.target.value)}
                placeholder="Nome ou código"
                className="bg-info"
                InputLabelProps={{ shrink: true }}
                sx={sxLoteFiltrosPesquisar}
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
              <FormControl fullWidth size="small" variant="outlined" sx={sxLoteFiltrosSelect}>
                <InputLabel id="lote-filter-status-label" shrink>
                  Status
                </InputLabel>
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
              <FormControl fullWidth size="small" variant="outlined" sx={sxLoteFiltrosSelect}>
                <InputLabel id="lote-filter-local-label" shrink>
                  Ativo no local
                </InputLabel>
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
              <FormControl fullWidth size="small" variant="outlined" sx={sxLoteFiltrosSelect}>
                <InputLabel id="lote-filter-delivery-label" shrink>
                  Ativo no delivery
                </InputLabel>
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

            <div className="w-[176px] shrink-0 min-w-[168px]">
              <FormControl
                fullWidth
                size="small"
                variant="outlined"
                sx={sxLoteFiltrosSelect}
                disabled={isLoadingGruposProdutos}
              >
                <InputLabel id="lote-filter-grupo-label" shrink>
                  Grupo de produtos
                </InputLabel>
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

            {activeTab === 'fiscal' ? (
              <div className="w-[min(176px,36vw)] min-w-[156px] shrink-0">
                <FormControl
                  fullWidth
                  size="small"
                  variant="outlined"
                  sx={sxLoteFiltrosSelect}
                  disabled={isLoadingNcmsCadastrados}
                >
                  <InputLabel id="lote-filter-ncm-label" shrink>
                    Listar por NCM
                  </InputLabel>
                  <Select
                    labelId="lote-filter-ncm-label"
                    label="Listar por NCM"
                    value={filtroNcm}
                    onChange={(e: SelectChangeEvent<string>) => onFiltroNcmChange(e.target.value)}
                    MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                    renderValue={(selected) => labelFiltroNcm(String(selected))}
                  >
                    <MenuItem value={FILTRO_NCM_TODOS}>
                      <span className="text-secondary-text">Todos</span>
                    </MenuItem>
                    <MenuItem value={FILTRO_NCM_SEM_CADASTRO}>Sem NCM</MenuItem>
                    {!isLoadingNcmsCadastrados &&
                      ncmsCadastrados.map((ncm) => (
                        <MenuItem key={ncm} value={ncm}>
                          {ncm}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </div>
            ) : null}

            {activeTab !== 'fiscal' && filtrosDisponiveisPorAba(activeTab).length > 1 ? (
              <div className="w-[min(172px,36vw)] min-w-[156px] shrink-0">
                <FormControl fullWidth size="small" variant="outlined" sx={sxLoteFiltrosSelect}>
                  <InputLabel id="lote-filter-coluna-vazia-label" shrink>
                    Listar sem dado em
                  </InputLabel>
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

            <div className="shrink-0 pb-0.5">
              <button
                type="button"
                onClick={onClearFilters}
                className="h-10 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-primary-text hover:bg-gray-50"
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