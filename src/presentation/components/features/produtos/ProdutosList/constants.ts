import {
  MdContentCopy,
  MdExtension,
  MdPrint,
  MdStarBorder,
  MdAddCircleOutline,
  MdRemoveCircleOutline,
  MdLaunch,
  MdAttachMoney,
  MdPercent,
} from 'react-icons/md'
import type { IconType } from 'react-icons'
import type { ToggleField, ProdutoPatch } from '@/src/shared/types/produto'

export type { ToggleField }

export interface ToggleFieldConfig {
  bodyKey: keyof ProdutoPatch
  successTrue: string
  successFalse: string
}

export const toggleFieldConfig: Record<ToggleField, ToggleFieldConfig> = {
  favorito: {
    bodyKey: 'favorito',
    successTrue: 'Produto marcado como favorito!',
    successFalse: 'Produto removido dos favoritos!',
  },
  permiteAcrescimo: {
    bodyKey: 'permiteAcrescimo',
    successTrue: 'Acréscimo habilitado para o produto!',
    successFalse: 'Acréscimo desabilitado para o produto!',
  },
  permiteDesconto: {
    bodyKey: 'permiteDesconto',
    successTrue: 'Desconto habilitado para o produto!',
    successFalse: 'Desconto desabilitado para o produto!',
  },
  abreComplementos: {
    bodyKey: 'abreComplementos',
    successTrue: 'Complementos habilitados!',
    successFalse: 'Complementos desabilitados!',
  },
  permiteAlterarPreco: {
    bodyKey: 'permiteAlterarPreco',
    successTrue: 'Alteração de preço no PDV habilitada!',
    successFalse: 'Alteração de preço no PDV desabilitada!',
  },
  incideTaxa: {
    bodyKey: 'incideTaxa',
    successTrue: 'Incidência de taxa habilitada!',
    successFalse: 'Incidência de taxa desabilitada!',
  },
}

export type ActionIconDef =
  | { key: string; label: string; Icon: IconType; field: ToggleField; modal?: never; action?: never }
  | { key: string; label: string; Icon: IconType; modal: 'complementos' | 'impressoras'; field?: never; action?: never }
  | { key: 'copiar'; label: string; Icon: IconType; action: 'copy'; field?: never; modal?: never }

export const actionIconsConfig: ActionIconDef[] = [
  { key: 'copiar', label: 'Copiar produto', Icon: MdContentCopy, action: 'copy' },
  { key: 'complementos', label: 'Complementos vinculados', Icon: MdExtension, modal: 'complementos' },
  { key: 'impressora', label: 'Impressoras vinculadas', Icon: MdPrint, modal: 'impressoras' },
  { key: 'favorito', label: 'Favoritar produto', Icon: MdStarBorder, field: 'favorito' },
  { key: 'acrescentar', label: 'Permitir acréscimo', Icon: MdAddCircleOutline, field: 'permiteAcrescimo' },
  { key: 'diminuir', label: 'Permitir desconto', Icon: MdRemoveCircleOutline, field: 'permiteDesconto' },
  { key: 'abrir', label: 'Permitir abrir complementos', Icon: MdLaunch, field: 'abreComplementos' },
  { key: 'alterar-preco', label: 'Permitir alterar preço no PDV', Icon: MdAttachMoney, field: 'permiteAlterarPreco' },
  { key: 'incide-taxa', label: 'Incide taxa', Icon: MdPercent, field: 'incideTaxa' },
]
