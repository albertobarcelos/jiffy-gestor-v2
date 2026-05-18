'use client'

import { useState } from 'react'
import { MdCalendarToday, MdFilterAltOff, MdFilterList, MdSearch } from 'react-icons/md'
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import type { RelatorioProdutosVendidosSort } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import {
  OPCOES_PERIODO_RELATORIO_MVP,
  type FiltroPeriodoRelatorio,
  type RelatoriosProdutosVendidosFiltersValues,
} from '../relatoriosProdutosVendidosFilters'
import {
  menuPropsRelatorioFiltroListaLonga,
  sxRelatorioFiltroSelectBase,
  sxRelatorioFiltroSelectPeriodo,
  sxRelatorioFiltroTextFieldMoeda,
  sxRelatorioFiltroTextFieldNumero,
} from '../mvpFiltrosVendasSx'
import { formatarDataHoraFiltroCurta } from '../utils/mvpFormatDataHora'
import { MvpPorDatasModal } from './MvpPorDatasModal'

interface MvpFiltersBarProps {
  values: RelatoriosProdutosVendidosFiltersValues
  onChange: (next: RelatoriosProdutosVendidosFiltersValues) => void
  onAplicar: () => void
  onLimpar: () => void
  timezoneAgregacao: string
  gruposLoading: boolean
  grupos: { id: string; nome: string }[]
}

export function MvpFiltersBar({
  values,
  onChange,
  onAplicar,
  onLimpar,
  timezoneAgregacao,
  gruposLoading,
  grupos,
}: MvpFiltersBarProps) {
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)

  const set = (patch: Partial<RelatoriosProdutosVendidosFiltersValues>) => {
    onChange({ ...values, ...patch })
  }

  const filtrosVisiveis = filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'

  return (
    <>
      <div className="flex justify-end py-2 sm:hidden">
        <button
          type="button"
          onClick={() => setFiltrosVisiveisMobile(prev => !prev)}
          className="font-nunito flex items-center gap-2 rounded-md bg-primary px-3 py-1 text-sm text-white shadow-sm"
          aria-expanded={filtrosVisiveisMobile}
        >
          {filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
          <span>{filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>
      </div>

      <div className={`flex flex-col items-center gap-3 py-2 sm:flex-row ${filtrosVisiveis}`}>
        <div className="relative w-full flex-[2]">
          <MdSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
            size={20}
          />
          <input
            type="search"
            placeholder="Buscar por nome do produto"
            value={values.buscaNome}
            onChange={e => set({ buscaNome: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') onAplicar()
            }}
            className="font-nunito h-8 w-full rounded-lg border bg-info pl-10 pr-4 text-sm shadow-sm"
          />
        </div>

        <div className="flex flex-row items-end gap-3">
          <TextField
            size="small"
            variant="outlined"
            margin="none"
            label="Valor mín. (R$)"
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={values.valorMin}
            onChange={e => set({ valorMin: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') onAplicar()
            }}
            sx={sxRelatorioFiltroTextFieldMoeda}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            variant="outlined"
            margin="none"
            label="Valor máx. (R$)"
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={values.valorMax}
            onChange={e => set({ valorMax: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') onAplicar()
            }}
            sx={sxRelatorioFiltroTextFieldMoeda}
            InputLabelProps={{ shrink: true }}
          />
        </div>

        <div className="flex flex-row flex-wrap items-end gap-3">
          <span className="font-exo text-sm text-primary">Período:</span>
          <FormControl size="small" sx={sxRelatorioFiltroSelectPeriodo}>
            <Select
              value={values.filtroPeriodo}
              onChange={e =>
                set({
                  filtroPeriodo: e.target.value as FiltroPeriodoRelatorio,
                  periodoPersonalizadoInicio: null,
                  periodoPersonalizadoFim: null,
                })
              }
            >
              {OPCOES_PERIODO_RELATORIO_MVP.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <button
            type="button"
            onClick={() => setIsDatasModalOpen(true)}
            className="font-nunito flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>
          {values.periodoPersonalizadoInicio && values.periodoPersonalizadoFim ? (
            <div className="flex shrink-0 flex-col gap-0 text-[11px] leading-snug text-primary/85 sm:text-xs">
              <span className="whitespace-nowrap">
                Dt. Ini.: {formatarDataHoraFiltroCurta(values.periodoPersonalizadoInicio)}
              </span>
              <span className="whitespace-nowrap">
                Dt. Fim: {formatarDataHoraFiltroCurta(values.periodoPersonalizadoFim)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`flex flex-wrap items-end justify-center gap-x-2 gap-y-3 rounded-t-lg bg-custom-2 px-2 pb-2 pt-3 md:justify-start ${filtrosVisiveis}`}
      >
        <FormControl size="small" variant="outlined" sx={sxRelatorioFiltroSelectBase}>
          <InputLabel id="mvp-filtro-sort-label" shrink>
            Ordenação
          </InputLabel>
          <Select
            labelId="mvp-filtro-sort-label"
            label="Ordenação"
            value={values.sort}
            onChange={e => set({ sort: e.target.value as RelatorioProdutosVendidosSort })}
            className="font-nunito"
          >
            <MenuItem value="quantidade_desc">Mais vendidos (qtd)</MenuItem>
            <MenuItem value="quantidade_asc">Menos vendidos (qtd)</MenuItem>
            <MenuItem value="valor_desc">Maior faturamento</MenuItem>
            <MenuItem value="valor_asc">Menor faturamento</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" variant="outlined" sx={{ ...sxRelatorioFiltroSelectBase, minWidth: 200 }}>
          <InputLabel id="mvp-filtro-grupo-label" shrink>
            Grupo de produtos
          </InputLabel>
          <Select
            labelId="mvp-filtro-grupo-label"
            label="Grupo de produtos"
            value={values.grupoId}
            onChange={e => set({ grupoId: e.target.value })}
            disabled={gruposLoading}
            displayEmpty
            MenuProps={menuPropsRelatorioFiltroListaLonga}
            className="font-nunito"
          >
            <MenuItem value="">
              <span className="text-secondary-text">Todos os grupos</span>
            </MenuItem>
            {grupos.map(g => (
              <MenuItem key={g.id} value={g.id}>
                {g.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          variant="outlined"
          margin="none"
          label="Qtd. mín."
          type="number"
          inputProps={{ min: 0, step: 1 }}
          value={values.qtdMin}
          onChange={e => set({ qtdMin: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') onAplicar()
          }}
          sx={sxRelatorioFiltroTextFieldNumero}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          variant="outlined"
          margin="none"
          label="Qtd. máx."
          type="number"
          inputProps={{ min: 0, step: 1 }}
          value={values.qtdMax}
          onChange={e => set({ qtdMax: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter') onAplicar()
          }}
          sx={sxRelatorioFiltroTextFieldNumero}
          InputLabelProps={{ shrink: true }}
        />

        <button
          type="button"
          onClick={onLimpar}
          className="font-nunito flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
        >
          <MdFilterAltOff size={18} aria-hidden />
          Limpar filtros
        </button>

        <button
          type="button"
          onClick={onAplicar}
          className="font-nunito flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
        >
          Aplicar filtros
        </button>
      </div>

      <MvpPorDatasModal
        open={isDatasModalOpen}
        onClose={() => setIsDatasModalOpen(false)}
        timezoneAgregacao={timezoneAgregacao}
        periodoInicio={values.periodoPersonalizadoInicio}
        periodoFim={values.periodoPersonalizadoFim}
        onConfirmar={(inicio, fim) =>
          onChange({
            ...values,
            periodoPersonalizadoInicio: inicio,
            periodoPersonalizadoFim: fim,
          })
        }
      />
    </>
  )
}
