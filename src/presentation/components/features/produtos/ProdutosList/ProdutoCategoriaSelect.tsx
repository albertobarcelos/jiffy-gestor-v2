'use client'

import { useMemo, useRef, useCallback, useState, useEffect } from 'react'
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
  const rootRef = useRef<HTMLDivElement>(null)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const [open, setOpen] = useState(false)

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

  useEffect(() => {
    if (!open) return

    const fecharSeClicarFora = (event: PointerEvent) => {
      const alvo = event.target
      if (!(alvo instanceof Element)) return
      if (rootRef.current?.contains(alvo)) return
      if (alvo.closest('.MuiAutocomplete-popper')) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', fecharSeClicarFora, true)
    return () => document.removeEventListener('pointerdown', fecharSeClicarFora, true)
  }, [open])

  return (
    <div ref={rootRef} className="w-full md:w-48" onClick={e => e.stopPropagation()}>
      <Autocomplete
        className="w-full"
        size="small"
        disableClearable
        forcePopupIcon
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={loading}
        disabled={disabled || loading}
        loadingText="Carregando..."
        noOptionsText="Nenhuma categoria"
        getOptionLabel={grupo => grupo.getNome()}
        getOptionKey={grupo => grupo.getId()}
        isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
        value={value ?? undefined}
        onChange={handleChange}
        slotProps={{
          popper: {
            placement: 'bottom-start',
            sx: { zIndex: 1500 },
          },
          popupIndicator: {
            disableRipple: true,
            sx: {
              backgroundColor: 'transparent',
              '&:hover': { backgroundColor: 'transparent' },
            },
          },
        }}
        renderInput={params => (
          <TextField
            {...params}
            placeholder="Categoria"
            InputLabelProps={{ shrink: true }}
            sx={{
              ...sxEntradaCompactaProduto,
              width: '100%',
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fff',
                width: '100%',
                minWidth: 0,
                paddingRight: '32px',
                '@media (min-width: 768px)': {
                  width: '12rem',
                  minWidth: '12rem',
                  maxWidth: '12rem',
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
    </div>
  )
}
