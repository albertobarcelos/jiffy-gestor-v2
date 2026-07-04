'use client'

import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { MdCheckCircle, MdError } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { Input } from '@/src/presentation/components/ui/input'
import {
  sxEntradaCompactaProduto,
  sxEntradaCompactaProdutoSelect,
} from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import {
  indicadoresProducao,
  origensMercadoria,
  tiposProduto,
} from '@/src/presentation/components/features/produtos/NovoProduto/fiscalSelectOptions'
import { CAMPOS_FISCAL_LOTE, sxCheckboxListaLote } from '../constants'
import type {
  CestPorNcmItem,
  CestValidationResult,
  FiscalCampoChave,
  FiscalLoteDraft,
  ModoFiscalLote,
  NcmValidationResult,
} from '../types'

export interface LotePainelFiscalProps {
  modoFiscal: ModoFiscalLote
  setModoFiscal: (modo: ModoFiscalLote) => void
  fiscalLoteDraft: FiscalLoteDraft
  setFiscalLoteDraft: React.Dispatch<React.SetStateAction<FiscalLoteDraft>>
  fiscalCamposLimparSelecionados: Set<FiscalCampoChave>
  todasFiscaisLimparSelecionadas: boolean
  onToggleFiscalCampoLimpar: (chave: FiscalCampoChave) => void
  onToggleSelecionarTodasLimpar: () => void
  podeAplicarEditar: boolean
  podeAplicarLimpar: boolean
  isUpdating: boolean
  isSalvandoPermissoes: boolean
  isSalvandoFiscal: boolean
  produtosSelecionadosCount: number
  ncmValidation: NcmValidationResult | null
  isValidatingNcm: boolean
  cestsDisponiveis: CestPorNcmItem[]
  isLoadingCests: boolean
  cestValidation: CestValidationResult | null
  isValidatingCest: boolean
  isNcmValidFiscal: boolean
  hasCestsDisponiveisFiscal: boolean
  onAplicar: () => void
  onLimparInputs: () => void
  formularioFiscalTemConteudo: boolean
}

export function LotePainelFiscal({
  modoFiscal,
  setModoFiscal,
  fiscalLoteDraft,
  setFiscalLoteDraft,
  fiscalCamposLimparSelecionados,
  todasFiscaisLimparSelecionadas,
  onToggleFiscalCampoLimpar,
  onToggleSelecionarTodasLimpar,
  podeAplicarEditar,
  podeAplicarLimpar,
  isUpdating,
  isSalvandoPermissoes,
  isSalvandoFiscal,
  produtosSelecionadosCount,
  ncmValidation,
  isValidatingNcm,
  cestsDisponiveis,
  isLoadingCests,
  cestValidation,
  isValidatingCest,
  isNcmValidFiscal,
  hasCestsDisponiveisFiscal,
  onAplicar,
  onLimparInputs,
  formularioFiscalTemConteudo,
}: LotePainelFiscalProps) {
  const modoClass = (modo: ModoFiscalLote) =>
    `px-3 py-1 rounded text-xs font-semibold transition-colors ${
      modoFiscal === modo ? 'bg-primary text-info' : 'text-secondary-text hover:bg-primary/10'
    }`

  const botaoDesabilitado =
    isUpdating ||
    isSalvandoPermissoes ||
    isSalvandoFiscal ||
    produtosSelecionadosCount === 0 ||
    (modoFiscal === 'editar'
      ? !podeAplicarEditar
      : !podeAplicarLimpar)

  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-info p-2 md:p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-exo text-base font-semibold text-primary md:text-lg">
              Configuração Fiscal
            </h2>
            <div className="h-px min-w-[40px] flex-1 bg-primary/70" />
          </div>
          
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={onAplicar}
            disabled={botaoDesabilitado}
            className="md:min-w-[180px] h-8 hover:bg-primary/90"
            sx={{ color: 'var(--color-info)', backgroundColor: 'var(--color-primary)' }}
          >
            {isSalvandoFiscal
              ? modoFiscal === 'editar'
                ? 'Salvando...'
                : 'Limpando...'
              : modoFiscal === 'editar'
                ? `Alterar (${produtosSelecionadosCount})`
                : `Limpar (${produtosSelecionadosCount})`}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <label className="block text-xs font-semibold text-secondary-text">Modo de operação:</label>
          <div className="flex gap-1 bg-info rounded-lg p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => setModoFiscal('editar')}
              className={modoClass('editar')}
            >
              Adicionar/Editar
            </button>
            <button
              type="button"
              onClick={() => setModoFiscal('limpar')}
              className={modoClass('limpar')}
            >
              Limpar campos
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onLimparInputs}
          disabled={isSalvandoFiscal || !formularioFiscalTemConteudo}
          title="Limpar os campos do formulário (não altera os produtos)"
          className="shrink-0 px-3 py-1 rounded text-xs font-semibold border border-gray-200 bg-white text-secondary-text transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpar
        </button>
      </div>

      {modoFiscal === 'limpar' ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="block text-xs font-semibold text-secondary-text">
              Campos para limpar ({fiscalCamposLimparSelecionados.size} selecionado
              {fiscalCamposLimparSelecionados.size !== 1 ? 's' : ''})
            </label>
            <button
              type="button"
              onClick={onToggleSelecionarTodasLimpar}
              className="text-xs text-primary hover:underline self-start md:self-auto"
            >
              {todasFiscaisLimparSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {CAMPOS_FISCAL_LOTE.map(({ chave, label }) => {
                const isSelected = fiscalCamposLimparSelecionados.has(chave)
                return (
                  <label
                    key={chave}
                    className={`flex min-h-0 items-center gap-0.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      size="small"
                      disableRipple
                      disableFocusRipple
                      checked={isSelected}
                      onChange={() => onToggleFiscalCampoLimpar(chave)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                      sx={sxCheckboxListaLote}
                    />
                    <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                      {label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Input
                label="NCM"
                size="small"
                type="text"
                value={fiscalLoteDraft.ncm}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setFiscalLoteDraft((d) => ({ ...d, ncm: v }))
                }}
                placeholder="8 dígitos"
                className="bg-white"
                sx={sxEntradaCompactaProduto}
                inputProps={{ maxLength: 8 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {isValidatingNcm && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                      {!isValidatingNcm &&
                        ncmValidation &&
                        (ncmValidation.valido ? (
                          <MdCheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <MdError className="h-5 w-5 text-red-500" />
                        ))}
                    </InputAdornment>
                  ),
                }}
              />
              {isValidatingNcm && (
                <p className="mt-1 font-nunito text-xs text-secondary-text">Validando NCM...</p>
              )}
              {!isValidatingNcm && ncmValidation && (
                <p
                  className={`mt-1 font-nunito text-xs ${ncmValidation.valido ? 'text-green-600' : 'text-red-600'}`}
                >
                  {ncmValidation.valido && ncmValidation.descricao
                    ? ncmValidation.descricao
                    : ncmValidation.mensagem}
                </p>
              )}
            </div>
            <div>
              {hasCestsDisponiveisFiscal ? (
                <FormControl
                  fullWidth
                  size="small"
                  variant="outlined"
                  sx={sxEntradaCompactaProdutoSelect}
                >
                  <InputLabel id="lote-fiscal-cest-label">CEST</InputLabel>
                  <Select
                    labelId="lote-fiscal-cest-label"
                    label="CEST"
                    value={fiscalLoteDraft.cest}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFiscalLoteDraft((d) => ({ ...d, cest: e.target.value }))
                    }
                  >
                    <MenuItem value="">
                      <span className="text-secondary-text">Selecione o CEST</span>
                    </MenuItem>
                    {cestsDisponiveis.map((item) => (
                      <MenuItem key={item.codigo} value={item.codigo}>
                        {item.codigo} — {item.descricao}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Input
                  label="CEST"
                  size="small"
                  type="text"
                  value={fiscalLoteDraft.cest}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 7)
                    setFiscalLoteDraft((d) => ({ ...d, cest: v }))
                  }}
                  placeholder={
                    isLoadingCests
                      ? 'Carregando...'
                      : '7 dígitos'
                  }
                  disabled={isLoadingCests}
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                  inputProps={{ maxLength: 7 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {(isValidatingCest || isLoadingCests) && (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        )}
                        {!isValidatingCest &&
                          !isLoadingCests &&
                          cestValidation &&
                          (cestValidation.valido ? (
                            <MdCheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <MdError className="h-5 w-5 text-red-500" />
                          ))}
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              {isLoadingCests && (
                <p className="mt-1 font-nunito text-xs text-secondary-text">
                  Carregando CESTs compatíveis...
                </p>
              )}
              {isValidatingCest && (
                <p className="mt-1 font-nunito text-xs text-secondary-text">Validando CEST...</p>
              )}
              {!isValidatingCest && !isLoadingCests && cestValidation && (
                <p
                  className={`mt-1 font-nunito text-xs ${cestValidation.valido ? 'text-green-600' : 'text-red-600'}`}
                >
                  {cestValidation.valido && cestValidation.descricao
                    ? cestValidation.descricao
                    : cestValidation.mensagem}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
              <InputLabel id="lote-fiscal-origem-label">Origem da Mercadoria</InputLabel>
              <Select
                labelId="lote-fiscal-origem-label"
                label="Origem da Mercadoria"
                value={fiscalLoteDraft.origemMercadoria}
                onChange={(e: SelectChangeEvent<string>) =>
                  setFiscalLoteDraft((d) => ({ ...d, origemMercadoria: e.target.value }))
                }
              >
                <MenuItem value="">
                  <span className="text-secondary-text">Selecione a origem</span>
                </MenuItem>
                {origensMercadoria.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
              <InputLabel id="lote-fiscal-tipo-label">Tipo do Produto</InputLabel>
              <Select
                labelId="lote-fiscal-tipo-label"
                label="Tipo do Produto"
                value={fiscalLoteDraft.tipoProduto}
                onChange={(e: SelectChangeEvent<string>) =>
                  setFiscalLoteDraft((d) => ({ ...d, tipoProduto: e.target.value }))
                }
              >
                <MenuItem value="">
                  <span className="text-secondary-text">Selecione o tipo</span>
                </MenuItem>
                {tiposProduto.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div>
            <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
              <InputLabel id="lote-fiscal-indicador-label">
                Indicador de Produção em Escala Relevante
              </InputLabel>
              <Select
                labelId="lote-fiscal-indicador-label"
                label="Indicador de Produção em Escala Relevante"
                value={fiscalLoteDraft.indicadorProducaoEscala}
                onChange={(e: SelectChangeEvent<string>) =>
                  setFiscalLoteDraft((d) => ({ ...d, indicadorProducaoEscala: e.target.value }))
                }
              >
                <MenuItem value="">
                  <span className="text-secondary-text">Selecione o indicador</span>
                </MenuItem>
                {indicadoresProducao.map((i) => (
                  <MenuItem key={i.value} value={i.value}>
                    {i.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <p className="mt-1 font-nunito text-xs text-secondary-text">
              Obrigatório para produtos no Anexo XXVII (52/2017)
            </p>
          </div>
        </>
      )}
    </div>
  )
}
