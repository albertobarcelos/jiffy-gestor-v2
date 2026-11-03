'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AreaEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  mensagemSucessoSalvarAreasCobertura,
  montarSalvarAreasCobertura,
  removerDraftCriacaoPorId,
  type AreaRascunhoCriacaoCobertura,
} from '@/src/presentation/components/features/configuracoes/coberturaAreasDraft'
import type {
  AcoesDesenhoCobertura,
  EstadoDesenhoCobertura,
  FerramentaCobertura,
} from '@/src/presentation/components/features/configuracoes/CoberturaDeliveryMap'
import {
  ativoCoberturaPendente,
  linhaTaxaPrazoPendente,
  mensagemFalhaLoteCobertura,
  type CoberturaPainelAba,
} from '@/src/presentation/components/features/configuracoes/coberturaPainelAbas'
import {
  useAtualizarAreaEntregaDelivery,
  useAtualizarAreasEntregaEmLote,
  useCriarAreaEntregaDelivery,
  useExcluirAreaEntregaDelivery,
} from '@/src/presentation/hooks/useAreasEntregaDelivery'
import {
  geoJsonToLatLngPath,
  latLngPathsToGeoJsonPolygon,
  type LatLngLiteral,
} from '@/src/shared/types/geoJsonPolygon'
import { geoJsonPolygonDeCirculo } from '@/src/shared/utils/geoJsonCircle'
import { showToast } from '@/src/shared/utils/toast'

const TEMPO_PADRAO_AREA_NOVA = 45

function mensagemErroArea(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Não foi possível salvar a área.'
  if (/sobrepos|overlap|intersect/i.test(msg)) {
    return 'Esta área sobrepõe outra já cadastrada. Ajuste o desenho e tente novamente.'
  }
  return msg
}

export type UseCoberturaAreasPainelParams = {
  areas: AreaEntregaDTO[]
  painelAba: CoberturaPainelAba
  onIrParaAbaAreas: () => void
  onExibirMapa: () => void
}

/**
 * Estado e handlers do domínio Taxas por Área (drafts, desenho, salvar lote, exclusão).
 */
export function useCoberturaAreasPainel({
  areas,
  painelAba,
  onIrParaAbaAreas,
  onExibirMapa,
}: UseCoberturaAreasPainelParams) {
  const criarAreaMutation = useCriarAreaEntregaDelivery()
  const atualizarAreaMutation = useAtualizarAreaEntregaDelivery()
  const atualizarAreasLoteMutation = useAtualizarAreasEntregaEmLote()
  const excluirAreaMutation = useExcluirAreaEntregaDelivery()

  const [areaExcluindo, setAreaExcluindo] = useState<AreaEntregaDTO | null>(null)
  const [ferramenta, setFerramenta] = useState<FerramentaCobertura>('navegar')
  const [areasCriacaoDraft, setAreasCriacaoDraft] = useState<AreaRascunhoCriacaoCobertura[]>([])
  const [areaFormaEditandoId, setAreaFormaEditandoId] = useState<string | null>(null)
  const [pontosDesenho, setPontosDesenho] = useState(0)
  const [podeConcluirDesenho, setPodeConcluirDesenho] = useState(false)
  const [taxasAreaDraft, setTaxasAreaDraft] = useState<Record<string, string>>({})
  const [prazosAreaDraft, setPrazosAreaDraft] = useState<Record<string, string>>({})
  const [ativosAreaDraft, setAtivosAreaDraft] = useState<Record<string, boolean>>({})
  const [geometriasAreaDraft, setGeometriasAreaDraft] = useState<Record<string, LatLngLiteral[]>>(
    {}
  )
  /** Remonta só os overlays de área (não o Google Map inteiro). */
  const [areasPoligonosEpoch, setAreasPoligonosEpoch] = useState(0)
  const acoesDesenhoRef = useRef<AcoesDesenhoCobertura | null>(null)

  const areasComDraft = useMemo(
    () =>
      areas.map(area => {
        const ativo = ativosAreaDraft[area.id] ?? area.ativo
        const pathsDraft = geometriasAreaDraft[area.id]
        // Em Editar, o Google Maps segura vértices/raio — espelhar draft remonta e quebra.
        // Em Mover, após dragend precisamos espelhar: remonta o polígono (bug do draggable nativo
        // corrompe o overlay após o 1º arraste; sem remount o 2º trava).
        if (!pathsDraft || ferramenta === 'editar' || areaFormaEditandoId === area.id) {
          return { ...area, ativo }
        }
        try {
          return { ...area, ativo, area: latLngPathsToGeoJsonPolygon(pathsDraft) }
        } catch {
          return { ...area, ativo }
        }
      }),
    [areaFormaEditandoId, areas, ativosAreaDraft, ferramenta, geometriasAreaDraft]
  )

  const areasTaxaSignature = areas
    .map(area => `${area.id}:${area.valorTaxa}:${area.tempoEntregaInMinutes}:${area.ativo ? 1 : 0}`)
    .join('|')
  useEffect(() => {
    setTaxasAreaDraft(
      Object.fromEntries(areas.map(area => [area.id, String(area.valorTaxa).replace('.', ',')]))
    )
    setPrazosAreaDraft(
      Object.fromEntries(areas.map(area => [area.id, String(area.tempoEntregaInMinutes)]))
    )
    setAtivosAreaDraft(Object.fromEntries(areas.map(area => [area.id, area.ativo])))
    // Só ressincroniza quando id/valor/prazo/ativo da API muda — não enquanto o operador edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areasTaxaSignature])

  const limparEdicaoForma = useCallback(() => {
    setAreaFormaEditandoId(null)
  }, [])

  const limparDesenhoEmAndamento = useCallback(() => {
    setFerramenta('navegar')
    setPontosDesenho(0)
    setPodeConcluirDesenho(false)
  }, [])

  const handleFerramentaChange = useCallback(
    (proxima: FerramentaCobertura) => {
      if (proxima !== 'editar') {
        limparEdicaoForma()
      }
      if (proxima === 'poligono' || proxima === 'circulo' || proxima === 'editar') {
        onExibirMapa()
      }
      setFerramenta(proxima)
    },
    [limparEdicaoForma, onExibirMapa]
  )

  useEffect(() => {
    if (painelAba === 'areas') return
    // Mantém geometrias/criação em memória — só sai do modo desenho/edição.
    setFerramenta('navegar')
    setPontosDesenho(0)
    setPodeConcluirDesenho(false)
    setAreaFormaEditandoId(null)
  }, [painelAba])

  const handleDesenhoEstadoChange = useCallback((estado: EstadoDesenhoCobertura) => {
    setPontosDesenho(estado.pontos)
    setPodeConcluirDesenho(estado.podeConcluir)
  }, [])

  const handleAcoesDesenhoProntas = useCallback((acoes: AcoesDesenhoCobertura | null) => {
    acoesDesenhoRef.current = acoes
  }, [])

  const handleSelecionarAreaParaEditar = useCallback((areaId: string) => {
    setAreaFormaEditandoId(areaId)
  }, [])

  const handleFormaAreaAlterada = useCallback((areaId: string, paths: LatLngLiteral[]) => {
    setAreaFormaEditandoId(prev => prev ?? areaId)
    setGeometriasAreaDraft(prev => ({ ...prev, [areaId]: paths }))
  }, [])

  const handleSalvarNomeArea = useCallback(
    async (area: AreaEntregaDTO, nome: string) => {
      try {
        await atualizarAreaMutation.mutateAsync({ id: area.id, input: { nome } })
        showToast.success('Nome da área atualizado.')
      } catch (error) {
        showToast.error(mensagemErroArea(error))
      }
    },
    [atualizarAreaMutation]
  )

  const adicionarAreaCriacaoDraft = useCallback(
    (paths: LatLngLiteral[], forma: 'circulo' | 'poligono') => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `rascunho-${crypto.randomUUID()}`
          : `rascunho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setAreasCriacaoDraft(prev => [...prev, { id, paths, forma }])
      onIrParaAbaAreas()
      limparDesenhoEmAndamento()
    },
    [limparDesenhoEmAndamento, onIrParaAbaAreas]
  )

  const handlePoligonoDesenhado = useCallback(
    (paths: LatLngLiteral[]) => {
      try {
        latLngPathsToGeoJsonPolygon(paths)
        adicionarAreaCriacaoDraft(paths, 'poligono')
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Polígono inválido')
        setFerramenta('poligono')
      }
    },
    [adicionarAreaCriacaoDraft]
  )

  const handleCirculoDesenhado = useCallback(
    (centro: LatLngLiteral, raioMetros: number) => {
      try {
        const geometria = geoJsonPolygonDeCirculo(centro, raioMetros)
        adicionarAreaCriacaoDraft(geoJsonToLatLngPath(geometria), 'circulo')
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Círculo inválido')
        setFerramenta('circulo')
      }
    },
    [adicionarAreaCriacaoDraft]
  )

  const handleAreaArrastada = useCallback((areaId: string, paths: LatLngLiteral[]) => {
    setGeometriasAreaDraft(prev => ({ ...prev, [areaId]: paths }))
  }, [])

  const handleAreaRascunhoArrastada = useCallback((id: string, paths: LatLngLiteral[]) => {
    setAreasCriacaoDraft(prev => prev.map(item => (item.id === id ? { ...item, paths } : item)))
  }, [])

  const handleApagarAreaRascunho = useCallback((id: string) => {
    setAreasCriacaoDraft(prev => prev.filter(item => item.id !== id))
  }, [])

  const handleApagarAreaNoMapa = useCallback(
    (areaId: string) => {
      const area = areas.find(item => item.id === areaId)
      if (!area) return
      setAreaExcluindo(area)
    },
    [areas]
  )

  const handleToggleAreaAtivo = useCallback((areaId: string, ativo: boolean) => {
    setAtivosAreaDraft(prev => ({ ...prev, [areaId]: ativo }))
  }, [])

  const taxasPrazosAreaPendentes = useMemo(() => {
    return areas.some(
      area =>
        linhaTaxaPrazoPendente(
          taxasAreaDraft[area.id] ?? '',
          prazosAreaDraft[area.id] ?? '',
          area.valorTaxa,
          area.tempoEntregaInMinutes
        ) || ativoCoberturaPendente(ativosAreaDraft[area.id], area.ativo)
    )
  }, [areas, ativosAreaDraft, prazosAreaDraft, taxasAreaDraft])

  const geometriasAreaPendentes = Object.keys(geometriasAreaDraft).length > 0
  const criacaoAreasPendentes = areasCriacaoDraft.length > 0
  const areasPainelPendentes =
    taxasPrazosAreaPendentes || geometriasAreaPendentes || criacaoAreasPendentes

  const salvandoAreas =
    criarAreaMutation.isPending ||
    atualizarAreaMutation.isPending ||
    atualizarAreasLoteMutation.isPending ||
    excluirAreaMutation.isPending

  const sincronizarDraftsTaxaPrazoAtivo = useCallback(() => {
    setTaxasAreaDraft(
      Object.fromEntries(areas.map(area => [area.id, String(area.valorTaxa).replace('.', ',')]))
    )
    setPrazosAreaDraft(
      Object.fromEntries(areas.map(area => [area.id, String(area.tempoEntregaInMinutes)]))
    )
    setAtivosAreaDraft(Object.fromEntries(areas.map(area => [area.id, area.ativo])))
  }, [areas])

  const descartarAlteracoesAreas = useCallback(() => {
    const tinhaGeometriaOuCriacao =
      Object.keys(geometriasAreaDraft).length > 0 || areasCriacaoDraft.length > 0
    setGeometriasAreaDraft({})
    setAreasCriacaoDraft([])
    limparEdicaoForma()
    limparDesenhoEmAndamento()
    sincronizarDraftsTaxaPrazoAtivo()
    if (tinhaGeometriaOuCriacao) setAreasPoligonosEpoch(n => n + 1)
  }, [
    areasCriacaoDraft.length,
    geometriasAreaDraft,
    limparDesenhoEmAndamento,
    limparEdicaoForma,
    sincronizarDraftsTaxaPrazoAtivo,
  ])

  const handleSalvarTaxasAreasLote = useCallback(async (): Promise<boolean> => {
    const montagem = montarSalvarAreasCobertura({
      areas,
      taxasAreaDraft,
      prazosAreaDraft,
      ativosAreaDraft,
      geometriasAreaDraft,
      areasCriacaoDraft,
    })
    if (!montagem.ok) {
      showToast.error(montagem.erro)
      return false
    }
    const { patches, criacoes } = montagem
    if (patches.length === 0 && criacoes.length === 0) {
      showToast.info('Nenhuma alteração para salvar.')
      return true
    }

    try {
      let criadas = 0
      for (let index = 0; index < criacoes.length; index++) {
        const criacao = criacoes[index]
        await criarAreaMutation.mutateAsync({
          nome: `Área ${areas.length + index + 1}`,
          area: criacao.area,
          valorTaxa: 8,
          tempoEntregaInMinutes: TEMPO_PADRAO_AREA_NOVA,
          ativo: true,
        })
        criadas += 1
        // Remove já persistido — retry não duplica se o lote falhar depois.
        setAreasCriacaoDraft(prev => removerDraftCriacaoPorId(prev, criacao.id))
      }

      if (patches.length > 0) {
        const resultado = await atualizarAreasLoteMutation.mutateAsync(patches)
        if (resultado.ok < resultado.total) {
          showToast.error(mensagemFalhaLoteCobertura(resultado))
          if (criadas > 0) setAreasPoligonosEpoch(n => n + 1)
          return false
        }
      }

      const mudouGeometria = patches.some(p => p.input.area !== undefined)
      setGeometriasAreaDraft({})
      setAreasCriacaoDraft([])
      limparEdicaoForma()
      if (mudouGeometria || criadas > 0) setAreasPoligonosEpoch(n => n + 1)
      showToast.success(mensagemSucessoSalvarAreasCobertura({ criadas, patches }))
      return true
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível salvar as áreas.'
      )
      return false
    }
  }, [
    areas,
    areasCriacaoDraft,
    ativosAreaDraft,
    atualizarAreasLoteMutation,
    criarAreaMutation,
    geometriasAreaDraft,
    limparEdicaoForma,
    prazosAreaDraft,
    taxasAreaDraft,
  ])

  const handleConfirmarExclusaoArea = useCallback(async () => {
    if (!areaExcluindo) return
    try {
      await excluirAreaMutation.mutateAsync(areaExcluindo.id)
      showToast.success('Área excluída.')
      setAreaExcluindo(null)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível excluir a área.')
    }
  }, [areaExcluindo, excluirAreaMutation])

  const cancelarDesenhoPoligono = useCallback(() => {
    if (acoesDesenhoRef.current) acoesDesenhoRef.current.cancelar()
    else limparDesenhoEmAndamento()
  }, [limparDesenhoEmAndamento])

  return {
    areasComDraft,
    areasCriacaoDraft,
    areaFormaEditandoId,
    areaExcluindo,
    setAreaExcluindo,
    ferramenta,
    setFerramenta,
    pontosDesenho,
    podeConcluirDesenho,
    taxasAreaDraft,
    setTaxasAreaDraft,
    prazosAreaDraft,
    setPrazosAreaDraft,
    ativosAreaDraft,
    areasPoligonosEpoch,
    acoesDesenhoRef,
    areasPainelPendentes,
    criacaoAreasPendentes,
    taxasPrazosAreaPendentes,
    geometriasAreaPendentes,
    salvandoAreas,
    salvandoLoteAreas:
      atualizarAreasLoteMutation.isPending || criarAreaMutation.isPending,
    excluindoArea: excluirAreaMutation.isPending,
    limparDesenhoEmAndamento,
    cancelarDesenhoPoligono,
    handleFerramentaChange,
    handleDesenhoEstadoChange,
    handleAcoesDesenhoProntas,
    handleSelecionarAreaParaEditar,
    handleFormaAreaAlterada,
    handleSalvarNomeArea,
    handlePoligonoDesenhado,
    handleCirculoDesenhado,
    handleAreaArrastada,
    handleAreaRascunhoArrastada,
    handleApagarAreaRascunho,
    handleApagarAreaNoMapa,
    handleToggleAreaAtivo,
    handleSalvarTaxasAreasLote,
    descartarAlteracoesAreas,
    handleConfirmarExclusaoArea,
    desenharDesfazer: () => acoesDesenhoRef.current?.desfazer(),
    desenharConcluir: () => acoesDesenhoRef.current?.concluir(),
  }
}
