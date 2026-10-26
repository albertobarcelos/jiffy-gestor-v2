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
} from '@/src/application/expedicao/app/visaoComissaoEntregador'

export function useComissaoEntregadorApp(
  entregadorId: string | null,
  tokenAtual: () => string | null
) {
  const [periodo, setPeriodoState] = useState<PeriodoComissaoEntregador>('hoje')
  const [dataFiltro, setDataFiltroState] = useState<string | null>(null)
  const [cache, setCache] = useState<Record<string, ComissaoEntregadorApp>>({})
  const [carregandoComissao, setCarregandoComissao] = useState(false)
  const [erroComissao, setErroComissao] = useState<string | null>(null)

  const visao = visaoComissaoEntregador({ periodo, dataFiltro })
  const visaoHoje = visaoComissaoEntregador({ periodo: 'hoje', dataFiltro: null })

  const setPeriodo = useCallback((proximo: PeriodoComissaoEntregador) => {
    setDataFiltroState(null)
    setPeriodoState(proximo)
  }, [])

  const setDataFiltro = useCallback((chave: string | null) => {
    setDataFiltroState(chave)
  }, [])

  const carregarComissao = useCallback(async () => {
    const token = tokenAtual()
    if (!token || !entregadorId) return
    const atual = visaoComissaoEntregador({ periodo, dataFiltro })
    const placar = visaoComissaoEntregador({ periodo: 'hoje', dataFiltro: null })
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
  }, [dataFiltro, entregadorId, periodo, tokenAtual])

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
    const atual = visaoComissaoEntregador({ periodo, dataFiltro })
    return serieDiariaComissaoEntregador({
      itens: bruto.itens,
      intervalo: intervaloBuscaComissao(atual),
      destaqueDia: diaDestaqueGraficoComissao(atual),
    })
  }, [bruto, dataFiltro, periodo])

  const resetarComissao = useCallback(() => {
    setCache({})
    setDataFiltroState(null)
    setPeriodoState('hoje')
    setErroComissao(null)
  }, [])

  return {
    periodo,
    setPeriodo,
    dataFiltro,
    setDataFiltro,
    dados,
    dadosHoje,
    serieDiaria,
    carregandoComissao,
    erroComissao,
    carregarComissao,
    resetarComissao,
  }
}
