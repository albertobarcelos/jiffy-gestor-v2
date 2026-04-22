'use client'

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { sxEntradaCompactaProduto, sxEntradaCompactaProdutoSelect } from './produtoFormMuiSx'

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
  grupos: any[]
  isLoadingGrupos: boolean
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
  onNext,
  onSaveAndClose,
  hideStepFooter = false,
}: InformacoesProdutoStepProps) {
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

  const getGrupoId = (grupo: any) => {
    if (!grupo) return ''
    if (typeof grupo.getId === 'function') return grupo.getId()
    return grupo.id ?? ''
  }

  const getGrupoNome = (grupo: any) => {
    if (!grupo) return ''
    if (typeof grupo.getNome === 'function') return grupo.getNome()
    return grupo.nome ?? ''
  }

  const isGrupoAtivo = (grupo: any) => {
    if (!grupo) return true
    if (typeof grupo.isAtivo === 'function') return grupo.isAtivo()
    if (typeof grupo.ativo === 'boolean') return grupo.ativo
    return true
  }

  return (
    <div className="rounded-[10px] bg-info p-2 md:p-4">
      <div className="mb-2 flex items-center gap-5">
        <h2 className="font-exo text-xl font-semibold text-primary">Informações</h2>
        <div className="h-px flex-1 bg-primary/70" />
      </div>
      <p className="font-nunito mb-4 text-sm text-secondary-text">
        Preencha os dados principais do produto. Essas informações serão usadas para identificação e
        exibição no PDV.
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
            onChange={e => onNomeProdutoChange(e.target.value)}
            placeholder="Nome que aparecerá no PDV"
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

        {/* Linha 2: Unidade (mais estreita) + Grupo + Código EAN — três colunas em desktop */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)_minmax(0,1fr)]">
        <div className="min-w-0">
            {isLoadingGrupos ? (
              <div className="flex h-[40px] w-full items-center justify-center rounded-md border border-dashed border-[#CBD0E3] bg-white">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <FormControl
                fullWidth
                size="small"
                variant="outlined"
                sx={sxEntradaCompactaProdutoSelect}
              >
                <InputLabel id="np-grupo-label">Grupo</InputLabel>
                <Select
                  labelId="np-grupo-label"
                  label="Grupo"
                  value={grupoProduto || ''}
                  onChange={e => onGrupoProdutoChange(e.target.value || null)}
                >
                  <MenuItem value="">
                    <span className="text-secondary-text">Selecione o grupo</span>
                  </MenuItem>
                  {grupos.map(grupo => {
                    const id = getGrupoId(grupo)
                    const nome = getGrupoNome(grupo)
                    const ativo = isGrupoAtivo(grupo)
                    return (
                      <MenuItem key={id} value={id} sx={ativo ? undefined : { color: '#9CA3AF' }}>
                        {ativo ? nome : `${nome} (inativo)`}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
            )}
          </div>
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
                  <span className="text-secondary-text">Escolha a unidade</span>
                </MenuItem>
                <MenuItem value="UN">Unitário</MenuItem>
                <MenuItem value="KG">Kg</MenuItem>
                <MenuItem value="LT">Litro</MenuItem>
              </Select>
            </FormControl>
          </div>

          

          <div className="min-w-0">
            <Input
              label="Código EAN(barras)"
              size="small"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={codigoEanBarras}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 14)
                onCodigoEanBarrasChange(digits)
              }}
              placeholder="Digite o código"
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
          onChange={e => onDescricaoProdutoChange(e.target.value)}
          placeholder="Descrição do produto"
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
              className="h-8 rounded-lg border-2 px-6 font-exo text-sm font-semibold hover:bg-primary/10 sm:px-8"
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
              className="h-8 rounded-lg px-10 font-exo text-sm font-semibold text-white hover:bg-primary/90"
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
