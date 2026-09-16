'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import { Autocomplete, Popover, TextField } from '@mui/material'
import { MdModeEdit } from 'react-icons/md'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { IconPickerModal } from '@/src/presentation/components/features/grupos-produtos/IconPickerModal'
import { ColorPickerModal } from '@/src/presentation/components/features/grupos-produtos/ColorPickerModal'
import { useCategoriaNesteCardapio } from '@/src/presentation/hooks/menus/useCategoriaNesteCardapio'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { cn } from '@/src/shared/utils/cn'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'

export type MenuCategoriaNesteCardapioHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
  grupoProdutoIdSelecionado: () => string
  confirmarGrupoSelecionado: () => void
}

interface MenuCategoriaNesteCardapioCamposProps {
  menuId: string
  grupo: MenuGrupoProduto
  produtoId?: string
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
  onGrupoChange?: (grupo: MenuGrupoProduto) => void
}

export const MenuCategoriaNesteCardapioCampos = forwardRef<
  MenuCategoriaNesteCardapioHandle,
  MenuCategoriaNesteCardapioCamposProps
>(function MenuCategoriaNesteCardapioCampos(
  { menuId, grupo, produtoId, onDirtyChange, onSavingChange, onGrupoChange },
  ref
) {
  const {
    grupoAtual,
    gruposDoMenu,
    loadingGrupos,
    nome,
    nomeSalvo,
    editandoNome,
    saving,
    inputRef,
    handleNomeChange,
    iniciarEdicaoNome,
    cancelarEdicaoNome,
    save,
    isDirty,
    trocarCategoria,
    confirmarGrupoSelecionado,
    grupoProdutoIdSelecionado,
    persistVisual,
    dialogPropagacao,
    corHex,
    iconName,
  } = useCategoriaNesteCardapio({
    menuId,
    grupo,
    produtoId,
    onDirtyChange,
    onSavingChange,
    onGrupoChange,
  })

  const [visualAnchor, setVisualAnchor] = useState<HTMLElement | null>(null)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      isDirty,
      save,
      grupoProdutoIdSelecionado: () => grupoProdutoIdSelecionado,
      confirmarGrupoSelecionado,
    }),
    [isDirty, save, grupoProdutoIdSelecionado, confirmarGrupoSelecionado]
  )

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            title="Alterar ícone e cor da categoria"
            disabled={saving}
            onClick={e => setVisualAnchor(e.currentTarget)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 bg-white transition-opacity hover:opacity-90 disabled:opacity-60 md:h-12 md:w-12"
            style={{ borderColor: corHex }}
          >
            {iconName ? (
              <DinamicIcon iconName={iconName} color={corHex} size={28} />
            ) : null}
          </button>
          {editandoNome ? (
            <input
              ref={inputRef}
              type="text"
              aria-label="Nome da categoria neste cardápio"
              value={nome}
              disabled={saving}
              onChange={handleNomeChange}
              onBlur={() => {
                if (saving) return
                if (nome.trim() === nomeSalvo.trim() || !nome.trim()) {
                  cancelarEdicaoNome()
                  return
                }
                void save()
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void save()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelarEdicaoNome()
                }
              }}
              className="min-w-0 max-w-[18rem] flex-1 border-0 bg-transparent text-sm font-semibold text-primary-text outline-none ring-1 ring-primary/40 md:text-lg"
            />
          ) : (
            <p className="min-w-0 max-w-[18rem] truncate text-sm font-semibold tracking-wide text-primary-text md:text-lg">
              {nome.trim() ? nome : 'Nome da Categoria'}
            </p>
          )}
          <button
            type="button"
            title="Editar nome neste cardápio"
            disabled={saving || editandoNome}
            onClick={iniciarEdicaoNome}
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 text-primary-text transition-colors hover:bg-primary/10',
              (saving || editandoNome) && 'cursor-not-allowed opacity-50'
            )}
          >
            <MdModeEdit size={14} />
          </button>
        </div>

        <div className="w-full max-w-[13rem] shrink-0 sm:w-[13rem]">
          <Autocomplete<MenuGrupoProduto, false, true, false>
            size="small"
            disableClearable
            forcePopupIcon
            disabled={!produtoId || saving || loadingGrupos}
            options={gruposDoMenu}
            loading={loadingGrupos}
            loadingText="Carregando..."
            noOptionsText="Nenhuma categoria"
            getOptionLabel={g => g.nome || g.grupoBase.nome}
            getOptionKey={g => g.grupoBase.id}
            isOptionEqualToValue={(a, b) => a.grupoBase.id === b.grupoBase.id}
            value={
              gruposDoMenu.find(g => g.grupoBase.id === grupoAtual.grupoBase.id) ??
              grupoAtual
            }
            onChange={trocarCategoria}
            slotProps={{
              popper: {
                placement: 'bottom-start',
                sx: { zIndex: 1600 },
              },
              popupIndicator: {
                disableRipple: true,
                sx: {
                  color: 'var(--color-primary)',
                  backgroundColor: 'transparent',
                  '&:hover': { backgroundColor: 'transparent' },
                },
              },
              listbox: {
                sx: {
                  py: 0.5,
                  '& .MuiAutocomplete-option': {
                    minHeight: 44,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: '8px',
                    mx: 0.5,
                    my: 0.25,
                  },
                },
              },
            }}
            renderOption={(props, g) => {
              const { key, ...rest } = props
              const cor = g.grupoBase.corHex?.trim() || '#530CA3'
              const icone = g.grupoBase.iconName?.trim()
              const label = g.nome || g.grupoBase.nome
              const desativada = g.grupoBase.ativo === false
              return (
                <li key={key} {...rest}>
                  <span className="flex min-w-0 w-full items-center gap-2">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 bg-white',
                        desativada && 'opacity-50'
                      )}
                      style={{ borderColor: cor }}
                    >
                      {icone ? (
                        <DinamicIcon iconName={icone} color={cor} size={18} />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span
                        className={cn(
                          'min-w-0 truncate text-sm text-primary-text',
                          desativada && 'text-secondary-text'
                        )}
                      >
                        {label}
                      </span>
                      {desativada ? (
                        <span className="shrink-0 text-[11px] text-secondary-text">
                          (desativada)
                        </span>
                      ) : null}
                    </span>
                  </span>
                </li>
              )
            }}
            renderInput={params => (
              <TextField
                {...params}
                label="Categoria"
                placeholder="Pesquisar"
                InputLabelProps={{ shrink: true }}
                sx={{
                  ...sxEntradaCompactaProduto,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    paddingRight: '36px',
                    '& fieldset': {
                      borderColor: 'rgba(83, 12, 163, 0.22)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--color-primary)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--color-primary)',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '10px 12px',
                    fontSize: '0.875rem',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            )}
          />
        </div>

        <p className="max-w-[13.5rem] text-[11px] leading-snug text-secondary-text">
          No ícone você muda a cor e o desenho. O lápis muda só o nome aqui nesse MENU.
        </p>
      </div>

      <Popover
        open={Boolean(visualAnchor)}
        anchorEl={visualAnchor}
        onClose={() => setVisualAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{ zIndex: 1600 }}
        slotProps={{ paper: { className: 'rounded-xl p-3 shadow-lg' } }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-primary-text">Cor da Categoria</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVisualAnchor(null)
                  setIsColorPickerOpen(true)
                }}
                className="h-10 w-10 rounded-lg border border-primary/20 md:h-12 md:w-12"
                style={{ backgroundColor: corHex }}
                aria-label="Selecionar cor da categoria"
              />
              <button
                type="button"
                onClick={() => {
                  setVisualAnchor(null)
                  setIsColorPickerOpen(true)
                }}
                className="whitespace-nowrap rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-info hover:bg-primary/90 md:text-sm"
              >
                Escolher cor
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-primary-text">Ícone da Categoria</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVisualAnchor(null)
                  setIsIconPickerOpen(true)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-white md:h-12 md:w-12"
                aria-label="Selecionar ícone da categoria"
              >
                {iconName ? (
                  <DinamicIcon iconName={iconName} color="#000000" size={28} />
                ) : (
                  <span className="text-[10px] text-secondary-text">Sem ícone</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisualAnchor(null)
                  setIsIconPickerOpen(true)
                }}
                className="whitespace-nowrap rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-info hover:bg-primary/90 md:text-sm"
              >
                Escolher ícone
              </button>
            </div>
          </div>
        </div>
      </Popover>
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedColor={corHex}
        zIndex={1600}
        onSelect={nextIcon => {
          setIsIconPickerOpen(false)
          void persistVisual({ iconName: nextIcon })
        }}
      />
      <ColorPickerModal
        open={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        zIndex={1600}
        onSelect={nextCor => {
          setIsColorPickerOpen(false)
          void persistVisual({ corHex: nextCor })
        }}
      />
      {dialogPropagacao}
    </>
  )
})
