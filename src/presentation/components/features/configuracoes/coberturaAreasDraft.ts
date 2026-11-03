import type {
  AreaEntregaDTO,
  UpdateAreaEntregaInput,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  latLngPathsToGeoJsonPolygon,
  type GeoJsonPolygon,
  type LatLngLiteral,
} from '@/src/shared/types/geoJsonPolygon'
import {
  ativoCoberturaPendente,
  parsePrazoDraftCobertura,
  parseTaxaDraftCobertura,
} from '@/src/presentation/components/features/configuracoes/coberturaPainelAbas'

/** Área desenhada ainda não persistida — só grava no Salvar do painel. */
export type AreaRascunhoCriacaoCobertura = {
  id: string
  paths: LatLngLiteral[]
  /** Origem do desenho — círculos entram na edição por raio após salvar. */
  forma?: 'circulo' | 'poligono'
}

export type PatchAreaCobertura = {
  id: string
  input: UpdateAreaEntregaInput
}

export type GeometriaCriacaoArea = {
  id: string
  area: GeoJsonPolygon
}

export type ResultadoMontagemAreasCobertura =
  | { ok: true; patches: PatchAreaCobertura[]; criacoes: GeometriaCriacaoArea[] }
  | { ok: false; erro: string }

/**
 * Monta patches de atualização + geometrias de criação a partir dos rascunhos do painel.
 * Puro: validação de taxa/prazo/geometria sem efeitos colaterais.
 */
export function montarSalvarAreasCobertura(params: {
  areas: AreaEntregaDTO[]
  taxasAreaDraft: Record<string, string>
  prazosAreaDraft: Record<string, string>
  ativosAreaDraft: Record<string, boolean>
  geometriasAreaDraft: Record<string, LatLngLiteral[]>
  areasCriacaoDraft: AreaRascunhoCriacaoCobertura[]
}): ResultadoMontagemAreasCobertura {
  const {
    areas,
    taxasAreaDraft,
    prazosAreaDraft,
    ativosAreaDraft,
    geometriasAreaDraft,
    areasCriacaoDraft,
  } = params

  const patches: PatchAreaCobertura[] = []
  for (const area of areas) {
    const input: UpdateAreaEntregaInput = {}
    const brutoTaxa = taxasAreaDraft[area.id]
    if (brutoTaxa != null) {
      const valor = parseTaxaDraftCobertura(brutoTaxa)
      if (valor === null) {
        return {
          ok: false,
          erro: `Taxa inválida em ${area.nome?.trim() || 'área sem nome'}.`,
        }
      }
      if (valor !== area.valorTaxa) input.valorTaxa = valor
    }
    const brutoPrazo = prazosAreaDraft[area.id]
    if (brutoPrazo != null) {
      const minutos = parsePrazoDraftCobertura(brutoPrazo)
      if (minutos === null) {
        return {
          ok: false,
          erro: `Prazo inválido em ${area.nome?.trim() || 'área sem nome'}. Use minutos inteiros.`,
        }
      }
      if (minutos !== area.tempoEntregaInMinutes) input.tempoEntregaInMinutes = minutos
    }
    if (ativoCoberturaPendente(ativosAreaDraft[area.id], area.ativo)) {
      input.ativo = ativosAreaDraft[area.id]
    }
    const pathsDraft = geometriasAreaDraft[area.id]
    if (pathsDraft) {
      try {
        input.area = latLngPathsToGeoJsonPolygon(pathsDraft)
      } catch (error) {
        return {
          ok: false,
          erro:
            error instanceof Error
              ? error.message
              : `Geometria inválida em ${area.nome?.trim() || 'área sem nome'}.`,
        }
      }
    }
    if (
      input.valorTaxa !== undefined ||
      input.tempoEntregaInMinutes !== undefined ||
      input.ativo !== undefined ||
      input.area !== undefined
    ) {
      patches.push({ id: area.id, input })
    }
  }

  const criacoes: GeometriaCriacaoArea[] = []
  for (const draft of areasCriacaoDraft) {
    try {
      criacoes.push({
        id: draft.id,
        area: latLngPathsToGeoJsonPolygon(draft.paths),
      })
    } catch (error) {
      return {
        ok: false,
        erro: error instanceof Error ? error.message : 'Geometria inválida em área nova.',
      }
    }
  }

  return { ok: true, patches, criacoes }
}

export function mensagemSucessoSalvarAreasCobertura(params: {
  criadas: number
  patches: PatchAreaCobertura[]
}): string {
  const { criadas, patches } = params
  const mudouGeometria = patches.some(p => p.input.area !== undefined)
  const mudouTaxa = patches.some(p => p.input.valorTaxa !== undefined)
  const mudouPrazo = patches.some(p => p.input.tempoEntregaInMinutes !== undefined)
  const mudouAtivo = patches.some(p => p.input.ativo !== undefined)

  if (criadas > 0 && patches.length === 0) {
    return criadas === 1
      ? 'Área criada. Clique no nome para editar.'
      : `${criadas} áreas criadas. Clique no nome para editar.`
  }
  if (criadas > 0) return 'Cobertura das áreas atualizada.'
  if (mudouGeometria && !mudouTaxa && !mudouPrazo && !mudouAtivo) {
    return patches.length === 1
      ? 'Posição da área atualizada.'
      : `${patches.length} áreas reposicionadas.`
  }
  if (mudouTaxa && mudouPrazo) return 'Taxas e prazos das áreas atualizados.'
  if (mudouPrazo) {
    return patches.length === 1 ? 'Prazo atualizado.' : `${patches.length} prazos atualizados.`
  }
  if (mudouTaxa) {
    return patches.length === 1 ? 'Taxa atualizada.' : `${patches.length} taxas atualizadas.`
  }
  return 'Cobertura das áreas atualizada.'
}
