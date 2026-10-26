'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buscarComissaoEntregador, type ComissaoEntregadorApp } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import type { PeriodoComissaoEntregador } from '@/src/application/expedicao/app/periodoComissaoEntregador'
import { serieDiariaComissaoEntregador } from '@/src/application/expedicao/app/serieDiariaComissaoEntregador'
import {
  chaveCacheBuscaComissao,
  comissaoExibidaNaLista,
  diaDestaqueGraficoComissao,
  intervaloBuscaComissao,
  visaoComissaoEntregador,
  type IntervaloFiltroComissao,
} from '@/src/application/expedicao/app/visaoComissaoEntregador'

export function useComissaoEntregadorApp(
  entregadorId: string | null,
  tokenAtual: () => string | null
) {
  const [periodo, setPeriodoState] = useState<PeriodoComissaoEntregador>('hoje')
  const [intervaloFiltro, setIntervaloFiltroState] = useState<IntervaloFiltroComissao | null>(null)
  const [cache, setCache] = useState<Record<string, ComissaoEntregadorApp>>({})
  const [carregandoComissao, setCarregandoComissao] = useState(false)
  const [erroComissao, setErroComissao] = useState<string | null>(null)

  const visao = visaoComissaoEntregador({ periodo, intervaloFiltro })
  const visaoHoje = visaoComissaoEntregador({ periodo: 'hoje', intervaloFiltro: null })

  const setPeriodo = useCallback((proximo: PeriodoComissaoEntregador) => {
    setIntervaloFiltroState(null)
    setPeriodoState(proximo)
  }, [])

  const setIntervaloFiltro = useCallback((faixa: IntervaloFiltroComissao | null) => {
    setIntervaloFiltroState(faixa)
  }, [])

  const carregarComissao = useCallback(async () => {
    const token = tokenAtual()
    if (!token || !entregadorId) return
    const atual = visaoComissaoEntregador({ periodo, intervaloFiltro })
    const placar = visaoComissaoEntregador({ periodo: 'hoje', intervaloFiltro: null })
    const chaveAtual = chaveCacheBuscaComissao(atual)
    const chavePlacar = chaveCacheBuscaComissao(placar)
    setCarregandoComissao(true)
    setErroComissao(null)
    try {
      const buscaAtual = buscarComissaoEntregador({
        token,
        entregadorId,
        intervalo: intervaloBuscaComissao(atual),
      })
      if (chavePlacar === chaveAtual) {
        const brutoAtual = await buscaAtual
        setCache(prev => ({ ...prev, [chaveAtual]: brutoAtual }))
      } else {
        const [brutoAtual, brutoPlacar] = await Promise.all([
          buscaAtual,
          buscarComissaoEntregador({
            token,
            entregadorId,
            intervalo: intervaloBuscaComissao(placar),
          }),
        ])
        setCache(prev => ({ ...prev, [chaveAtual]: brutoAtual, [chavePlacar]: brutoPlacar }))
      }
    } catch (error) {
      setErroComissao(error instanceof Error ? error.message : 'Não foi possível carregar as comissões.')
    } finally {
      setCarregandoComissao(false)
    }
  }, [entregadorId, intervaloFiltro, periodo, tokenAtual])

  useEffect(() => {
    if (!entregadorId) return
    void carregarComissao()
  }, [carregarComissao, entregadorId])

  const bruto = cache[chaveCacheBuscaComissao(visao)] ?? null
  const brutoHoje = cache[chaveCacheBuscaComissao(visaoHoje)] ?? null
  const dados = comissaoExibidaNaLista(bruto, visao)
  const dadosHoje = comissaoExibidaNaLista(brutoHoje, visaoHoje)

  const serieDiaria = useMemo(() => {
    if (!bruto) return []
    const atual = visaoComissaoEntregador({ periodo, intervaloFiltro })
    return serieDiariaComissaoEntregador({
      itens: bruto.itens,
      intervalo: intervaloBuscaComissao(atual),
      destaqueDia: diaDestaqueGraficoComissao(atual),
    })
  }, [bruto, intervaloFiltro, periodo])

  const resetarComissao = useCallback(() => {
    setCache({})
    setIntervaloFiltroState(null)
    setPeriodoState('hoje')
    setErroComissao(null)
  }, [])

  return {
    periodo,
    setPeriodo,
    intervaloFiltro,
    setIntervaloFiltro,
    dados,
    dadosHoje,
    serieDiaria,
    carregandoComissao,
    erroComissao,
    carregarComissao,
    resetarComissao,
  }
}
