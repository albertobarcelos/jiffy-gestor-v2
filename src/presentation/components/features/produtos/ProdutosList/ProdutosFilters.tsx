'use client'

import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import {
  Autocomplete,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  type SelectChangeEvent,
} from '@mui/material'
import {
  sxEntradaCompactaProduto,
  sxEntradaCompactaProdutoSelect,
} from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { GrupoProdutosMultiFilter } from '@/src/presentation/components/features/produtos/GrupoProdutosMultiFilter'

export type StatusFilter = 'Todos' | 'Ativo' | 'Desativado'
export type TriState = 'Todos' | 'Sim' | 'Não'

type OpcaoGrupoComplemento = {
  id: string
  nome: string
}

interface ProdutosFiltersProps {
  filtrosVisiveis: boolean
  isMobile: boolean
  onToggleFiltros: () => void

  filterStatus: StatusFilter
  onFilterStatusChange: (v: StatusFilter) => void

  statusGrupoFilter: StatusFilter
  onStatusGrupoChange: (v: StatusFilter) => void

  grupoProdutoFilter: string[]
  onGrupoProdutoChange: (v: string[]) => void
  gruposProdutos: GrupoProduto[]
  isLoadingGruposProdutos: boolean

  grupoComplementoFilter: string
  onGrupoComplementoChange: (v: string) => void
  gruposComplementos: GrupoComplemento[]
  isLoadingGruposComplementos: boolean

  onClearFilters: () => void
}

export function ProdutosFilters({
  filtrosVisiveis,
  isMobile,
  onToggleFiltros,
  filterStatus,
  onFilterStatusChange,
  statusGrupoFilter,
  onStatusGrupoChange,
  grupoProdutoFilter,
  onGrupoProdutoChange,
  gruposProdutos,
  isLoadingGruposProdutos,
  grupoComplementoFilter,
  onGrupoComplementoChange,
  gruposComplementos,
  isLoadingGruposComplementos,
  onClearFilters,
}: ProdutosFiltersProps) {
  const opcoesGrupoComplemento: OpcaoGrupoComplemento[] = [
    { id: '__none__', nome: 'Nenhum' },
    ...gruposComplementos.map(grupo => ({
      id: grupo.getId(),
      nome: grupo.getNome(),
    })),
  ]

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
            <InputLabel id="produtos-filter-status-label">Status</InputLabel>
            <Select
              labelId="produtos-filter-status-label"
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
            <InputLabel id="produtos-filter-status-grupo-label">Status grupo</InputLabel>
            <Select
              labelId="produtos-filter-status-grupo-label"
              label="Status grupo"
              value={statusGrupoFilter}
              onChange={(e: SelectChangeEvent<string>) =>
                onStatusGrupoChange(e.target.value as StatusFilter)
              }
            >
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="Ativo">Ativo</MenuItem>
              <MenuItem value="Desativado">Desativado</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="relative z-20 w-full min-w-[180px] sm:w-[240px]">
          <GrupoProdutosMultiFilter
            id="produtos-filter-grupo-searchable"
            grupos={gruposProdutos}
            loading={isLoadingGruposProdutos}
            value={grupoProdutoFilter}
            onChange={onGrupoProdutoChange}
          />
        </div>

        <div className="relative z-10 w-full min-w-[180px] sm:w-[220px]">
          <Autocomplete
            id="produtos-filter-grupo-complemento-searchable"
            size="small"
            options={opcoesGrupoComplemento}
            loading={isLoadingGruposComplementos}
            disabled={isLoadingGruposComplementos}
            loadingText="Carregando..."
            noOptionsText="Nenhum grupo encontrado"
            getOptionLabel={opcao => opcao.nome}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={opcoesGrupoComplemento.find(o => o.id === grupoComplementoFilter) ?? null}
            onChange={(_, opcao) => onGrupoComplementoChange(opcao?.id ?? '')}
            renderInput={params => (
              <TextField
                {...params}
                label="Grupo de complementos"
                placeholder="Pesquise ou Selecione"
                InputLabelProps={{
                  ...params.InputLabelProps,
                  shrink: true,
                }}
                sx={{
                  ...sxEntradaCompactaProduto,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                  },
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
