import type { DeliveryLayoutId } from '../types/deliveryPublicoDesignConfig'

export type LayoutModelDefinition = {
  id: DeliveryLayoutId
  nome: string
  descricao: string
  premium: boolean
  disponivel: boolean
}

export const LAYOUT_MODELS: LayoutModelDefinition[] = [
  {
    id: 'basico',
    nome: 'Básico',
    descricao: 'Design simples e funcional',
    premium: false,
    disponivel: true,
  },
  {
    id: 'vitrine',
    nome: 'Vitrine',
    descricao: 'Fotos grandes',
    premium: true,
    disponivel: false,
  },
  {
    id: 'grade',
    nome: 'Grade',
    descricao: 'Estrutura em blocos',
    premium: true,
    disponivel: false,
  },
  {
    id: 'catalogo',
    nome: 'Catálogo',
    descricao: 'Navegação fluida',
    premium: true,
    disponivel: false,
  },
]
