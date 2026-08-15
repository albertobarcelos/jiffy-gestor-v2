'use client'

import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import type { MenuProdutoTipoFiltro } from '@/src/domain/repositories/IMenuRepository'
import type { StatusFilter, TriState } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutosFilters'
import {
  sxEntradaCompactaProduto,
  sxEntradaCompactaProdutoSelect,
} from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import {
  Autocomplete,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  type SelectChangeEvent,
} from '@mui/material'

export type OpcaoGrupoMenu = {
  id: string
  nome: string
}

interface MenuProdutosFiltersProps {
  filtrosVisiveis: boolean
  isMobile: boolean
  onToggleFiltros: () => void
  filterStatus: StatusFilter
  onFilterStatusChange: (v: StatusFilter) => void
  favoritoFilter: TriState
  onFavoritoChange: (v: TriState) => void
  tipo: MenuProdutoTipoFiltro
  onTipoChange: (v: MenuProdutoTipoFiltro) => void
  grupoProdutoId: string
  onGrupoProdutoChange: (v: string) => void
  gruposDoMenu: OpcaoGrupoMenu[]
  grupoComplementosId: string
  onGrupoComplementoChange: (v: string) => void
  gruposComplementos: GrupoComplemento[]
  isLoadingGruposComplementos: boolean
  onClearFilters: () => void
}

export function MenuProdutosFilters({
  filtrosVisiveis,
  isMobile,
  onToggleFiltros,
  filterStatus,
  onFilterStatusChange,
  favoritoFilter,
  onFavoritoChange,
  tipo,
  onTipoChange,
  grupoProdutoId,
  onGrupoProdutoChange,
  gruposDoMenu,
  grupoComplementosId,
  onGrupoComplementoChange,
  gruposComplementos,
  isLoadingGruposComplementos,
  onClearFilters,
}: MenuProdutosFiltersProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-100 bg-white px-1 md:py-2">
      <div className="mt-2 flex w-full items-center justify-end sm:hidden">
        <button
          type="button"
          onClick={onToggleFiltros}
          className="rounded-md bg-primary px-3 py-1 text-xs text-white shadow-sm"
          aria-expanded={filtrosVisiveis}
        >
          {filtrosVisiveis ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      <div
        className={`hidden flex-wrap items-center gap-2 sm:flex ${
          isMobile && filtrosVisiveis ? '!flex' : ''
        }`}
      >
        <div className="w-full min-w-[120px] sm:w-[132px]">
          <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
            <InputLabel id="menu-produtos-filter-status-label">Status</InputLabel>
            <Select
              labelId="menu-produtos-filter-status-label"
              label="Status"
              value={filterStatus}
              onChange={(e: SelectChangeEvent<string>) =>
                onFilterStatusChange(e.target.value as StatusFilter)
              }
            >
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="Ativo">Ativo</MenuItem>
              <MenuItem value="Desativado">Desativado</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="w-full min-w-[120px] sm:w-[132px]">
          <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
            <InputLabel id="menu-produtos-filter-favorito-label">Favorito</InputLabel>
            <Select
              labelId="menu-produtos-filter-favorito-label"
              label="Favorito"
              value={favoritoFilter}
              onChange={(e: SelectChangeEvent<string>) =>
                onFavoritoChange(e.target.value as TriState)
              }
            >
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="Sim">Sim</MenuItem>
              <MenuItem value="Não">Não</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="w-full min-w-[120px] sm:w-[140px]">
          <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
            <InputLabel id="menu-produtos-filter-tipo-label">Tipo</InputLabel>
            <Select
              labelId="menu-produtos-filter-tipo-label"
              label="Tipo"
              value={tipo}
              onChange={(e: SelectChangeEvent<string>) =>
                onTipoChange(e.target.value as MenuProdutoTipoFiltro)
              }
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="padrao">Padrão</MenuItem>
              <MenuItem value="pizza">Pizza</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="relative z-20 w-full min-w-[180px] sm:w-[220px]">
          <Autocomplete
            id="menu-produtos-filter-grupo"
            size="small"
            options={gruposDoMenu}
            noOptionsText="Nenhum grupo neste cardápio"
            getOptionLabel={grupo => grupo.nome}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={gruposDoMenu.find(g => g.id === grupoProdutoId) ?? null}
            onChange={(_, grupo) => onGrupoProdutoChange(grupo?.id ?? '')}
            renderInput={params => (
              <TextField
                {...params}
                label="Grupo de produtos"
                placeholder="Pesquise ou selecione"
                InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                sx={{
                  ...sxEntradaCompactaProduto,
                  '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
                }}
              />
            )}
          />
        </div>

        <div className="relative z-10 w-full min-w-[180px] sm:w-[220px]">
          <Autocomplete
            id="menu-produtos-filter-grupo-complemento"
            size="small"
            options={gruposComplementos}
            loading={isLoadingGruposComplementos}
            disabled={isLoadingGruposComplementos}
            loadingText="Carregando..."
            noOptionsText="Nenhum grupo encontrado"
            getOptionLabel={grupo => grupo.getNome()}
            isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
            value={gruposComplementos.find(g => g.getId() === grupoComplementosId) ?? null}
            onChange={(_, grupo) => onGrupoComplementoChange(grupo?.getId() ?? '')}
            renderInput={params => (
              <TextField
                {...params}
                label="Grupo de complementos"
                placeholder="Pesquise ou selecione"
                InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                sx={{
                  ...sxEntradaCompactaProduto,
                  '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
                }}
              />
            )}
          />
        </div>

        <div className="flex w-full items-center sm:w-auto">
          <button
            type="button"
            onClick={onClearFilters}
            className="flex h-8 items-center rounded-lg border border-primary/50 bg-white px-5 text-sm font-semibold text-primary-text transition-colors hover:bg-primary/10"
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  )
}
