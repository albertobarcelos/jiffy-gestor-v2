'use client'

import { useCallback, useMemo, useState } from 'react'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { calcularTotalComplementos } from '@/src/domain/services/pedido/CalculadoraPedido'
import {
  useEnsureComplementosCatalogo,
  usePublicDeliveryComplementosStore,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import type { DeliveryCarrinhoComplemento } from '../stores/deliveryCarrinhoStore'
import { showToast } from '@/src/shared/utils/toast'
import {
  chaveComplemento,
  resolveGruposComplementos,
  somarQuantidadeNoGrupo,
  validarGruposComplementos,
  type GrupoComplementoResolvido,
} from '../utils/produtoComplementosUtils'

function buildInitialQuantidades(
  complementos?: DeliveryCarrinhoComplemento[]
): Record<string, number> {
  if (!complementos?.length) return {}
  const map: Record<string, number> = {}
  for (const c of complementos) {
    const qtd = Math.max(0, Math.floor(c.quantidade))
    if (qtd < 1) continue
    map[chaveComplemento(c.grupoComplementoId, c.complementoId)] = qtd
  }
  return map
}

export function useProdutoComplementos(
  slug: string,
  produto: CatalogoPublicoProdutoDTO,
  initialComplementos?: DeliveryCarrinhoComplemento[]
) {
  const cacheComplementos = usePublicDeliveryComplementosStore(s => s.porSlug[slug] ?? null)
  const precisaComplementos = produto.abreComplementos && produto.grupoComplementosIds.length > 0
  const { isLoading: carregandoComplementos } = useEnsureComplementosCatalogo(
    slug,
    precisaComplementos && !cacheComplementos
  )

  const [quantidadesComplementos, setQuantidadesComplementos] = useState<Record<string, number>>(
    () => buildInitialQuantidades(initialComplementos)
  )

  const grupos = useMemo(
    () => resolveGruposComplementos(cacheComplementos, produto),
    [cacheComplementos, produto]
  )

  const complementosSelecionados: DeliveryCarrinhoComplemento[] = useMemo(() => {
    return grupos.flatMap(grupo =>
      grupo.complementos.flatMap(comp => {
        const key = chaveComplemento(grupo.id, comp.id)
        const qtd = Math.max(0, Math.floor(quantidadesComplementos[key] ?? 0))
        if (qtd < 1) return []
        return [{
          complementoId: comp.id,
          grupoComplementoId: grupo.id,
          quantidade: qtd,
          nome: comp.nome,
          valor: comp.valor,
          tipoImpactoPreco: normalizeTipoImpactoPreco(comp.tipoImpactoPreco),
        }]
      })
    )
  }, [quantidadesComplementos, grupos])

  const valorComplementosUnitario = useMemo(() => {
    if (complementosSelecionados.length === 0) return 0
    return calcularTotalComplementos({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade: 1,
      valorUnitario: produto.valor,
      complementos: complementosSelecionados.map(c => ({
        id: c.complementoId,
        grupoId: c.grupoComplementoId,
        nome: c.nome,
        valor: c.valor,
        quantidade: c.quantidade,
        tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
      })),
    })
  }, [complementosSelecionados, produto.id, produto.nome, produto.valor])

  const ajustarQuantidadeComplemento = useCallback(
    (grupo: GrupoComplementoResolvido, complementoId: string, delta: number) => {
      const key = chaveComplemento(grupo.id, complementoId)
      setQuantidadesComplementos(prev => {
        const atual = Math.max(0, Math.floor(prev[key] ?? 0))
        const nova = Math.max(0, atual + delta)

        if (delta > 0 && grupo.qtdMaxima > 0) {
          const totalNoGrupo = somarQuantidadeNoGrupo(prev, grupo.id, { key, quantidade: nova })
          if (totalNoGrupo > grupo.qtdMaxima) {
            showToast.error(`Máximo de ${grupo.qtdMaxima} opção(ões) em ${grupo.nome}`)
            return prev
          }
        }

        if (nova === 0) {
          const next = { ...prev }
          delete next[key]
          return next
        }

        return { ...prev, [key]: nova }
      })
    },
    []
  )

  const validar = useCallback((): boolean => {
    const resultado = validarGruposComplementos(grupos, quantidadesComplementos)
    if (!resultado.valido && resultado.mensagem) {
      showToast.error(resultado.mensagem)
      return false
    }
    return true
  }, [grupos, quantidadesComplementos])

  const getQuantidadeComplemento = useCallback(
    (grupoId: string, complementoId: string) => {
      const key = chaveComplemento(grupoId, complementoId)
      return Math.max(0, Math.floor(quantidadesComplementos[key] ?? 0))
    },
    [quantidadesComplementos]
  )

  return {
    grupos,
    precisaComplementos,
    carregandoComplementos,
    cacheComplementos,
    complementosSelecionados,
    valorComplementosUnitario,
    ajustarQuantidadeComplemento,
    getQuantidadeComplemento,
    validar,
  }
}
