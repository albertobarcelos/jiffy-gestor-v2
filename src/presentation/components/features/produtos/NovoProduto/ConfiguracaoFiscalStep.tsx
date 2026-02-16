'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
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
      <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        {/* Título */}
        <div className="flex flex-col gap-2 mb-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-primary text-xl font-semibold font-exo">
              Configuração Fiscal
            </h3>
            <div className="flex-1 h-[2px] bg-primary/50" />
          </div>
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

        {/* Apenas botão Voltar — sem Salvar quando fiscal está indisponível */}
        <div className="flex justify-start pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
          <Button
            onClick={onBack}
            className="h-8 px-10 border-2 rounded-lg font-semibold font-exo text-sm hover:bg-primary/20"
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
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-primary text-xl font-semibold font-exo">
            Configuração Fiscal
          </h3>
          <div className="flex-1 h-[2px] bg-primary/50" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          Preencha as informações fiscais do produto. Essas informações serão usadas para emissão de notas fiscais.
        </p>
      </div>

      {/* Campos do formulário */}
      <div className="space-y-2">
        {/* Linha: NCM e CEST */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* NCM */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              NCM
            </label>
            <div className="relative">
              <Input
                type="text"
                value={ncm}
                onChange={(e) => {
                  // Permitir apenas dígitos numéricos e limitar a 8 caracteres
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                  onNcmChange(value)
                }}
                placeholder="Digite o código NCM (8 dígitos)"
                className={`w-full rounded-lg pr-10 ${
                  ncmValidation
                    ? ncmValidation.valido
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {/* Indicador de status no canto direito do input */}
              {isValidatingNcm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!isValidatingNcm && ncmValidation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {ncmValidation.valido ? (
                    <MdCheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <MdError className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {/* Mensagem de feedback abaixo do campo */}
            {!isValidatingNcm && ncmValidation && (
              <p className={`text-xs mt-1 font-nunito ${
                ncmValidation.valido ? 'text-green-600' : 'text-red-600'
              }`}>
                {ncmValidation.valido && ncmValidation.descricao
                  ? ncmValidation.descricao
                  : ncmValidation.mensagem}
              </p>
            )}
            {isValidatingNcm && (
              <p className="text-xs mt-1 font-nunito text-secondary-text">
                Validando NCM...
              </p>
            )}
          </div>

          {/* CEST */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              CEST
            </label>
            <div className="relative">
              {hasCestsDisponiveis ? (
                // Dropdown com CESTs compatíveis com o NCM
                <select
                  value={cest}
                  onChange={(e) => onCestChange(e.target.value)}
                  className={`w-full h-14 px-4 pr-10 rounded-lg border bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm appearance-none ${
                    cestValidation
                      ? cestValidation.valido
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-red-500 focus:border-red-500'
                      : 'border-[#CBD0E3]'
                  }`}
                  disabled={!isNcmValid}
                >
                  <option value="">Selecione o CEST relacionado ao NCM</option>
                  {cestsDisponiveis!.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.codigo} - {item.descricao}
                    </option>
                  ))}
                </select>
              ) : (
                // Input manual quando não há lista de CESTs
                <Input
                  type="text"
                  value={cest}
                  onChange={(e) => {
                    // Permitir apenas dígitos numéricos e limitar a 7 caracteres
                    const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                    onCestChange(value)
                  }}
                  placeholder={
                    isLoadingCests
                      ? 'Carregando CESTs...'
                      : !isNcmValid
                        ? 'Informe um NCM válido primeiro'
                        : 'Digite o código CEST (7 dígitos)'
                  }
                  disabled={isLoadingCests || !isNcmValid}
                  className={`w-full rounded-lg pr-10 ${
                    cestValidation
                      ? cestValidation.valido
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-red-500 focus:border-red-500'
                      : ''
                  }`}
                />
              )}
              {/* Indicador de status no canto direito */}
              {(isValidatingCest || isLoadingCests) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!isValidatingCest && !isLoadingCests && cestValidation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cestValidation.valido ? (
                    <MdCheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <MdError className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {/* Mensagem de feedback abaixo do campo */}
            {!isValidatingCest && !isLoadingCests && cestValidation && (
              <p className={`text-xs mt-1 font-nunito ${
                cestValidation.valido ? 'text-green-600' : 'text-red-600'
              }`}>
                {cestValidation.valido && cestValidation.descricao
                  ? cestValidation.descricao
                  : cestValidation.mensagem}
              </p>
            )}
            {isValidatingCest && (
              <p className="text-xs mt-1 font-nunito text-secondary-text">
                Validando CEST...
              </p>
            )}
            {isLoadingCests && (
              <p className="text-xs mt-1 font-nunito text-secondary-text">
                Carregando CESTs compatíveis...
              </p>
            )}
          </div>
        </div>

        {/* Linha: Origem da Mercadoria e Tipo do Produto */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Origem da Mercadoria */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Origem da Mercadoria
            </label>
            <select
              value={origemMercadoria || ''}
              onChange={(e) => onOrigemMercadoriaChange(e.target.value || null)}
              className="w-full h-14 px-4 rounded-lg border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm"
            >
              <option value="">Selecione a origem da mercadoria</option>
              {origensMercadoria.map((origem) => (
                <option key={origem.value} value={origem.value}>
                  {origem.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo do Produto */}
          <div className="flex-1">
            <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
              Tipo do Produto
            </label>
            <select
              value={tipoProduto || ''}
              onChange={(e) => onTipoProdutoChange(e.target.value || null)}
              className="w-full h-14 px-4 rounded-lg border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm"
            >
              <option value="">Selecione o tipo do produto</option>
              {tiposProduto.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicador de Produção em Escala Relevante */}
        <div className="flex-1">
          <p className="text-xs text-secondary-text font-nunito mb-2">
            Obrigatório para produtos no Anexo XXVII (52/2017)
          </p>
          <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
            Indicador de Produção em Escala Relevante
          </label>
          <div className="relative">
            <select
              value={indicadorProducaoEscala || ''}
              onChange={(e) => onIndicadorProducaoEscalaChange(e.target.value || null)}
              className="w-full h-14 px-4 pr-12 rounded-lg border border-[#CBD0E3] bg-white text-primary-text focus:outline-none focus:border-primary-text hover:border-primary-text focus:border-2 font-nunito text-sm appearance-none"
            >
              <option value="">Selecione o indicador</option>
              {indicadoresProducao.map((indicador) => (
                <option key={indicador.value} value={indicador.value}>
                  {indicador.label}
                </option>
              ))}
            </select>
            {indicadorProducaoEscala && (
              <button
                type="button"
                onClick={() => onIndicadorProducaoEscalaChange(null)}
                className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-secondary-text hover:text-primary-text z-10"
                aria-label="Limpar seleção"
              >
                <MdClose size={14} />
              </button>
            )}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-secondary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-between pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <Button
          onClick={onBack}
          className="h-8 px-10 border-2 rounded-lg font-semibold font-exo text-sm hover:bg-primary/20"
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
          className={`h-8 px-10 rounded-lg text-white font-semibold font-exo text-sm ${
            isNcmInvalid || isValidatingNcm || isCestInvalid || isValidatingCest
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-primary/90'
          }`}
          sx={{
            backgroundColor: 'var(--color-primary)',
          }}
        >
          {isValidatingNcm || isValidatingCest ? 'Validando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
