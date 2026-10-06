'use client'

import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Autocomplete, Checkbox, TextField } from '@mui/material'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'

interface GrupoProdutosMultiFilterProps {
  id: string
  grupos: GrupoProduto[]
  loading?: boolean
  value: string[]
  onChange: (grupoIds: string[]) => void
  /** Categorias desativadas ficam cinza e continuam selecionáveis. */
  destacarInativas?: boolean
}

function rotuloGruposSelecionados(selecionados: GrupoProduto[]): string | null {
  if (selecionados.length === 0) return null
  if (selecionados.length === 1) return selecionados[0].getNome()
  return `${selecionados.length} categorias selecionadas`
}

const COR_CATEGORIA_INATIVA = '#9CA3AF'

export function GrupoProdutosMultiFilter({
  id,
  grupos,
  loading = false,
  value,
  onChange,
  destacarInativas = false,
}: GrupoProdutosMultiFilterProps) {
  const selecionados = grupos.filter(g => value.includes(g.getId()))

  return (
    <Autocomplete
      id={id}
      multiple
      disableCloseOnSelect
      size="small"
      options={grupos}
      loading={loading}
      disabled={loading}
      loadingText="Carregando..."
      noOptionsText="Nenhuma categoria encontrada"
      getOptionLabel={grupo => grupo.getNome()}
      getOptionKey={grupo => grupo.getId()}
      isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
      value={selecionados}
      onChange={(_, gruposEscolhidos) => onChange(gruposEscolhidos.map(g => g.getId()))}
      renderTags={itens => {
        const texto = rotuloGruposSelecionados(itens)
        if (!texto) return null
        const inativaSelecionada =
          destacarInativas && itens.length === 1 && !itens[0].isAtivo()
        return (
          <span
            className="min-w-0 truncate text-sm text-primary-text"
            style={inativaSelecionada ? { color: COR_CATEGORIA_INATIVA } : undefined}
          >
            {texto}
          </span>
        )
      }}
      renderOption={(props, grupo, { selected }) => {
        const { key, ...optionProps } = props
        const inativa = destacarInativas && !grupo.isAtivo()
        return (
          <li key={key} {...optionProps}>
            <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.25 }} />
            <span style={inativa ? { color: COR_CATEGORIA_INATIVA } : undefined}>
              {grupo.getNome()}
            </span>
          </li>
        )
      }}
      renderInput={params => (
        <TextField
          {...params}
          label="Categoria"
          placeholder={value.length === 0 ? 'Pesquise ou Selecione' : ''}
          InputLabelProps={{
            ...params.InputLabelProps,
            shrink: true,
          }}
          sx={{
            ...sxEntradaCompactaProduto,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              flexWrap: 'nowrap',
            },
          }}
        />
      )}
    />
  )
}
