'use client'

import { useCallback, useEffect, useState } from 'react'
import { buscarComissaoEntregador, type ComissaoEntregadorApp } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import type { PeriodoComissaoEntregador } from '@/src/application/expedicao/app/periodoComissaoEntregador'

export function useComissaoEntregadorApp(
  entregadorId: string | null,
  tokenAtual: () => string | null
) {
  const [periodo, setPeriodo] = useState<PeriodoComissaoEntregador>('hoje')
  const [comissaoPorPeriodo, setComissaoPorPeriodo] = useState<
    Partial<Record<PeriodoComissaoEntregador, ComissaoEntregadorApp>>
  >({})
  const [carregandoComissao, setCarregandoComissao] = useState(false)
  const [erroComissao, setErroComissao] = useState<string | null>(null)

  const carregarComissao = useCallback(
    async (periodoAlvo: PeriodoComissaoEntregador = periodo) => {
      const token = tokenAtual()
      if (!token || !entregadorId) return
      if (periodoAlvo === periodo) {
        setCarregandoComissao(true)
        setErroComissao(null)
      }
      try {
        const dados = await buscarComissaoEntregador({
          token,
          entregadorId,
          periodo: periodoAlvo,
        })
        setComissaoPorPeriodo(prev => ({ ...prev, [periodoAlvo]: dados }))
      } catch (error) {
        if (periodoAlvo === periodo) {
          setErroComissao(error instanceof Error ? error.message : 'Não foi possível carregar as comissões.')
        }
      } finally {
        if (periodoAlvo === periodo) setCarregandoComissao(false)
      }
    },
    [entregadorId, periodo, tokenAtual]
  )

  useEffect(() => {
    if (!entregadorId) return
    void carregarComissao('hoje')
  }, [carregarComissao, entregadorId])

  return {
    periodo,
    setPeriodo,
    comissaoPorPeriodo,
    setComissaoPorPeriodo,
    carregandoComissao,
    erroComissao,
    carregarComissao,
  }
}
