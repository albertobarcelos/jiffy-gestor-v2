'use client'

import { useMemo, useRef, useCallback } from 'react'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Autocomplete, TextField } from '@mui/material'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'

export type ProdutoCategoriaCommitResult = void | boolean | Promise<void | boolean>

interface ProdutoCategoriaSelectProps {
  grupoId?: string
  grupoNome?: string
  grupos: GrupoProduto[]
  loading?: boolean
  disabled?: boolean
  onCommit: (novoGrupoId: string, novoGrupoNome: string) => ProdutoCategoriaCommitResult
}

function grupoFallback(id: string, nome: string): GrupoProduto {
  return GrupoProduto.create({
    id,
    nome,
    corHex: '#CCCCCC',
    iconName: '',
    ativo: true,
    ativoDelivery: false,
    ativoLocal: false,
  })
}

export function ProdutoCategoriaSelect({
  grupoId,
  grupoNome,
  grupos,
  loading = false,
  disabled = false,
  onCommit,
}: ProdutoCategoriaSelectProps) {
  const committingRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const options = useMemo(() => {
    if (!grupoId || grupos.some(g => g.getId() === grupoId)) return grupos
    if (!grupoNome?.trim()) return grupos
    return [grupoFallback(grupoId, grupoNome.trim()), ...grupos]
  }, [grupos, grupoId, grupoNome])

  const value = useMemo(
    () => options.find(g => g.getId() === grupoId) ?? null,
    [options, grupoId]
  )

  const handleChange = useCallback(
    async (_: unknown, novo: GrupoProduto | null) => {
      if (!novo || committingRef.current || disabled || loading) return
      if (novo.getId() === grupoId) return

      committingRef.current = true
      try {
        await onCommitRef.current(novo.getId(), novo.getNome())
      } finally {
        committingRef.current = false
      }
    },
    [disabled, loading, grupoId]
  )

  return (
    <Autocomplete
      className="w-full md:w-auto"
      size="small"
      disableClearable
      options={options}
      loading={loading}
      disabled={disabled || loading}
      loadingText="Carregando..."
      noOptionsText="Nenhuma categoria"
      getOptionLabel={grupo => grupo.getNome()}
      isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
      value={value ?? undefined}
      onChange={handleChange}
      slotProps={{
        popper: {
          placement: 'bottom-start',
          sx: { zIndex: 1500 },
        },
      }}
      renderInput={params => (
        <TextField
          {...params}
          placeholder="Categoria"
          InputLabelProps={{ shrink: true }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          sx={{
            ...sxEntradaCompactaProduto,
            width: '100%',
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              width: '100%',
              minWidth: 0,
              '@media (min-width: 768px)': {
                minWidth: '9rem',
                maxWidth: '14rem',
              },
            },
            '& .MuiOutlinedInput-input': {
              padding: '8px 10px',
              fontSize: '0.8125rem',
              textOverflow: 'ellipsis',
              '@media (min-width: 768px)': {
                padding: '6px 8px',
                fontSize: '0.75rem',
              },
            },
          }}
        />
      )}
    />
  )
}
