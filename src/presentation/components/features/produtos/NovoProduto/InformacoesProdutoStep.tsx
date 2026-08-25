'use client'

import { useLayoutEffect, useRef, type ChangeEvent, type RefObject } from 'react'
import { Autocomplete, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { sxEntradaCompactaProduto, sxEntradaCompactaProdutoSelect } from './produtoFormMuiSx'
import { UNIDADES_MEDIDA_PRODUTO_OPCOES } from '@/src/shared/types/unidadeMedidaProduto'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'

interface InformacoesProdutoStepProps {
  nomeProduto: string
  onNomeProdutoChange: (value: string) => void
  descricaoProduto: string
  onDescricaoProdutoChange: (value: string) => void
  precoVenda: string
  onPrecoVendaChange: (value: string) => void
  unidadeProduto: string | null
  onUnidadeProdutoChange: (value: string | null) => void
  grupoProduto: string | null
  onGrupoProdutoChange: (value: string | null) => void
  /** EAN / código de barras (GTIN — até 14 dígitos numéricos). */
  codigoEanBarras: string
  onCodigoEanBarrasChange: (value: string) => void
  grupos: GrupoProduto[]
  isLoadingGrupos: boolean
  lockGrupoProduto?: boolean
  lockedGrupoLabel?: string
  /** Nome da categoria nova ainda não gravada (wizard passo 1). */
  pendingNovaCategoriaLabel?: string
  /** Oculta o campo Categoria (ex.: fluxos que fixam a categoria). */
  showCategoriaField?: boolean
  onNext: () => void
  /** Salva com dados preenchidos até aqui e encerra o fluxo (sem passos seguintes) */
  onSaveAndClose: () => void
  /** Quando true, ações ficam no rodapé do painel lateral (JiffySidePanelModal) */
  hideStepFooter?: boolean
}

/**
 * Step 1: Informações do Produto
 * Labels outlined na borda do campo (padrão NovoComplemento).
 */
export function InformacoesProdutoStep({
  nomeProduto,
  onNomeProdutoChange,
  descricaoProduto,
  onDescricaoProdutoChange,
  precoVenda,
  onPrecoVendaChange,
  unidadeProduto,
  onUnidadeProdutoChange,
  grupoProduto,
  onGrupoProdutoChange,
  codigoEanBarras,
  onCodigoEanBarrasChange,
  grupos,
  isLoadingGrupos,
  lockGrupoProduto = false,
  lockedGrupoLabel,
  pendingNovaCategoriaLabel,
  showCategoriaField = true,
  onNext,
  onSaveAndClose,
  hideStepFooter = false,
}: InformacoesProdutoStepProps) {
  const nomeInputRef = useRef<HTMLInputElement>(null)
  const nomeCursorRef = useRef<{ start: number; end: number } | null>(null)
  const descricaoInputRef = useRef<HTMLTextAreaElement>(null)
  const descricaoCursorRef = useRef<{ start: number; end: number } | null>(null)

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (!numbers) return ''

    const num = parseFloat(numbers) / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num)
  }

  const handlePrecoChange = (value: string) => {
    const formatted = formatCurrency(value)
    onPrecoVendaChange(formatted)
  }

  const restoreInputSelection = (
    inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    cursorRef: RefObject<{ start: number; end: number } | null>
  ) => {
    if (!cursorRef.current) return
    const el = inputRef.current
    const cursor = cursorRef.current
    cursorRef.current = null
    if (!el) return
    const max = el.value.length
    el.setSelectionRange(Math.min(cursor.start, max), Math.min(cursor.end, max))
  }

  useLayoutEffect(() => {
    restoreInputSelection(nomeInputRef, nomeCursorRef)
  }, [nomeProduto])

  useLayoutEffect(() => {
    restoreInputSelection(descricaoInputRef, descricaoCursorRef)
  }, [descricaoProduto])

  const handleNomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    nomeCursorRef.current = {
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length,
    }
    onNomeProdutoChange(el.value.toLocaleUpperCase('pt-BR'))
  }

  const handleDescricaoChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.target
    descricaoCursorRef.current = {
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length,
    }
    onDescricaoProdutoChange(el.value.toLocaleUpperCase('pt-BR'))
  }

  const grupoSelecionado = grupos.find(g => g.getId() === grupoProduto) ?? null

  return (
    <div className="rounded-[10px] bg-info p-2 md:p-4">
      <div className="mb-2 flex items-center gap-5">
        <h2 className="text-xl font-semibold text-primary">Informações</h2>
        <div className="h-px flex-1 bg-primary/70" />
      </div>
      <p className="mb-4 text-sm text-secondary-text">
        Essas informações serão usadas para identificação e exibição no Jiffy POS.
      </p>

      <div className="space-y-4">
        {/* Linha 1: Nome do Produto + Preço de Venda lado a lado */}
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <Input
            label="Nome do Produto"
            required
            size="small"
            type="text"
            value={nomeProduto}
            inputRef={nomeInputRef}
            onChange={handleNomeChange}
            placeholder="Nome que Aparecerá no Jiffy POS"
            className="bg-white"
            sx={sxEntradaCompactaProduto}
            InputLabelProps={{ required: true }}
          />

          <Input
            label="Preço de Venda"
            size="small"
            type="text"
            value={precoVenda}
            onChange={e => handlePrecoChange(e.target.value)}
            placeholder="R$ 0,00"
            className="bg-white"
            sx={sxEntradaCompactaProduto}
          />
        </div>

        {/* Linha 2: Categoria + Unidade + Código EAN */}
        <div
          className={
            showCategoriaField
              ? 'grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)_minmax(0,1fr)]'
              : 'grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-4'
          }
        >
          {showCategoriaField ? (
            <div className="relative z-20 min-w-0">
              {lockGrupoProduto && !grupoSelecionado && lockedGrupoLabel ? (
                <TextField
                  size="small"
                  fullWidth
                  label="Categoria"
                  value={lockedGrupoLabel}
                  disabled
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    ...sxEntradaCompactaProduto,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#fff',
                    },
                  }}
                />
              ) : (
                <>
                  <Autocomplete
                    id="np-grupo-produto-searchable"
                    size="small"
                    options={grupos}
                    loading={isLoadingGrupos}
                    loadingText="Carregando..."
                    noOptionsText="Nenhuma categoria encontrada"
                    disabled={lockGrupoProduto}
                    getOptionLabel={grupo =>
                      grupo.isAtivo() ? grupo.getNome() : `${grupo.getNome()} (Inativo)`
                    }
                    isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
                    value={grupoSelecionado}
                    onChange={(_, grupo) => onGrupoProdutoChange(grupo?.getId() ?? null)}
                    renderOption={(props, grupo) => (
                      <li
                        {...props}
                        key={grupo.getId()}
                        style={{
                          ...props.style,
                          color: grupo.isAtivo() ? undefined : '#9CA3AF',
                        }}
                      >
                        {grupo.isAtivo() ? grupo.getNome() : `${grupo.getNome()} (Inativo)`}
                      </li>
                    )}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="Categoria"
                        placeholder={
                          pendingNovaCategoriaLabel && !grupoSelecionado
                            ? `Nova: ${pendingNovaCategoriaLabel}`
                            : 'Pesquise ou selecione'
                        }
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
                  {pendingNovaCategoriaLabel?.trim() && !grupoSelecionado ? (
                    <p className="mt-1 text-[10px] leading-snug text-secondary-text">
                      Ao concluir, será criada a categoria “{pendingNovaCategoriaLabel.trim()}”.
                      Selecione uma existente para usar no lugar, ou volte ao passo anterior para
                      alterar a nova.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          <div className="min-w-0">
            <FormControl
              fullWidth
              size="small"
              variant="outlined"
              sx={sxEntradaCompactaProdutoSelect}
            >
              <InputLabel id="np-unidade-label">Unidade</InputLabel>
              <Select
                labelId="np-unidade-label"
                label="Unidade"
                value={unidadeProduto || ''}
                onChange={e => onUnidadeProdutoChange(e.target.value || null)}
              >
                <MenuItem value="">
                  <span className="text-secondary-text">Selecione a unidade</span>
                </MenuItem>
                {UNIDADES_MEDIDA_PRODUTO_OPCOES.map(opcao => (
                  <MenuItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="min-w-0">
            <Input
              label="Código EAN(Barras)"
              size="small"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={codigoEanBarras}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 14)
                onCodigoEanBarrasChange(digits)
              }}
              placeholder="Digite o Código"
              className="bg-white"
              sx={sxEntradaCompactaProduto}
            />
          </div>
        </div>

        {/* Linha 3: Descrição */}
        <Input
          label="Descrição"
          size="small"
          value={descricaoProduto}
          inputRef={descricaoInputRef}
          onChange={handleDescricaoChange}
          placeholder="Descrição do Produto"
          className="bg-white"
          multiline
          minRows={3}
          sx={sxEntradaCompactaProduto}
        />
      </div>

      {!hideStepFooter ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-dashed border-[#E4E7F4] pt-6 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={onSaveAndClose}
              className="h-8 rounded-lg border-2 px-6 text-sm font-semibold hover:bg-primary/10 sm:px-8"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                border: '1px solid',
              }}
            >
              Salvar e fechar
            </Button>
            <Button
              type="button"
              onClick={onNext}
              className="h-8 rounded-lg px-10 text-sm font-semibold text-white hover:bg-primary/90"
              sx={{
                backgroundColor: 'var(--color-primary)',
              }}
            >
              Próximo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
