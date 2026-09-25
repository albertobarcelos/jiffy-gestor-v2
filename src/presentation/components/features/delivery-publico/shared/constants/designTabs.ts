import type { IconType } from 'react-icons'
import {
  MdCategory,
  MdImage,
  MdLink,
  MdPalette,
  MdTextFields,
  MdViewModule,
} from 'react-icons/md'
import { deliveryHubEtapaPath } from '@/src/shared/constants/configuracoesRoutes'
import type { DesignTabId } from '../types/deliveryPublicoDesignConfig'

export type DesignTabDefinition = {
  id: DesignTabId
  label: string
  descricao: string
  icon: IconType
  cta: string
}

/** Query `?secao=` nas rotas do shell Design (mantém a etapa `/design` montada). */
export const DESIGN_SECTION_QUERY_KEY = 'secao'

export type DeliveryDesignSectionTabId =
  | 'delivery-design-cardapio'
  | 'delivery-design-cabecalho'
  | 'delivery-design-modelos'
  | 'delivery-design-cores'
  | 'delivery-design-tipografias'
  | 'delivery-design-categorias'

export const DESIGN_TABS: DesignTabDefinition[] = [
  {
    id: 'cardapio',
    label: 'Cardápio e Link da Loja',
    descricao: 'Cardápio publicado e link público da loja.',
    icon: MdLink,
    cta: 'Abrir',
  },
  {
    id: 'cabecalho',
    label: 'Cabeçalho',
    descricao: 'Nome, logo e capa do cardápio.',
    icon: MdImage,
    cta: 'Abrir',
  },
  {
    id: 'modelos',
    label: 'Modelos',
    descricao: 'Layout visual da loja pública.',
    icon: MdViewModule,
    cta: 'Abrir',
  },
  {
    id: 'cores',
    label: 'Cores',
    descricao: 'Paleta e identidade visual.',
    icon: MdPalette,
    cta: 'Abrir',
  },
  {
    id: 'tipografias',
    label: 'Tipografias',
    descricao: 'Estilo das fontes do cardápio.',
    icon: MdTextFields,
    cta: 'Abrir',
  },
  {
    id: 'categorias',
    label: 'Categorias',
    descricao: 'Títulos, banners e ordem dos grupos.',
    icon: MdCategory,
    cta: 'Abrir',
  },
]

const DESIGN_TAB_IDS: ReadonlySet<string> = new Set(DESIGN_TABS.map(tab => tab.id))

const SECTION_TO_TAB_ID: Record<DesignTabId, DeliveryDesignSectionTabId> = {
  cardapio: 'delivery-design-cardapio',
  cabecalho: 'delivery-design-cabecalho',
  modelos: 'delivery-design-modelos',
  cores: 'delivery-design-cores',
  tipografias: 'delivery-design-tipografias',
  categorias: 'delivery-design-categorias',
}

const TAB_ID_TO_SECTION = Object.fromEntries(
  Object.entries(SECTION_TO_TAB_ID).map(([section, tabId]) => [tabId, section])
) as Record<DeliveryDesignSectionTabId, DesignTabId>

export function isDesignTabId(value: string | null | undefined): value is DesignTabId {
  return Boolean(value && DESIGN_TAB_IDS.has(value))
}

export function isDeliveryDesignSectionTabId(
  value: string | null | undefined
): value is DeliveryDesignSectionTabId {
  return Boolean(value && value in TAB_ID_TO_SECTION)
}

export function designSectionTabId(section: DesignTabId): DeliveryDesignSectionTabId {
  return SECTION_TO_TAB_ID[section]
}

export function designSectionFromTabId(
  tabId: string | null | undefined
): DesignTabId | null {
  if (!isDeliveryDesignSectionTabId(tabId)) return null
  return TAB_ID_TO_SECTION[tabId]
}

/** Path do lobby Design. */
export function deliveryHubDesignPath(): string {
  return deliveryHubEtapaPath('delivery-design')
}

/** Path da seção no shell Design (`/config/delivery/design?secao=...`). */
export function deliveryHubDesignSectionPath(section: DesignTabId): string {
  return `${deliveryHubDesignPath()}?${DESIGN_SECTION_QUERY_KEY}=${section}`
}
