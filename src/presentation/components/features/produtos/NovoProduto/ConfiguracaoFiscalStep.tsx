'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FormControl, InputAdornment, InputLabel, MenuItem, Select } from '@mui/material'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import {
  sxEntradaCompactaProduto,
  sxEntradaCompactaProdutoSelect,
} from './produtoFormMuiSx'
import { MdClose, MdWarning, MdRefresh, MdCheckCircle, MdError, MdTimer } from 'react-icons/md'

const COOLDOWN_DURATION_MS = 2 * 60 * 1000 // 2 minutos em milissegundos

// Resultado da validação do NCM retornado pelo backend
interface NcmValidationResult {
  codigo: string
  valido: boolean
  descricao?: string
  mensagem: string
}

// Resultado da validação do CEST retornado pelo backend
interface CestValidationResult {
  codigo: string
  valido: boolean
  descricao?: string
  segmento?: string
  mensagem: string
}

// Item de CEST compatível com o NCM (retornado pelo endpoint por-ncm)
interface CestPorNcmItem {
  codigo: string
  descricao: string
  segmento: string
  numeroAnexo?: string
}

interface ConfiguracaoFiscalStepProps {
  // Status de disponibilidade do microsserviço fiscal
  fiscalStatus?: 'available' | 'unavailable'
  onRetryFiscal?: () => void
  isLoadingFiscal?: boolean
  ncm: string
  onNcmChange: (value: string) => void
  // Validação do NCM via API do backend
  ncmValidation?: NcmValidationResult | null
  isValidatingNcm?: boolean
  cest: string
  onCestChange: (value: string) => void
  // CESTs compatíveis com o NCM selecionado
  cestsDisponiveis?: CestPorNcmItem[]
  isLoadingCests?: boolean
  // Validação do CEST
  cestValidation?: CestValidationResult | null
  isValidatingCest?: boolean
  origemMercadoria: string | null
  onOrigemMercadoriaChange: (value: string | null) => void
  tipoProduto: string | null
  onTipoProdutoChange: (value: string | null) => void
  indicadorProducaoEscala: string | null
  onIndicadorProducaoEscalaChange: (value: string | null) => void
  onBack: () => void
  onNext: () => void
  /** Quando true, botões ficam no rodapé do painel lateral */
  hideStepFooter?: boolean
}

/**
 * Step 3: Configuração Fiscal
 * Mostra banner de indisponibilidade quando o microsserviço fiscal está fora do ar.
 * Quando disponível, exibe o formulário fiscal normalmente.
 */
export function ConfiguracaoFiscalStep({
  fiscalStatus,
  onRetryFiscal,
  isLoadingFiscal,
  ncm,
  onNcmChange,
  ncmValidation,
  isValidatingNcm,
  cest,
  onCestChange,
  cestsDisponiveis,
  isLoadingCests,
  cestValidation,
  isValidatingCest,
  origemMercadoria,
  onOrigemMercadoriaChange,
  tipoProduto,
  onTipoProdutoChange,
  indicadorProducaoEscala,
  onIndicadorProducaoEscalaChange,
  onBack,
  onNext,
  hideStepFooter = false,
}: ConfiguracaoFiscalStepProps) {
  // Determina se o NCM é inválido (bloqueia o botão Salvar)
  const isNcmInvalid = ncmValidation !== undefined && ncmValidation !== null && !ncmValidation.valido
  // Determina se o CEST é inválido (bloqueia o botão Salvar)
  const isCestInvalid = cestValidation !== undefined && cestValidation !== null && !cestValidation.valido
  // Determina se o NCM foi validado com sucesso (habilita o campo CEST)
  const isNcmValid = ncmValidation !== undefined && ncmValidation !== null && ncmValidation.valido
  // Verifica se há CESTs disponíveis para o NCM
  const hasCestsDisponiveis = cestsDisponiveis && cestsDisponiveis.length > 0
  // Opções para Origem da Mercadoria
  const origensMercadoria = [
    { value: '0', label: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
    { value: '1', label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
    { value: '2', label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
    { value: '3', label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%' },
    { value: '4', label: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos de que tratam as legislações citadas nos Ajustes' },
    { value: '5', label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
    { value: '6', label: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX e gás natural' },
    { value: '7', label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX e gás natural' },
    { value: '8', label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' },
  ]

  // Opções para Tipo do Produto
  const tiposProduto = [
    { value: '00', label: '00 - Mercadoria para Revenda' },
    { value: '01', label: '01 - Matéria Prima' },
    { value: '02', label: '02 - Embalagem' },
    { value: '03', label: '03 - Produto em Processo' },
    { value: '04', label: '04 - Produto Acabado' },
    { value: '05', label: '05 - Subproduto' },
    { value: '06', label: '06 - Produto Intermediário' },
    { value: '07', label: '07 - Material de Uso e Consumo' },
    { value: '08', label: '08 - Ativo Imobilizado' },
    { value: '09', label: '09 - Serviços' },
    { value: '10', label: '10 - Outros Insumos' },
    { value: '99', label: '99 - Outras' },
    { value: 'KT', label: 'KT - Kit' },
  ]

  // Opções para Indicador de Produção em Escala Relevante
  const indicadoresProducao = [
    { value: '0', label: 'Produzido em Escala NÃO Relevante' },
    { value: '1', label: 'Produzido em Escala Relevante' },
  ]

  // ─── Cooldown de 2 minutos para o botão "Tentar novamente" ───
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null)
  const [cooldownProgress, setCooldownProgress] = useState(0) // 0 a 100
  const [cooldownRemaining, setCooldownRemaining] = useState(0) // segundos restantes
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isCooldownActive = cooldownEndTime !== null && Date.now() < cooldownEndTime

  // Atualiza a barra de progresso e o tempo restante a cada 250ms
  useEffect(() => {
    if (!cooldownEndTime) return

    const updateCooldown = () => {
      const now = Date.now()
      const startTime = cooldownEndTime - COOLDOWN_DURATION_MS
      const elapsed = now - startTime
      const remaining = Math.max(0, cooldownEndTime - now)

      const progress = Math.min(100, (elapsed / COOLDOWN_DURATION_MS) * 100)
      setCooldownProgress(progress)
      setCooldownRemaining(Math.ceil(remaining / 1000))

      if (remaining <= 0) {
        setCooldownEndTime(null)
        setCooldownProgress(0)
        setCooldownRemaining(0)
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current)
          cooldownIntervalRef.current = null
        }
      }
    }

    // Executar imediatamente
    updateCooldown()

    // Atualizar a cada 250ms para uma barra suave
    cooldownIntervalRef.current = setInterval(updateCooldown, 250)

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
    }
  }, [cooldownEndTime])

  // Wrapper do retry que inicia o cooldown
  const handleRetryWithCooldown = useCallback(() => {
    if (onRetryFiscal) {
      onRetryFiscal()
    }
    // Iniciar cooldown de 2 minutos
    setCooldownEndTime(Date.now() + COOLDOWN_DURATION_MS)
  }, [onRetryFiscal])

  // Formata segundos restantes em "Xm Ys"
  const formatCooldownTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, '0')}s`
    }
    return `${secs}s`
  }

  // Se o microsserviço fiscal está indisponível, mostra banner em vez do formulário
  if (fiscalStatus === 'unavailable') {
    return (
      <div className="rounded-[10px] bg-info p-2 md:p-4">
        <div className="mb-2 flex items-center gap-5">
          <h2 className="font-exo text-xl font-semibold text-primary">Configuração Fiscal</h2>
          <div className="h-px flex-1 bg-primary/70" />
        </div>

        {/* Banner de indisponibilidade */}
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <MdWarning className="w-8 h-8 text-amber-500" />
          </div>

          <h4 className="text-lg font-semibold text-primary-text font-exo mb-2">
            Serviço fiscal temporariamente indisponível
          </h4>

          <p className="text-sm text-secondary-text font-nunito max-w-md mb-2">
            Estamos enfrentando uma instabilidade no serviço fiscal.
            Os dados fiscais não puderam ser carregados neste momento.
          </p>

          <p className="text-sm text-secondary-text font-nunito max-w-md mb-6">
            <strong className="text-primary-text">Não se preocupe:</strong> se o produto já possuía dados fiscais,
            eles estão salvos e serão exibidos quando o serviço estiver disponível novamente.
          </p>

          {onRetryFiscal && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              {/* Botão Tentar Novamente */}
              <button
                type="button"
                onClick={handleRetryWithCooldown}
                disabled={isLoadingFiscal || isCooldownActive}
                className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-white font-semibold font-exo text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingFiscal ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isCooldownActive ? (
                  <MdTimer className="w-4 h-4" />
                ) : (
                  <MdRefresh className="w-4 h-4" />
                )}
                {isLoadingFiscal
                  ? 'Verificando...'
                  : isCooldownActive
                    ? `Aguarde ${formatCooldownTime(cooldownRemaining)}`
                    : 'Tentar novamente'}
              </button>

              {/* Barra de progresso do cooldown */}
              {isCooldownActive && (
                <div className="w-full flex flex-col items-center gap-1.5">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-linear"
                      style={{
                        width: `${cooldownProgress}%`,
                        background: cooldownProgress < 100
                          ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                          : '#22c55e',
                      }}
                    />
                  </div>
                  <p className="text-xs text-secondary-text font-nunito">
                    {cooldownProgress < 100
                      ? 'Aguarde para tentar novamente...'
                      : 'Pronto! Você pode tentar novamente.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {!hideStepFooter ? (
          <div className="mt-4 flex justify-start border-t border-dashed border-[#E4E7F4] pt-6">
            <Button
              onClick={onBack}
              className="h-8 rounded-lg border-2 px-10 font-exo text-sm font-semibold hover:bg-primary/20"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                border: '1px solid',
              }}
            >
              Voltar
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-[10px] bg-info p-2 md:p-4">
      <div className="mb-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-exo text-xl font-semibold text-primary">Configuração Fiscal</h2>
          <div className="h-px flex-1 bg-primary/70" />
        </div>
        <p className="font-nunito text-sm text-secondary-text">
          Preencha as informações fiscais do produto. Essas informações serão usadas para emissão de notas fiscais.
        </p>
      </div>

      {/* Campos do formulário */}
      <div className="space-y-4">
        {/* Linha: NCM e CEST */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* NCM */}
          <div>
            <Input
              label="NCM"
              size="small"
              type="text"
              value={ncm}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                onNcmChange(value)
              }}
              placeholder="8 dígitos"
              className="bg-white"
              sx={sxEntradaCompactaProduto}
              inputProps={{ maxLength: 8 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isValidatingNcm && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {!isValidatingNcm && ncmValidation && (
                      ncmValidation.valido
                        ? <MdCheckCircle className="w-5 h-5 text-green-500" />
                        : <MdError className="w-5 h-5 text-red-500" />
                    )}
                  </InputAdornment>
                ),
              }}
            />
            {isValidatingNcm && (
              <p className="mt-1 text-xs font-nunito text-secondary-text">Validando NCM...</p>
            )}
            {!isValidatingNcm && ncmValidation && (
              <p className={`mt-1 text-xs font-nunito ${ncmValidation.valido ? 'text-green-600' : 'text-red-600'}`}>
                {ncmValidation.valido && ncmValidation.descricao ? ncmValidation.descricao : ncmValidation.mensagem}
              </p>
            )}
          </div>

          {/* CEST */}
          <div>
            {hasCestsDisponiveis ? (
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect} disabled={!isNcmValid}>
                <InputLabel id="fiscal-cest-label">CEST</InputLabel>
                <Select
                  labelId="fiscal-cest-label"
                  label="CEST"
                  value={cest}
                  onChange={(e) => onCestChange(e.target.value)}
                >
                  <MenuItem value=""><span className="text-secondary-text">Selecione o CEST</span></MenuItem>
                  {cestsDisponiveis!.map((item) => (
                    <MenuItem key={item.codigo} value={item.codigo}>
                      {item.codigo} — {item.descricao}{item.segmento ? ` — ${item.segmento}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Input
                label="CEST"
                size="small"
                type="text"
                value={cest}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                  onCestChange(value)
                }}
                placeholder={
                  isLoadingCests ? 'Carregando...'
                  : !isNcmValid ? 'Informe um NCM válido primeiro'
                  : '7 dígitos'
                }
                disabled={isLoadingCests || !isNcmValid}
                className="bg-white"
                sx={sxEntradaCompactaProduto}
                inputProps={{ maxLength: 7 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {(isValidatingCest || isLoadingCests) && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                      {!isValidatingCest && !isLoadingCests && cestValidation && (
                        cestValidation.valido
                          ? <MdCheckCircle className="w-5 h-5 text-green-500" />
                          : <MdError className="w-5 h-5 text-red-500" />
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            )}
            {isLoadingCests && (
              <p className="mt-1 text-xs font-nunito text-secondary-text">Carregando CESTs compatíveis...</p>
            )}
            {isValidatingCest && (
              <p className="mt-1 text-xs font-nunito text-secondary-text">Validando CEST...</p>
            )}
            {!isValidatingCest && !isLoadingCests && cestValidation && (
              <p className={`mt-1 text-xs font-nunito ${cestValidation.valido ? 'text-green-600' : 'text-red-600'}`}>
                {cestValidation.valido && cestValidation.descricao ? cestValidation.descricao : cestValidation.mensagem}
              </p>
            )}
          </div>
        </div>

        {/* Linha: Origem da Mercadoria e Tipo do Produto */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
            <InputLabel id="fiscal-origem-label">Origem da Mercadoria</InputLabel>
            <Select
              labelId="fiscal-origem-label"
              label="Origem da Mercadoria"
              value={origemMercadoria || ''}
              onChange={(e) => onOrigemMercadoriaChange(e.target.value || null)}
            >
              <MenuItem value=""><span className="text-secondary-text">Selecione a origem</span></MenuItem>
              {origensMercadoria.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
            <InputLabel id="fiscal-tipo-label">Tipo do Produto</InputLabel>
            <Select
              labelId="fiscal-tipo-label"
              label="Tipo do Produto"
              value={tipoProduto || ''}
              onChange={(e) => onTipoProdutoChange(e.target.value || null)}
            >
              <MenuItem value=""><span className="text-secondary-text">Selecione o tipo</span></MenuItem>
              {tiposProduto.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Indicador de Produção em Escala Relevante */}
        <div>
          <div className="flex items-center gap-2">
            <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
              <InputLabel id="fiscal-indicador-label">Indicador de Produção em Escala Relevante</InputLabel>
              <Select
                labelId="fiscal-indicador-label"
                label="Indicador de Produção em Escala Relevante"
                value={indicadorProducaoEscala || ''}
                onChange={(e) => onIndicadorProducaoEscalaChange(e.target.value || null)}
              >
                <MenuItem value=""><span className="text-secondary-text">Selecione o indicador</span></MenuItem>
                {indicadoresProducao.map((i) => (
                  <MenuItem key={i.value} value={i.value}>{i.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {indicadorProducaoEscala && (
              <button
                type="button"
                onClick={() => onIndicadorProducaoEscalaChange(null)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition-colors text-secondary-text hover:text-primary-text"
                aria-label="Limpar seleção"
              >
                <MdClose size={16} />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs font-nunito text-secondary-text">
            Obrigatório para produtos no Anexo XXVII (52/2017)
          </p>
        </div>
      </div>

      {!hideStepFooter ? (
        <div className="mt-4 flex justify-between border-t border-dashed border-[#E4E7F4] pt-6">
          <Button
            onClick={onBack}
            className="h-8 rounded-lg border-2 px-10 font-exo text-sm font-semibold hover:bg-primary/20"
            sx={{
              backgroundColor: 'var(--color-info)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              border: '1px solid',
            }}
          >
            Voltar
          </Button>
          <Button
            onClick={onNext}
            disabled={isNcmInvalid || isValidatingNcm || isCestInvalid || isValidatingCest}
            className={`h-8 rounded-lg px-10 font-exo text-sm font-semibold text-white ${
              isNcmInvalid || isValidatingNcm || isCestInvalid || isValidatingCest
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-primary/90'
            }`}
            sx={{
              backgroundColor: 'var(--color-primary)',
            }}
          >
            {isValidatingNcm || isValidatingCest ? 'Validando...' : 'Salvar'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
