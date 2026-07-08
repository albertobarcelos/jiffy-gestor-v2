import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export type ComplementosCatalogoCache = {
  gruposComplementos: CatalogoPublicoGrupoComplementoDTO[]
  complementos: CatalogoPublicoComplementoDTO[]
}

export type GrupoComplementoResolvido = CatalogoPublicoGrupoComplementoDTO & {
  complementos: CatalogoPublicoComplementoDTO[]
}

export function chaveComplemento(grupoId: string, complementoId: string): string {
  return `${grupoId}-${complementoId}`
}

export function resolveGruposComplementos(
  cache: ComplementosCatalogoCache | null,
  produto: CatalogoPublicoProdutoDTO
): GrupoComplementoResolvido[] {
  if (!cache || !produto.abreComplementos) return []

  const complementoMap = new Map(cache.complementos.map(c => [c.id, c]))

  return produto.grupoComplementosIds
    .map(grupoId => cache.gruposComplementos.find(g => g.id === grupoId))
    .filter((g): g is CatalogoPublicoGrupoComplementoDTO => !!g)
    .map(grupo => ({
      ...grupo,
      complementos: grupo.complementoIds
        .map(id => complementoMap.get(id))
        .filter((c): c is CatalogoPublicoComplementoDTO => !!c),
    }))
    .filter(g => g.complementos.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

export function somarQuantidadeNoGrupo(
  quantidades: Record<string, number>,
  grupoId: string,
  override?: { key: string; quantidade: number }
): number {
  let total = 0
  const prefix = `${grupoId}-`
  for (const [key, qtd] of Object.entries(quantidades)) {
    if (!key.startsWith(prefix)) continue
    total += override?.key === key ? override.quantidade : Math.max(0, Math.floor(qtd))
  }
  return total
}

export function validarGruposComplementos(
  grupos: GrupoComplementoResolvido[],
  quantidades: Record<string, number>
): { valido: boolean; mensagem?: string } {
  for (const grupo of grupos) {
    const qtd = somarQuantidadeNoGrupo(quantidades, grupo.id)
    const minimo = grupo.obrigatorio ? Math.max(grupo.qtdMinima, 1) : grupo.qtdMinima
    if (minimo > 0 && qtd < minimo) {
      return {
        valido: false,
        mensagem: `Selecione pelo menos ${minimo} em "${grupo.nome}"`,
      }
    }
  }
  return { valido: true }
}
