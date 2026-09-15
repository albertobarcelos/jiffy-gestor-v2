import type { DeliveryLayoutId } from '../types/deliveryPublicoDesignConfig'

export type LayoutModelDefinition = {
  id: DeliveryLayoutId
  nome: string
  descricao: string
  premium: boolean
  /** Layout totalmente implementado no app público (false = stub "em breve"). */
  disponivel: boolean
  /** Pode ser publicado no cardápio público (demais modelos: preview no designer apenas). */
  publicavel: boolean
}

export const LAYOUT_MODELS: LayoutModelDefinition[] = [
  {
    id: 'basico',
    nome: 'Básico',
    descricao: 'Design simples e funcional',
    premium: false,
    disponivel: true,
    publicavel: true,
  },
  {
    id: 'vitrine',
    nome: 'Vitrine',
    descricao: 'Fotos grandes',
    premium: true,
    disponivel: true,
    publicavel: false,
  },
  {
    id: 'grade',
    nome: 'Grade',
    descricao: 'Estrutura em blocos',
    premium: true,
    disponivel: true,
    publicavel: false,
  },
  {
    id: 'catalogo',
    nome: 'Catálogo',
    descricao: 'Navegação fluida',
    premium: true,
    disponivel: true,
    publicavel: false,
  },
]

export function canPublishLayout(layoutId: DeliveryLayoutId): boolean {
  return LAYOUT_MODELS.find(m => m.id === layoutId)?.publicavel ?? false
}
