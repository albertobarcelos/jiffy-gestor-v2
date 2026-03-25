'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { showToast } from '@/src/shared/utils/toast'

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

type GapItem = {
  numeroInicial: number
  numeroFinal: number
}

type GapsResponse = {
  modelo: number
  serie: number
  numeroInicialAnalisado: number
  numeroFinalAnalisado: number
  proximoNumeroConfigurado: number
  totalNumerosEmitidosNaFaixa: number
  totalFaixasInutilizadasNaFaixa: number
  totalGaps: number
  gaps: GapItem[]
}

type ConfigNumeracao = {
  modelo: number
  serie: number
}

type ContextoFiscal = {
  uf: string
  ambiente: string
}

const calcularTotalNumerosNaFaixa = (numeroInicial: number, numeroFinal: number) =>
  numeroFinal - numeroInicial + 1

const descreverGap = (gap: GapItem) => {
  if (gap.numeroInicial === gap.numeroFinal) {
    return `Número faltante: ${gap.numeroInicial}`
  }

  const total = calcularTotalNumerosNaFaixa(gap.numeroInicial, gap.numeroFinal)
  return `Faixa faltante: ${gap.numeroInicial} até ${gap.numeroFinal} (${total} números)`
}

export function Etapa5NumeracoesFiscais() {
  const { auth, isRehydrated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)
  const [isLoadingGaps, setIsLoadingGaps] = useState(false)
  const [isInutilizando, setIsInutilizando] = useState(false)

  const [modelo, setModelo] = useState<'55' | '65'>('65')
  const [serie, setSerie] = useState('1')
  const [numeroInicial, setNumeroInicial] = useState('')
  const [numeroFinal, setNumeroFinal] = useState('')
  const [justificativa, setJustificativa] = useState('Inutilizacao de numeracao por lacuna detectada no painel.')

  const [gapsData, setGapsData] = useState<GapsResponse | null>(null)
  const [historico, setHistorico] = useState<InutilizacaoItem[]>([])
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<Record<'55' | '65', string[]>>({
    '55': [],
    '65': [],
  })
  const [mensagemConfiguracao, setMensagemConfiguracao] = useState<string | null>(null)
  const [contextoFiscal, setContextoFiscal] = useState<ContextoFiscal | null>(null)
  const [gapsSelecionados, setGapsSelecionados] = useState<string[]>([])
  const historicoDisponivel = false

  const gapsHistoricos = useMemo(() => {
    if (!gapsData) return [] as GapItem[]

    const limiteHistorico = gapsData.proximoNumeroConfigurado - 1
    if (limiteHistorico < 1) return [] as GapItem[]

    const normalizados: GapItem[] = []
    for (const gap of gapsData.gaps) {
      if (gap.numeroInicial > limiteHistorico) continue
      const numeroFinalAjustado = Math.min(gap.numeroFinal, limiteHistorico)
      normalizados.push({
        numeroInicial: gap.numeroInicial,
        numeroFinal: numeroFinalAjustado,
      })
    }

    return normalizados
  }, [gapsData])

  const carregarConfiguracoesDisponiveis = async (token: string): Promise<{ modelo: '55' | '65'; serie: string } | null> => {
    const response = await fetch('/api/v1/fiscal/configuracoes/emissao', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error || 'Erro ao carregar configurações de numeração')
    }

    const data = (await response.json()) as ConfigNumeracao[]
    const series55 = data
      .filter((item) => item.modelo === 55)
      .map((item) => String(item.serie))
    const series65 = data
      .filter((item) => item.modelo === 65)
      .map((item) => String(item.serie))

    setSeriesDisponiveis({
      '55': Array.from(new Set(series55)),
      '65': Array.from(new Set(series65)),
    })

    const existeAtual = data.some(
      (item) => String(item.modelo) === modelo && String(item.serie) === serie
    )
    if (existeAtual) {
      return { modelo, serie }
    }

    if (series65.length > 0) return { modelo: '65', serie: series65[0] }
    if (series55.length > 0) return { modelo: '55', serie: series55[0] }
    return null
  }

  const carregarHistorico = async (token: string, modeloAtual: string, serieAtual: string) => {
    setIsLoadingHistorico(true)
    try {
      if (!historicoDisponivel) {
        setHistorico([])
        return
      }

      // Mantido para futura ativação quando endpoint estiver disponível no backend.
      const params = new URLSearchParams({ modelo: modeloAtual, serie: serieAtual })
      const response = await fetch(`/api/v1/fiscal/inutilizacoes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Erro ao carregar histórico de inutilizações')
      const data = await response.json()
      setHistorico(Array.isArray(data) ? data : [])
    } catch (_error: any) {
      setHistorico([])
    } finally {
      setIsLoadingHistorico(false)
    }
  }

  const carregarGaps = async (token: string, modeloAtual: string, serieAtual: string) => {
    setIsLoadingGaps(true)
    try {
      const params = new URLSearchParams({
        modelo: modeloAtual,
        serie: serieAtual,
      })
      if (numeroInicial.trim()) params.set('numeroInicial', numeroInicial.trim())
      if (numeroFinal.trim()) params.set('numeroFinal', numeroFinal.trim())

      const response = await fetch(`/api/v1/fiscal/numeracao/gaps?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const mensagem = err?.error || err?.message || ''
        if (mensagem.includes('Configuração não encontrada')) {
          setGapsData(null)
          setMensagemConfiguracao(mensagem)
          return
        }
        throw new Error(err?.error || 'Erro ao detectar lacunas de numeração')
      }

      const data = await response.json()
      setGapsData(data)
      setGapsSelecionados([])
    } catch (error: any) {
      showToast.error(error?.message || 'Erro ao detectar lacunas de numeração')
      setGapsData(null)
    } finally {
      setIsLoadingGaps(false)
    }
  }

  const carregarTudo = async () => {
    if (!isRehydrated) return
    const token = auth?.getAccessToken()
    if (!token) return

    if (!serie.trim()) {
      showToast.error('Informe a série para consultar numeração')
      return
    }

    setMensagemConfiguracao(null)
    setIsLoading(true)
    await Promise.all([
      carregarHistorico(token, modelo, serie),
      carregarGaps(token, modelo, serie),
    ])
    setIsLoading(false)
  }

  const carregarContextoFiscal = async (token: string) => {
    const response = await fetch('/api/v1/fiscal/empresas-fiscais/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error || 'Erro ao carregar contexto fiscal')
    }
    const data = await response.json()

    const uf = String(data?.uf ?? '').trim().toUpperCase()
    const ambiente = String(data?.ambiente ?? '').trim().toUpperCase()
    if (!uf || !ambiente) {
      setContextoFiscal(null)
      return
    }
    setContextoFiscal({ uf, ambiente })
  }

  const toggleSelecionarGap = (gapKey: string) => {
    setGapsSelecionados((prev) =>
      prev.includes(gapKey) ? prev.filter((item) => item !== gapKey) : [...prev, gapKey]
    )
  }

  const selecionarTodosGaps = () => {
    if (gapsHistoricos.length === 0) return
    setGapsSelecionados(gapsHistoricos.map((gap) => `${gap.numeroInicial}-${gap.numeroFinal}`))
  }

  const limparSelecaoGaps = () => setGapsSelecionados([])

  const inutilizarSelecionados = async () => {
    if (!isRehydrated) return
    const token = auth?.getAccessToken()
    if (!token) return

    if (!contextoFiscal) {
      showToast.error('Contexto fiscal (UF/ambiente) não carregado para inutilizar.')
      return
    }
    if (!gapsData || gapsSelecionados.length === 0) {
      showToast.error('Selecione ao menos um gap para inutilizar.')
      return
    }
    const justificativaLimpa = justificativa.trim()
    if (justificativaLimpa.length < 15) {
      showToast.error('A justificativa deve ter ao menos 15 caracteres.')
      return
    }

    const selecionados = gapsHistoricos.filter((gap) =>
      gapsSelecionados.includes(`${gap.numeroInicial}-${gap.numeroFinal}`)
    )
    if (selecionados.length === 0) {
      showToast.error('Os gaps selecionados não estão mais disponíveis. Refaça a consulta.')
      return
    }

    setIsInutilizando(true)
    try {
      for (const gap of selecionados) {
        const response = await fetch('/api/v1/fiscal/inutilizar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uf: contextoFiscal.uf,
            ambiente: contextoFiscal.ambiente,
            modelo: Number(modelo),
            serie: Number(serie),
            numeroInicial: gap.numeroInicial,
            numeroFinal: gap.numeroFinal,
            justificativa: justificativaLimpa,
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(
            err?.error ||
              `Falha ao inutilizar range ${gap.numeroInicial}-${gap.numeroFinal}`
          )
        }
      }

      showToast.success(
        `${selecionados.length} ${selecionados.length === 1 ? 'faixa inutilizada' : 'faixas inutilizadas'} com sucesso.`
      )
      await carregarTudo()
    } catch (error: any) {
      showToast.error(error?.message || 'Erro ao inutilizar gaps selecionados')
    } finally {
      setIsInutilizando(false)
    }
  }

  useEffect(() => {
    if (!isRehydrated) return
    const token = auth?.getAccessToken()
    if (!token) return

    void (async () => {
      try {
        const configuracaoInicial = await carregarConfiguracoesDisponiveis(token)
        await carregarContextoFiscal(token)
        if (!configuracaoInicial) {
          setMensagemConfiguracao('Nenhuma configuração de numeração encontrada para NF-e/NFC-e.')
          setHistorico([])
          setGapsData(null)
          return
        }

        setModelo(configuracaoInicial.modelo)
        setSerie(configuracaoInicial.serie)
        await Promise.all([
          carregarHistorico(token, configuracaoInicial.modelo, configuracaoInicial.serie),
          carregarGaps(token, configuracaoInicial.modelo, configuracaoInicial.serie),
        ])
      } catch (error: any) {
        showToast.error(error?.message || 'Erro ao preparar consulta de numerações')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRehydrated])

  useEffect(() => {
    const seriesDoModelo = seriesDisponiveis[modelo]
    if (seriesDoModelo.length === 0) return
    if (seriesDoModelo.includes(serie)) return
    setSerie(seriesDoModelo[0])
  }, [modelo, serie, seriesDisponiveis])

  useEffect(() => {
    setGapsSelecionados((prev) =>
      prev.filter((key) => gapsHistoricos.some((gap) => `${gap.numeroInicial}-${gap.numeroFinal}` === key))
    )
  }, [gapsHistoricos])

  return (
    <div className="space-y-3 md:p-4 p-2">
      
      <div className="rounded-lg border border-primary/20 bg-white p-3 space-y-2">
      <h1 className="text-alternate font-exo font-bold text-lg sm:text-xl">Numerações Fiscais</h1>
        <p className="font-inter text-xs lg:text-sm text-secondary-text">
          Consulte lacunas de numeração e histórico de inutilizações por modelo/série.
        </p>

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
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-white text-sm font-medium"
            sx={{
              backgroundColor: 'var(--color-secondary)',
              '&:hover': { backgroundColor: 'var(--color-alternate)' },
              '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
            }}
          >
            {isLoading ? 'Consultando...' : 'Consultar numeração'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-white p-3">
        <h4 className="font-exo font-semibold text-alternate text-sm mb-2">Lacunas detectadas</h4>

        {isLoadingGaps ? (
          <p className="text-xs text-secondary-text">Carregando lacunas...</p>
        ) : !gapsData ? (
          <p className="text-xs text-secondary-text">Faça uma consulta para ver as lacunas.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-secondary-text">
              Faixa analisada: {gapsData.numeroInicialAnalisado} até {gapsData.numeroFinalAnalisado} | Próxima emissão:{' '}
              {gapsData.proximoNumeroConfigurado}
            </p>
            <p className="text-xs text-secondary-text">
              Exibindo apenas lacunas históricas (até {Math.max(gapsData.proximoNumeroConfigurado - 1, 0)}).
            </p>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-secondary-text">
                Selecionados: {gapsSelecionados.length}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={selecionarTodosGaps}
                  disabled={gapsHistoricos.length === 0 || isInutilizando}
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
                  onClick={limparSelecaoGaps}
                  disabled={gapsSelecionados.length === 0 || isInutilizando}
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
              {gapsHistoricos.length === 0 ? (
                <p className="text-xs text-secondary-text">
                  Nenhuma lacuna histórica encontrada antes da próxima emissão.
                </p>
              ) : (
                <div className="space-y-1">
                  {gapsHistoricos.map((gap, idx) => (
                    <div
                      key={`${gap.numeroInicial}-${gap.numeroFinal}-${idx}`}
                      className="flex items-center gap-2 text-xs text-secondary-text"
                    >
                      <input
                        type="checkbox"
                        checked={gapsSelecionados.includes(`${gap.numeroInicial}-${gap.numeroFinal}`)}
                        onChange={() => toggleSelecionarGap(`${gap.numeroInicial}-${gap.numeroFinal}`)}
                        disabled={isInutilizando}
                      />
                      <span>
                        {descreverGap(gap)}
                      </span>
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
                  gapsSelecionados.length === 0 ||
                  !contextoFiscal ||
                  !justificativa.trim() ||
                  gapsHistoricos.length === 0
                }
                className="rounded-lg px-4 py-2 text-white text-sm font-medium"
                sx={{
                  backgroundColor: '#b45309',
                  '&:hover': { backgroundColor: '#92400e' },
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
        <h4 className="font-exo font-semibold text-alternate text-sm mb-2">Histórico de inutilizações</h4>

        {isLoadingHistorico ? (
          <p className="text-xs text-secondary-text">Carregando histórico...</p>
        ) : !historicoDisponivel ? (
          <p className="text-xs text-secondary-text">
            Histórico de inutilizações indisponível na API atual.
          </p>
        ) : (
          <div className="max-h-44 overflow-y-auto rounded-md border border-primary/10 p-2">
            {historico.length === 0 ? (
              <p className="text-xs text-secondary-text">Nenhuma inutilização encontrada para os filtros atuais.</p>
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
                    <p className="text-xs text-secondary-text truncate">Justificativa: {item.justificativa}</p>
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
