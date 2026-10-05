import type { IconType } from 'react-icons'
import { FaWhatsapp } from 'react-icons/fa'
import {
  MdCategory,
  MdImage,
  MdPalette,
  MdStorefront,
  MdTextFields,
  MdViewModule,
} from 'react-icons/md'
import type { DesignTabId } from '../types/deliveryPublicoDesignConfig'

/** Seções abríveis no workspace de Personalizar loja (inclui extras além do design visual). */
export type DesignSectionId = DesignTabId | 'notificacoes' | 'nome-cardapio'

export type DesignSectionDefinition = {
  id: DesignSectionId
  label: string
  description: string
  Icon: IconType
  /** Preview mobile do cardápio — false para seções que não alteram o visual. */
  showsPreview: boolean
}

const DESIGN_EXTRA_SECTION_IDS = new Set<DesignSectionId>(['notificacoes', 'nome-cardapio'])

export const DESIGN_SECTIONS: DesignSectionDefinition[] = [
  {
    id: 'nome-cardapio',
    label: 'Nome da loja e cardápio',
    description: 'Defina o slug do link público e o cardápio (menu) publicado na loja online.',
    Icon: MdStorefront,
    showsPreview: false,
  },
  {
    id: 'cabecalho',
    label: 'Cabeçalho',
    description: 'Nome de exibição, logo e capa da loja no cardápio público.',
    Icon: MdImage,
    showsPreview: true,
  },
  {
    id: 'modelos',
    label: 'Modelos',
    description:
      'Escolha a estrutura do catálogo. Cores, fontes e demais opções do design aplicam em qualquer modelo.',
    Icon: MdViewModule,
    showsPreview: true,
  },
  {
    id: 'cores',
    label: 'Cores',
    description: 'Escolha a paleta de cores da loja. Teste no preview antes de publicar.',
    Icon: MdPalette,
    showsPreview: true,
  },
  {
    id: 'tipografias',
    label: 'Tipografias',
    description: 'Estilo de títulos e textos do cardápio. Teste no preview antes de publicar.',
    Icon: MdTextFields,
    showsPreview: true,
  },
  {
    id: 'categorias',
    label: 'Categorias',
    description: 'Ordem e aparência dos grupos de produtos no cardápio.',
    Icon: MdCategory,
    showsPreview: true,
  },
  {
    id: 'notificacoes',
    label: 'Notificações WhatsApp',
    description: 'Avisos automáticos do pedido no WhatsApp do cliente.',
    Icon: FaWhatsapp,
    showsPreview: false,
  },
]

/** @deprecated Preferir DESIGN_SECTIONS. Mantido para imports legados de abas visuais. */
export const DESIGN_TABS = DESIGN_SECTIONS.filter(
  (section): section is DesignSectionDefinition & { id: DesignTabId } =>
    !DESIGN_EXTRA_SECTION_IDS.has(section.id)
)

export function getDesignSectionById(
  id: DesignSectionId
): DesignSectionDefinition | undefined {
  return DESIGN_SECTIONS.find(section => section.id === id)
}

export function designSectionShowsPreview(id: DesignSectionId | 'home'): boolean {
  if (id === 'home') return false
  return getDesignSectionById(id)?.showsPreview === true
}
