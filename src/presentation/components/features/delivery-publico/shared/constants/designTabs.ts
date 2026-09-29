import type { IconType } from 'react-icons'
import {
  MdCategory,
  MdDashboard,
  MdImage,
  MdMenuBook,
  MdPalette,
  MdTextFields,
  MdViewModule,
} from 'react-icons/md'
import { deliveryHubEtapaPath } from '@/src/shared/constants/configuracoesRoutes'
import type { DesignTabId } from '../types/deliveryPublicoDesignConfig'

export type DesignTabDefinition = {
  id: DesignTabId
  /** Título na tela (lobby/seção). */
  label: string
  /** Texto do submenu lateral; se omitido, usa `label`. */
  labelMenu?: string
  descricao: string
  icon: IconType
  cta: string
}

/** Query `?secao=` nas rotas do shell Design (mantém a etapa `/design` montada). */
export const DESIGN_SECTION_QUERY_KEY = 'secao'

/** Query `?aba=` dentro de Modelos (Layout / Cores / Tipografias / Categorias). */
export const DESIGN_MODELOS_ABA_QUERY_KEY = 'aba'

export type DesignModelosAbaId = 'layout' | 'cores' | 'tipografias' | 'categorias'

export type DesignModelosAbaDefinition = {
  id: DesignModelosAbaId
  label: string
  descricao: string
  icon: IconType
}

export const DESIGN_MODELOS_ABAS: DesignModelosAbaDefinition[] = [
  {
    id: 'layout',
    label: 'Layout',
    descricao: 'Estrutura do catálogo na loja pública.',
    icon: MdDashboard,
  },
  {
    id: 'cores',
    label: 'Cores',
    descricao: 'Paleta de cores do cardápio.',
    icon: MdPalette,
  },
  {
    id: 'tipografias',
    label: 'Tipografias',
    descricao: 'Fontes dos títulos e dos textos.',
    icon: MdTextFields,
  },
  {
    id: 'categorias',
    label: 'Categorias',
    descricao: 'Ordem e aparência dos grupos do cardápio.',
    icon: MdCategory,
  },
]

export type DeliveryDesignSectionTabId =
  | 'delivery-design-cardapio'
  | 'delivery-design-cabecalho'
  | 'delivery-design-modelos'
  | 'delivery-design-cores'
  | 'delivery-design-tipografias'
  | 'delivery-design-categorias'

/** Seções do lobby/submenu de Personalizar Loja. Modelos abre um lobby próprio. */
export const DESIGN_TABS: DesignTabDefinition[] = [
  {
    id: 'cardapio',
    label: 'Cardápio',
    descricao: 'Cardápio publicado na loja online e no delivery do Gestor.',
    icon: MdMenuBook,
    cta: 'Abrir',
  },
  {
    id: 'cabecalho',
    label: 'Link e Cabeçalho da Loja',
    labelMenu: 'Link e Cabeçalho',
    descricao: 'Link, nome, logo e capa do cardápio.',
    icon: MdImage,
    cta: 'Abrir',
  },
  {
    id: 'modelos',
    label: 'Modelos de Layout do App Delivery',
    labelMenu: 'Modelos de Layout',
    descricao: 'Layout, cores, tipografias e categorias da loja pública.',
    icon: MdViewModule,
    cta: 'Abrir',
  },
]

/** Seções legadas ainda aceitas em `?secao=` (redirecionam para Modelos + aba). */
export const DESIGN_LEGACY_SECTIONS_TO_MODELOS_ABA: Record<
  'cores' | 'tipografias' | 'categorias',
  DesignModelosAbaId
> = {
  cores: 'cores',
  tipografias: 'tipografias',
  categorias: 'categorias',
}

const DESIGN_NAV_IDS: ReadonlySet<string> = new Set(DESIGN_TABS.map(tab => tab.id))
const DESIGN_ALL_SECTION_IDS: ReadonlySet<string> = new Set([
  ...DESIGN_NAV_IDS,
  'cores',
  'tipografias',
  'categorias',
])

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

export function isDesignNavSectionId(
  value: string | null | undefined
): value is DesignTabId {
  return Boolean(value && DESIGN_NAV_IDS.has(value))
}

/** Aceita seções do lobby e legadas (`cores` / `tipografias` / `categorias`). */
export function isDesignTabId(value: string | null | undefined): value is DesignTabId {
  return Boolean(value && DESIGN_ALL_SECTION_IDS.has(value))
}

export function isDesignModelosAbaId(
  value: string | null | undefined
): value is DesignModelosAbaId {
  return (
    value === 'layout' ||
    value === 'cores' ||
    value === 'tipografias' ||
    value === 'categorias'
  )
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
  if (section === 'cores' || section === 'tipografias' || section === 'categorias') {
    return deliveryHubDesignModelosPath(DESIGN_LEGACY_SECTIONS_TO_MODELOS_ABA[section])
  }
  return `${deliveryHubDesignPath()}?${DESIGN_SECTION_QUERY_KEY}=${section}`
}

/** Lobby de Modelos, ou uma opção (`layout`, `cores`, `tipografias`, `categorias`). */
export function deliveryHubDesignModelosPath(aba?: DesignModelosAbaId): string {
  const base = `${deliveryHubDesignPath()}?${DESIGN_SECTION_QUERY_KEY}=modelos`
  if (!aba) return base
  return `${base}&${DESIGN_MODELOS_ABA_QUERY_KEY}=${aba}`
}
