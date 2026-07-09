import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'

export function mapGruposProdutoToDesignCategorias(
  grupos: GrupoProduto[]
): DesignCategoriaGrupo[] {
  return grupos
    .filter(grupo => grupo.isAtivo() && grupo.isAtivoDelivery())
    .sort((a, b) => {
      const ordemA = a.getOrdem() ?? Number.MAX_SAFE_INTEGER
      const ordemB = b.getOrdem() ?? Number.MAX_SAFE_INTEGER
      if (ordemA !== ordemB) return ordemA - ordemB
      return a.getNome().localeCompare(b.getNome(), 'pt-BR')
    })
    .map(grupo => ({
      id: grupo.getId(),
      nome: grupo.getNome(),
      iconName: grupo.getIconName() || 'restaurant',
      imagemUrl: grupo.getImagemUrl()?.trim() || null,
    }))
}
