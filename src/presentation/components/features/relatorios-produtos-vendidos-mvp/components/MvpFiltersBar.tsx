'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { MdCalendarToday, MdFilterAltOff, MdFilterList, MdSearch } from 'react-icons/md'
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
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
  /** KPIs, gráficos, personalizar e atualizar — na mesma linha da busca. */
  acoesToolbar?: ReactNode
}

export function MvpFiltersBar({
  values,
  onChange,
  onAplicar,
  onLimpar,
  timezoneAgregacao,
  gruposLoading,
  grupos,
  acoesToolbar,
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

      <div
        className={`flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:gap-3 ${filtrosVisiveis}`}
      >
        <div className="relative min-w-0 w-full flex-1 sm:flex-[2]">
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
        {acoesToolbar ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end sm:justify-start">
            {acoesToolbar}
          </div>
        ) : null}
      </div>

      <div
        className={`flex flex-wrap items-end justify-between gap-x-2 gap-y-3 rounded-t-lg bg-custom-2 px-2 pb-2 pt-3 ${filtrosVisiveis}`}
      >
        <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 md:justify-start">
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
          label="Valor mín. (R$)"
          type="text"
          inputMode="decimal"
          placeholder="0"
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
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={values.valorMax}
          onChange={e => set({ valorMax: e.target.value })}
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
          Limpar
        </button>

        <button
          type="button"
          onClick={onAplicar}
          className="font-nunito flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
        >
          Aplicar filtros
        </button>
        </div>

        <div className="flex flex-wrap items-end justify-end gap-x-2 gap-y-3">
          <span className="font-exo shrink-0 self-center text-sm text-primary">Período:</span>
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
            className="font-nunito flex h-8 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>
          {values.periodoPersonalizadoInicio && values.periodoPersonalizadoFim ? (
            <div className="flex shrink-0 flex-col gap-0 self-center text-[11px] leading-snug text-primary/85 sm:text-xs">
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
