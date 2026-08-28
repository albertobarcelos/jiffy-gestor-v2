import {
  MdContentCopy,
  MdAddCircleOutline,
  MdRemoveCircleOutline,
  MdLaunch,
  MdAttachMoney,
} from 'react-icons/md'
import type { ComponentType } from 'react'
import type { ToggleField, ProdutoPatch } from '@/src/shared/types/produto'
import { TaxasIcon } from './TaxasIcon'

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
    successTrue: 'Alteração de preço no Jiffy POS habilitada!',
    successFalse: 'Alteração de preço no Jiffy POS desabilitada!',
  },
  incideTaxa: {
    bodyKey: 'incideTaxa',
    successTrue: 'Incidência de taxa habilitada!',
    successFalse: 'Incidência de taxa desabilitada!',
  },
}

export type ActionIconComponent = ComponentType<{ className?: string }>

export type ActionIconDef =
  | {
      key: string
      /** Texto curto para aria-label */
      ariaLabel: string
      /** Texto completo do tooltip */
      label: string
      Icon: ActionIconComponent
      field: ToggleField
      action?: never
    }
  | {
      key: 'copiar'
      ariaLabel: string
      label: string
      Icon: ActionIconComponent
      action: 'copy'
      field?: never
    }

export const actionIconsConfig: ActionIconDef[] = [
  {
    key: 'acrescentar',
    ariaLabel: 'Permitir acréscimo',
    label:
      'Permite que o operador acrescente valor ao produto no Jiffy POS, útil para personalizações cobradas à parte.',
    Icon: MdAddCircleOutline,
    field: 'permiteAcrescimo',
  },
  {
    key: 'diminuir',
    ariaLabel: 'Permitir desconto',
    label:
      'Permite aplicar desconto neste produto no Jiffy POS, sem alterar o preço base cadastrado.',
    Icon: MdRemoveCircleOutline,
    field: 'permiteDesconto',
  },
  {
    key: 'abrir',
    ariaLabel: 'Abrir complementos automaticamente',
    label:
      'Ao selecionar o produto no Jiffy POS, abre automaticamente a tela de complementos para o cliente escolher.',
    Icon: MdLaunch,
    field: 'abreComplementos',
  },
  {
    key: 'alterar-preco',
    ariaLabel: 'Permitir alterar preço no Jiffy POS',
    label:
      'Permite que o operador altere o preço deste produto no momento da venda no Jiffy POS.',
    Icon: MdAttachMoney,
    field: 'permiteAlterarPreco',
  },
  {
    key: 'incide-taxa',
    ariaLabel: 'Incide taxa',
    label:
      'Quando ativo, este produto entra no cálculo das taxas configuradas (serviço, couvert, etc.) no pedido.',
    Icon: TaxasIcon,
    field: 'incideTaxa',
  },
  {
    key: 'copiar',
    ariaLabel: 'Copiar produto',
    label:
      'Essa função cria uma cópia do produto, mantendo suas informações e imagens. Ideal para produtos similares.',
    Icon: MdContentCopy,
    action: 'copy',
  },
]
