'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInutilizacaoNumeracao } from '@/src/presentation/hooks/painel-contador/useInutilizacaoNumeracao'
import { useEmissorFiscal } from '@/src/presentation/hooks/painel-contador/useEmissorFiscal'
import { useConfiguracaoEmpresaCompleta } from '@/src/presentation/hooks/painel-contador/useConfiguracaoEmpresaCompleta'
import type { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

type InutilizacaoItem = {
  inutilizacaoId: string
  modelo: number
  serie: number
  numeroInicial: number
  numeroFinal: number
  status: string
  protocolo?: string | null
  justificativa: string
  inutilizadoEm: string
}

type FaixaItem = {
  numeroInicial: number
  numeroFinal: number
  quantidadeNumeros?: number
}

type NumeracaoInutilizavelResponse = {
  modelo: number
  serie: number
  ambiente: string
  numeroInicialAnalisado: number
  numeroFinalAnalisado: number
  proximoNumeroConfigurado: number
  totalItens: number
  faixas: FaixaItem[]
}

/**
 * Seleciona o ambiente para um dado modelo+série a partir das configurações de emissão.
 * Prioridade: ativo+PRODUCAO > ativo+HOMOLOGACAO > ativo > PRODUCAO > HOMOLOGACAO > primeiro.
 * NUNCA usa fallback fora das configurações de emissão.
 */
function selecionarAmbienteEmissao(
  emissoes: ConfiguracaoEmissao[],
  modelo: string,
  serie: string
): 'HOMOLOGACAO' | 'PRODUCAO' | null {
  const candidates = emissoes.filter(
    (e) => String(e.modelo) === modelo && String(e.serie) === serie && e.terminalId === null
  )
  if (candidates.length === 0) return null

  const selected =
    candidates.find((e) => e.ativo && e.ambiente === 'PRODUCAO') ??
    candidates.find((e) => e.ativo && e.ambiente === 'HOMOLOGACAO') ??
    candidates.find((e) => e.ativo) ??
    candidates.find((e) => e.ambiente === 'PRODUCAO') ??
    candidates.find((e) => e.ambiente === 'HOMOLOGACAO') ??
    candidates[0]

  return selected?.ambiente ?? null
}

/**
 * Seleciona a melhor configuração disponível (modelo+série) entre todas as emissões.
 * Prefere NFC-e (65) sobre NF-e (55) e prioriza configurações ativas em produção.
 */
function selecionarMelhorConfigInicial(
  emissoes: ConfiguracaoEmissao[]
): { modelo: '55' | '65'; serie: string } | null {
  for (const m of [65, 55] as const) {
    const candidates = emissoes.filter((e) => e.modelo === m && e.terminalId === null)
    if (candidates.length === 0) continue

    const selected =
      candidates.find((e) => e.ativo && e.ambiente === 'PRODUCAO') ??
      candidates.find((e) => e.ativo && e.ambiente === 'HOMOLOGACAO') ??
      candidates.find((e) => e.ativo) ??
      candidates.find((e) => e.ambiente === 'PRODUCAO') ??
      candidates.find((e) => e.ambiente === 'HOMOLOGACAO') ??
      candidates[0]

    if (selected) return { modelo: String(m) as '55' | '65', serie: String(selected.serie) }
  }
  return null
}

const calcularTotalNumerosNaFaixa = (numeroInicial: number, numeroFinal: number) =>
  numeroFinal - numeroInicial + 1

const descreverFaixa = (faixa: FaixaItem) => {
  if (faixa.numeroInicial === faixa.numeroFinal) {
    return `Número: ${faixa.numeroInicial}`
  }

  const total =
    faixa.quantidadeNumeros ?? calcularTotalNumerosNaFaixa(faixa.numeroInicial, faixa.numeroFinal)
  return `Faixa: ${faixa.numeroInicial} até ${faixa.numeroFinal} (${total} números)`
}

export function Etapa4InutilizarNotas() {
  const { isRehydrated } = useAuthStore()
  const { consultarGaps, listarInutilizacoes, inutilizarMutation } = useInutilizacaoNumeracao()

  const { emissaoQuery } = useEmissorFiscal()
  const { dadosQuery: empresaQuery } = useConfiguracaoEmpresaCompleta()

  const emissoes: ConfiguracaoEmissao[] = emissaoQuery.data ?? []
  // UF vem do endereço da empresa (EmpresaPainelResumo.getUf()) — única fonte correta
  const uf = empresaQuery.data?.empresa?.getUf().toUpperCase() ?? ''

  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)
  const [isLoadingGaps, setIsLoadingGaps] = useState(false)
  const [isInutilizando, setIsInutilizando] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const [modelo, setModelo] = useState<'55' | '65'>('65')
  const [serie, setSerie] = useState('1')
  const [numeroInicial, setNumeroInicial] = useState('')
  const [numeroFinal, setNumeroFinal] = useState('')
  const [justificativa, setJustificativa] = useState(
    'Inutilizacao de numeracao por lacuna detectada no painel.'
  )

  const [numeracaoData, setNumeracaoData] = useState<NumeracaoInutilizavelResponse | null>(null)
  const [historico, setHistorico] = useState<InutilizacaoItem[]>([])
  const [mensagemConfiguracao, setMensagemConfiguracao] = useState<string | null>(null)
  const [faixasSelecionadas, setFaixasSelecionadas] = useState<string[]>([])
  const historicoDisponivel = false

  const faixasDisponiveis = useMemo(() => numeracaoData?.faixas ?? [], [numeracaoData])

  const seriesDisponiveis = useMemo(() => {
    const series55 = emissoes
      .filter((e) => e.modelo === 55 && e.terminalId === null)
      .map((e) => String(e.serie))
    const series65 = emissoes
      .filter((e) => e.modelo === 65 && e.terminalId === null)
      .map((e) => String(e.serie))
    return {
      '55': Array.from(new Set(series55)),
      '65': Array.from(new Set(series65)),
    }
  }, [emissoes])

  /**
   * Ambiente APENAS das configurações de emissão.
   * Sem fallback de nenhuma outra fonte.
   */
  const ambienteEmissao = useMemo(
    () => selecionarAmbienteEmissao(emissoes, modelo, serie),
    [emissoes, modelo, serie]
  )

  const isLoadingConfigs = emissaoQuery.isLoading || empresaQuery.isLoading

  const carregarHistorico = async (modeloAtual: string, serieAtual: string) => {
    setIsLoadingHistorico(true)
    try {
      if (!historicoDisponivel) {
        setHistorico([])
        return
      }
      const data = await listarInutilizacoes(Number(modeloAtual), Number(serieAtual))
      setHistorico(Array.isArray(data) ? data : [])
    } catch {
      setHistorico([])
    } finally {
      setIsLoadingHistorico(false)
    }
  }

  const carregarNumeracao = async (
    modeloAtual: string,
    serieAtual: string,
    ambienteAtual: 'HOMOLOGACAO' | 'PRODUCAO'
  ) => {
    setIsLoadingGaps(true)
    try {
      const data = await consultarGaps({
        modelo: Number(modeloAtual) as 55 | 65,
        serie: Number(serieAtual),
        ambiente: ambienteAtual,
        numeroInicial: numeroInicial.trim() ? Number(numeroInicial.trim()) : undefined,
        numeroFinal: numeroFinal.trim() ? Number(numeroFinal.trim()) : undefined,
      })
      setNumeracaoData(data)
      setFaixasSelecionadas([])
    } catch (error: unknown) {
      const mensagem = error instanceof Error ? error.message : ''
      if (mensagem.includes('Configuração não encontrada')) {
        setNumeracaoData(null)
        setMensagemConfiguracao(mensagem)
        return
      }
      showToast.error(mensagem || 'Erro ao listar numeração para inutilização')
      setNumeracaoData(null)
    } finally {
      setIsLoadingGaps(false)
    }
  }

  const carregarTudo = async () => {
    if (!isRehydrated) return

    if (!serie.trim()) {
      showToast.error('Informe a série para consultar numeração')
      return
    }

    if (!ambienteEmissao) {
      showToast.error('Ambiente não configurado no emissor fiscal para este modelo/série.')
      return
    }

    setMensagemConfiguracao(null)
    await Promise.all([
      carregarHistorico(modelo, serie),
      carregarNumeracao(modelo, serie, ambienteEmissao),
    ])
  }

  const toggleSelecionarFaixa = (faixaKey: string) => {
    setFaixasSelecionadas((prev) =>
      prev.includes(faixaKey) ? prev.filter((item) => item !== faixaKey) : [...prev, faixaKey]
    )
  }

  const selecionarTodasFaixas = () => {
    if (faixasDisponiveis.length === 0) return
    setFaixasSelecionadas(
      faixasDisponiveis.map((faixa) => `${faixa.numeroInicial}-${faixa.numeroFinal}`)
    )
  }

  const limparSelecaoFaixas = () => setFaixasSelecionadas([])

  const inutilizarSelecionados = async () => {
    if (!isRehydrated) return

    if (!uf) {
      showToast.error('UF não configurada. Verifique as configurações fiscais da empresa.')
      return
    }

    if (!ambienteEmissao) {
      showToast.error(
        'Ambiente não configurado no emissor fiscal para este modelo/série. Configure em Configurações > Emissor Fiscal.'
      )
      return
    }

    if (!numeracaoData || faixasSelecionadas.length === 0) {
      showToast.error('Selecione ao menos uma faixa para inutilizar.')
      return
    }

    const justificativaLimpa = justificativa.trim()
    if (justificativaLimpa.length < 15) {
      showToast.error('A justificativa deve ter ao menos 15 caracteres.')
      return
    }

    const selecionados = faixasDisponiveis.filter((faixa) =>
      faixasSelecionadas.includes(`${faixa.numeroInicial}-${faixa.numeroFinal}`)
    )
    if (selecionados.length === 0) {
      showToast.error('As faixas selecionadas não estão mais disponíveis. Refaça a consulta.')
      return
    }

    setIsInutilizando(true)
    let sucesso = 0
    const erros: string[] = []

    try {
      for (const faixa of selecionados) {
        try {
          await inutilizarMutation.mutateAsync({
            uf,
            ambiente: ambienteEmissao,
            modelo: Number(modelo) as 55 | 65,
            serie: Number(serie),
            numeroInicial: faixa.numeroInicial,
            numeroFinal: faixa.numeroFinal,
            justificativa: justificativaLimpa,
          })
          sucesso++
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Erro desconhecido'
          erros.push(`[${faixa.numeroInicial}–${faixa.numeroFinal}]: ${msg}`)
        }
      }

      if (sucesso > 0) {
        showToast.success(
          `${sucesso} ${sucesso === 1 ? 'faixa inutilizada' : 'faixas inutilizadas'} com sucesso.`
        )
      }
      if (erros.length > 0) {
        erros.forEach((msg) => showToast.error(msg))
      }

      // Sempre recarrega para refletir o estado atual da SEFAZ
      await carregarTudo()
    } finally {
      setIsInutilizando(false)
    }
  }

  /**
   * Seleciona modelo/série inicial quando as emissões carregam pela primeira vez.
   * Dispara a consulta de numeração automaticamente.
   */
  useEffect(() => {
    if (!isRehydrated || hasInitialized || emissaoQuery.isLoading || !emissaoQuery.data) return

    const melhor = selecionarMelhorConfigInicial(emissaoQuery.data)
    if (!melhor) {
      setMensagemConfiguracao('Nenhuma configuração de numeração encontrada para NF-e/NFC-e.')
      setHasInitialized(true)
      return
    }

    const ambiente = selecionarAmbienteEmissao(
      emissaoQuery.data,
      melhor.modelo,
      melhor.serie
    )
    if (!ambiente) {
      setMensagemConfiguracao(
        'Configuração de emissão encontrada, mas sem ambiente definido. Configure em Emissor Fiscal.'
      )
      setModelo(melhor.modelo)
      setSerie(melhor.serie)
      setHasInitialized(true)
      return
    }

    setModelo(melhor.modelo)
    setSerie(melhor.serie)
    setHasInitialized(true)

    void Promise.all([
      carregarHistorico(melhor.modelo, melhor.serie),
      carregarNumeracao(melhor.modelo, melhor.serie, ambiente),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRehydrated, emissaoQuery.isLoading, emissaoQuery.data, hasInitialized])

  useEffect(() => {
    const seriesDoModelo = seriesDisponiveis[modelo]
    if (seriesDoModelo.length === 0) return
    if (seriesDoModelo.includes(serie)) return
    setSerie(seriesDoModelo[0])
  }, [modelo, serie, seriesDisponiveis])

  useEffect(() => {
    setFaixasSelecionadas((prev) =>
      prev.filter((key) =>
        faixasDisponiveis.some((faixa) => `${faixa.numeroInicial}-${faixa.numeroFinal}` === key)
      )
    )
  }, [faixasDisponiveis])

  const isLoading = isLoadingConfigs && !hasInitialized

  return (
    <div className="space-y-3 md:p-4 p-2">
      <div className="rounded-lg border border-primary/20 bg-white p-3 space-y-2">
        <h1 className="text-alternate font-exo font-semibold text-lg sm:text-xl">
          Inutilizar numerações fiscais
        </h1>
        <p className="font-inter text-xs lg:text-sm text-secondary-text">
          Consulte numeração pendente de inutilização (lacunas e notas rejeitadas/denegadas) por
          modelo/série.
        </p>

        {!isLoading && !uf && !empresaQuery.isLoading && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
            UF da empresa fiscal não configurada. Verifique as configurações fiscais no Passo 1.
          </p>
        )}

        {!isLoading && !ambienteEmissao && !emissaoQuery.isLoading && hasInitialized && (
          <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1">
            Ambiente não configurado para o modelo/série selecionado. Configure em Emissor Fiscal.
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-start py-2">
            <JiffyLoading className="!gap-0 !py-0" size={24} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="modelo-numeracao">Modelo</Label>
                <select
                  id="modelo-numeracao"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value as '55' | '65')}
                  className="w-full rounded-md border border-primary/30 bg-white px-3 py-2 text-sm"
                >
                  <option value="55">55 - NF-e</option>
                  <option value="65">65 - NFC-e</option>
                </select>
              </div>
              <div>
                <Label htmlFor="serie-numeracao">Série</Label>
                {seriesDisponiveis[modelo].length > 0 ? (
                  <select
                    id="serie-numeracao"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className="w-full rounded-md border border-primary/30 bg-white px-3 py-2 text-sm"
                  >
                    {seriesDisponiveis[modelo].map((itemSerie) => (
                      <option key={itemSerie} value={itemSerie}>
                        {itemSerie}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="serie-numeracao"
                    type="number"
                    min={1}
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    placeholder="1"
                  />
                )}
              </div>
            </div>

            {mensagemConfiguracao ? (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1">
                {mensagemConfiguracao}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="numero-inicial">Faixa inicial (opcional)</Label>
                <Input
                  id="numero-inicial"
                  type="number"
                  min={1}
                  value={numeroInicial}
                  onChange={(e) => setNumeroInicial(e.target.value)}
                  placeholder="Ex: 1"
                />
              </div>
              <div>
                <Label htmlFor="numero-final">Faixa final (opcional)</Label>
                <Input
                  id="numero-final"
                  type="number"
                  min={1}
                  value={numeroFinal}
                  onChange={(e) => setNumeroFinal(e.target.value)}
                  placeholder="Ex: 500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="justificativa-inutilizacao">Justificativa da inutilização</Label>
              <Input
                id="justificativa-inutilizacao"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Mínimo de 15 caracteres"
              />
              <p className="mt-1 text-[11px] text-secondary-text">
                Essa justificativa será enviada para cada faixa selecionada.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => void carregarTudo()}
                disabled={isLoadingGaps || !ambienteEmissao}
                className="rounded-lg px-4 py-2 text-white text-sm font-medium"
                sx={{
                  backgroundColor: 'var(--color-secondary)',
                  '&:hover': { backgroundColor: 'var(--color-alternate)' },
                  '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
                }}
              >
                {isLoadingGaps ? 'Consultando...' : 'Consultar numeração'}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-primary/20 bg-white p-3">
        <h4 className="font-exo font-semibold text-alternate text-sm mb-2">
          Numeração para inutilização
        </h4>

        {isLoadingGaps ? (
          <div className="flex justify-start py-1">
            <JiffyLoading className="!gap-0 !py-0" size={24} />
          </div>
        ) : !numeracaoData ? (
          <p className="text-xs text-secondary-text">
            Faça uma consulta para ver a numeração disponível.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-secondary-text">
              Faixa analisada: {numeracaoData.numeroInicialAnalisado} até{' '}
              {numeracaoData.numeroFinalAnalisado} | Próxima emissão:{' '}
              {numeracaoData.proximoNumeroConfigurado} | Total de itens: {numeracaoData.totalItens}
            </p>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-secondary-text">
                Selecionados: {faixasSelecionadas.length}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={selecionarTodasFaixas}
                  disabled={faixasDisponiveis.length === 0 || isInutilizando}
                  className="rounded px-2 py-1 text-xs"
                  sx={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    '&:hover': { backgroundColor: '#e5e7eb' },
                  }}
                >
                  Selecionar todos
                </Button>
                <Button
                  onClick={limparSelecaoFaixas}
                  disabled={faixasSelecionadas.length === 0 || isInutilizando}
                  className="rounded px-2 py-1 text-xs"
                  sx={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    '&:hover': { backgroundColor: '#e5e7eb' },
                  }}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto rounded-md border border-primary/10 p-2">
              {faixasDisponiveis.length === 0 ? (
                <p className="text-xs text-secondary-text">
                  Nenhuma numeração pendente de inutilização encontrada na faixa analisada.
                </p>
              ) : (
                <div className="space-y-1">
                  {faixasDisponiveis.map((faixa, idx) => (
                    <div
                      key={`${faixa.numeroInicial}-${faixa.numeroFinal}-${idx}`}
                      className="flex items-center gap-2 text-xs text-secondary-text"
                    >
                      <input
                        type="checkbox"
                        checked={faixasSelecionadas.includes(
                          `${faixa.numeroInicial}-${faixa.numeroFinal}`
                        )}
                        onChange={() =>
                          toggleSelecionarFaixa(`${faixa.numeroInicial}-${faixa.numeroFinal}`)
                        }
                        disabled={isInutilizando}
                      />
                      <span>{descreverFaixa(faixa)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => void inutilizarSelecionados()}
                disabled={
                  isInutilizando ||
                  faixasSelecionadas.length === 0 ||
                  !uf ||
                  !ambienteEmissao ||
                  !justificativa.trim() ||
                  faixasDisponiveis.length === 0
                }
                className="rounded-lg px-4 py-2 text-white text-sm font-medium"
                sx={{
                  backgroundColor: '#dc2626',
                  '&:hover': { backgroundColor: '#b91c1c' },
                  '&:disabled': { backgroundColor: '#d1d5db', cursor: 'not-allowed' },
                }}
              >
                {isInutilizando ? 'Inutilizando...' : 'Inutilizar seleção'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-primary/20 bg-white p-3">
        <h4 className="font-exo font-semibold text-alternate text-sm mb-2">
          Histórico de inutilizações
        </h4>

        {isLoadingHistorico ? (
          <div className="flex justify-start py-1">
            <JiffyLoading className="!gap-0 !py-0" size={24} />
          </div>
        ) : !historicoDisponivel ? (
          <p className="text-xs text-secondary-text">
            Histórico de inutilizações indisponível na API atual.
          </p>
        ) : (
          <div className="max-h-44 overflow-y-auto rounded-md border border-primary/10 p-2">
            {historico.length === 0 ? (
              <p className="text-xs text-secondary-text">
                Nenhuma inutilização encontrada para os filtros atuais.
              </p>
            ) : (
              <div className="space-y-2">
                {historico.map((item) => (
                  <div key={item.inutilizacaoId} className="rounded-md border border-primary/10 p-2">
                    <p className="text-xs font-semibold text-primary">
                      {item.numeroInicial === item.numeroFinal
                        ? `Número ${item.numeroInicial}`
                        : `Range ${item.numeroInicial} - ${item.numeroFinal}`}
                    </p>
                    <p className="text-xs text-secondary-text">Status: {item.status}</p>
                    <p className="text-xs text-secondary-text">
                      Em: {new Date(item.inutilizadoEm).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-secondary-text truncate">
                      Justificativa: {item.justificativa}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
