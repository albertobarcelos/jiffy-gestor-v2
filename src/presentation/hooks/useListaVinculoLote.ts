'use client'

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  filtrarCatalogoPorBuscaNome,
  filtrarCatalogoPorModoVinculo,
  ordenarCatalogoPorNome,
  podarSelecaoParaIdsPermitidos,
  textoEmptyModoVinculoLote,
  textoHintModoVinculoLote,
  type ModoVinculoLote,
  type TextosModoVinculoLote,
} from '@/src/shared/helpers/filtroVinculoLote'

const LIMIAR_BUSCA_PADRAO = 5

type UseListaVinculoLoteParams<TItem> = {
  catalogo: TItem[]
  getId: (item: TItem) => string
  getNome: (item: TItem) => string
  /** União dos vínculos já presentes nos alvos selecionados. */
  idsJaVinculados: Set<string>
  modo: ModoVinculoLote
  temAlvosSelecionados: boolean
  selecionados: Set<string>
  setSelecionados: Dispatch<SetStateAction<Set<string>>>
  textos: TextosModoVinculoLote
  /** Exibe campo de busca quando o catálogo do modo passa deste tamanho. */
  limiarExibirBusca?: number
}

/**
 * Lista filtrável para vincular/desvincular em lote.
 * @see docs/arquitetura-jiffy/5.presentation/3.FLUXO_VINCULO_LOTE.md
 */
export function useListaVinculoLote<TItem>({
  catalogo,
  getId,
  getNome,
  idsJaVinculados,
  modo,
  temAlvosSelecionados,
  selecionados,
  setSelecionados,
  textos,
  limiarExibirBusca = LIMIAR_BUSCA_PADRAO,
}: UseListaVinculoLoteParams<TItem>) {
  const [busca, setBusca] = useState('')

  const paraExibir = useMemo(() => {
    const filtrados = filtrarCatalogoPorModoVinculo(
      catalogo,
      getId,
      idsJaVinculados,
      modo,
      temAlvosSelecionados
    )
    return ordenarCatalogoPorNome(filtrados, getNome)
  }, [catalogo, getId, getNome, idsJaVinculados, modo, temAlvosSelecionados])

  const filtradas = useMemo(
    () => filtrarCatalogoPorBuscaNome(paraExibir, getNome, busca),
    [paraExibir, getNome, busca]
  )

  useEffect(() => {
    const idsPermitidos = new Set(paraExibir.map(getId))
    setSelecionados((prev) => podarSelecaoParaIdsPermitidos(prev, idsPermitidos))
  }, [paraExibir, getId, setSelecionados])

  const todasSelecionadas =
    filtradas.length > 0 && filtradas.every((item) => selecionados.has(getId(item)))

  const exibirBusca = catalogo.length > limiarExibirBusca

  const toggleSelecaoTodasVisiveis = () => {
    if (todasSelecionadas) {
      setSelecionados((prev) => {
        const next = new Set(prev)
        for (const item of filtradas) next.delete(getId(item))
        return next
      })
      return
    }
    setSelecionados((prev) => {
      const next = new Set(prev)
      for (const item of filtradas) next.add(getId(item))
      return next
    })
  }

  const limparBusca = () => setBusca('')

  return {
    busca,
    setBusca,
    limparBusca,
    paraExibir,
    filtradas,
    todasSelecionadas,
    exibirBusca,
    toggleSelecaoTodasVisiveis,
    hintModo: textoHintModoVinculoLote(modo, temAlvosSelecionados, textos),
    emptyModo: textoEmptyModoVinculoLote(modo, textos),
  }
}
