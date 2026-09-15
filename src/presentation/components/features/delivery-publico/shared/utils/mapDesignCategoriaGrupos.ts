import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'

export function imagemUrlDoMenuGrupo(grupo: MenuGrupoProduto): string | null {
  const fromSnapshot = grupo.image?.imageUrl?.trim()
  if (fromSnapshot) return fromSnapshot
  const fromBase = grupo.grupoBase.imagemUrl?.trim()
  return fromBase || null
}

export function mapMenuGruposToDesignCategorias(
  grupos: MenuGrupoProduto[]
): DesignCategoriaGrupo[] {
  return [...grupos]
    .sort((a, b) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
    .map(grupo => ({
      id: grupo.grupoBase.id,
      nome: grupo.nome?.trim() || grupo.grupoBase.nome,
      iconName: grupo.grupoBase.iconName || 'restaurant',
      cor: grupo.grupoBase.corHex || '#CCCCCC',
      imagemUrl: imagemUrlDoMenuGrupo(grupo),
    }))
}

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
      cor: grupo.getCorHex() || '#CCCCCC',
      imagemUrl: grupo.getImagemUrl()?.trim() || null,
    }))
}

