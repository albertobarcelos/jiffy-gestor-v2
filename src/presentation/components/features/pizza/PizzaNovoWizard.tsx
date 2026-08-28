'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Autocomplete, InputAdornment, TextField } from '@mui/material'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { usePizzaCategorias } from '@/src/presentation/hooks/pizza/usePizza'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import type { CategoriaPizza } from '@/src/shared/types/pizza'
import { PizzaCategoriaSetupPanel } from './PizzaCategoriaSetupPanel'
import { PizzaSaborModal } from './PizzaSaborModal'

type ModoCadastroPizza = 'nova' | 'existente'

const OPCOES: Array<{
  id: ModoCadastroPizza
  titulo: string
  descricao: string
}> = [
  {
    id: 'nova',
    titulo: 'Nova categoria de pizza',
    descricao:
      'Crie uma categoria do zero (tamanhos, massas, bordas e regras). Os sabores são cadastrados depois.',
  },
  {
    id: 'existente',
    titulo: 'Novo sabor em categoria existente',
    descricao:
      'Adiciona um sabor — ex.: Calabresa ou Mussarela — dentro de uma categoria pizza já configurada.',
  },
]

function CategoriaPizzaOption({
  categoria,
  size = 18,
}: {
  categoria: CategoriaPizza
  size?: number
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="flex shrink-0 items-center justify-center rounded-md border"
        style={{
          borderColor: categoria.corHex,
          width: size + 10,
          height: size + 10,
        }}
      >
        <DinamicIcon iconName={categoria.iconName} color={categoria.corHex} size={size} />
      </span>
      <span className="truncate">{categoria.nome}</span>
    </span>
  )
}

interface PizzaNovoWizardProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PizzaNovoWizard({ open, onClose, onSuccess }: PizzaNovoWizardProps) {
  const autoNovaSemCategoriasRef = useRef(false)
  const [modo, setModo] = useState<ModoCadastroPizza>('existente')
  const [categoria, setCategoria] = useState<CategoriaPizza | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [saborOpen, setSaborOpen] = useState(false)

  const { data: categoriasData, isLoading: loadingCategorias } = usePizzaCategorias({
    limit: 100,
    enabled: open,
  })
  const categorias = categoriasData?.items ?? []

  const resetState = useCallback(() => {
    setModo('existente')
    setCategoria(null)
    setSetupOpen(false)
    setSaborOpen(false)
    autoNovaSemCategoriasRef.current = false
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    resetState()
  }, [open, resetState])

  useEffect(() => {
    if (!open || loadingCategorias || autoNovaSemCategoriasRef.current) return
    if (categorias.length === 0) {
      autoNovaSemCategoriasRef.current = true
      setModo('nova')
    }
  }, [open, loadingCategorias, categorias.length])

  const stepEscolhaVisivel = open && !setupOpen && !saborOpen

  const podeContinuar =
    modo === 'nova' ? true : Boolean(categoria) && !loadingCategorias

  const handleContinuar = useCallback(() => {
    if (modo === 'nova') {
      setSetupOpen(true)
      return
    }
    if (!categoria) {
      showToast.error('Selecione a categoria pizza para cadastrar o sabor')
      return
    }
    setSaborOpen(true)
  }, [modo, categoria])

  const handleFluxoConcluido = useCallback(() => {
    setSetupOpen(false)
    setSaborOpen(false)
    onSuccess?.()
  }, [onSuccess])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (loadingCategorias) {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'dangerOutline',
        onCancel: onClose,
        barSecondaryTone: 'primary',
      }
    }

    return {
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'dangerOutline',
      onCancel: onClose,
      showSave: true,
      saveLabel: 'Continuar',
      saveDisabled: !podeContinuar,
      onSave: handleContinuar,
      barSecondaryTone: 'primary',
      barActionOrder: ['cancel', 'save'],
    }
  }, [handleContinuar, loadingCategorias, onClose, podeContinuar])

  return (
    <>
      <JiffySidePanelModal
        open={stepEscolhaVisivel}
        onClose={onClose}
        title="Nova pizza"
        subtitle="Escolha se vai criar uma categoria nova ou um sabor em categoria existente."
        panelClassName={MENU_WIDE_PANEL_CLASS}
        footerVariant="bar"
        footerActions={footerActions}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-2 md:p-4">
          <div className="rounded-[10px] bg-info p-2 md:p-4">
            <div className="mb-2 flex items-center gap-5">
              <h2 className="text-xl font-semibold text-primary">Categoria ou sabor</h2>
              <div className="h-px flex-1 bg-primary/70" />
            </div>
            <p className="mb-4 text-sm text-secondary-text">
              Este passo define <strong className="font-semibold text-primary-text">o que</strong>{' '}
              será criado. Continuar abre o formulário correspondente; nada é salvo ainda nesta
              etapa.
            </p>

            {loadingCategorias ? (
              <JiffyLoading text="Carregando categorias pizza..." />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {OPCOES.map(opcao => {
                    const selecionada = modo === opcao.id
                    return (
                      <button
                        key={opcao.id}
                        type="button"
                        onClick={() => {
                          setModo(opcao.id)
                          if (opcao.id === 'nova') setCategoria(null)
                        }}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-colors',
                          selecionada
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-primary/5'
                        )}
                      >
                        <p className="text-sm font-semibold text-primary-text">{opcao.titulo}</p>
                        <p className="mt-1 text-sm text-secondary-text">{opcao.descricao}</p>
                      </button>
                    )
                  })}
                </div>

                {modo === 'existente' ? (
                  <div className="mt-4 rounded-lg border border-primary/20 bg-white p-3">
                    <p className="mb-3 text-sm font-medium text-primary-text">
                      Selecione em qual categoria o novo sabor será cadastrado
                    </p>
                    {categorias.length === 0 ? (
                      <p className="text-sm text-secondary-text">
                        Nenhuma categoria pizza cadastrada. Use a opção{' '}
                        <strong className="font-semibold">Nova categoria de pizza</strong>.
                      </p>
                    ) : (
                      <Autocomplete
                        id="pizza-novo-wizard-categoria"
                        size="small"
                        options={categorias}
                        loading={loadingCategorias}
                        loadingText="Carregando..."
                        noOptionsText="Nenhuma categoria encontrada"
                        getOptionLabel={option => option.nome}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={categoria}
                        onChange={(_, value) => setCategoria(value)}
                        renderOption={(props, option) => {
                          const { key: _key, ...rest } = props
                          return (
                            <li {...rest} key={option.id}>
                              <CategoriaPizzaOption categoria={option} />
                            </li>
                          )
                        }}
                        renderInput={params => (
                          <TextField
                            {...params}
                            label="Categoria pizza"
                            placeholder="Pesquise ou selecione"
                            required
                            InputLabelProps={{
                              ...params.InputLabelProps,
                              shrink: true,
                            }}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  {categoria ? (
                                    <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                                      <span
                                        className="flex items-center justify-center rounded-md border"
                                        style={{
                                          borderColor: categoria.corHex,
                                          width: 26,
                                          height: 26,
                                        }}
                                      >
                                        <DinamicIcon
                                          iconName={categoria.iconName}
                                          color={categoria.corHex}
                                          size={16}
                                        />
                                      </span>
                                    </InputAdornment>
                                  ) : null}
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                            sx={{
                              ...sxEntradaCompactaProduto,
                              '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
                            }}
                          />
                        )}
                      />
                    )}
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-dashed border-primary/30 bg-white px-3 py-2 text-sm text-secondary-text">
                    Na próxima etapa você configura tamanhos, massas, bordas e demais regras da{' '}
                    <strong className="font-semibold text-primary-text">nova categoria</strong>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </JiffySidePanelModal>

      <PizzaCategoriaSetupPanel
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSuccess={() => handleFluxoConcluido()}
      />

      <PizzaSaborModal
        open={saborOpen}
        categoria={categoria}
        saborId={null}
        onClose={() => {
          setSaborOpen(false)
        }}
        onSuccess={() => handleFluxoConcluido()}
      />
    </>
  )
}
