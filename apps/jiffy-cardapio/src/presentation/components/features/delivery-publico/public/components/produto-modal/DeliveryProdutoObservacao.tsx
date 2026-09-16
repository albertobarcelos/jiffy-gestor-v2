'use client'

import { DeliveryTextarea } from '../../../shared/components/DeliveryInput'

type DeliveryProdutoObservacaoProps = {
  value: string
  onChange: (value: string) => void
}

export function DeliveryProdutoObservacao({ value, onChange }: DeliveryProdutoObservacaoProps) {
  return (
    <div className="px-4 pb-6 pt-4">
      <DeliveryTextarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        maxLength={100}
        placeholder="Deseja adicionar alguma observação para este item?, escreva aqui..."
      />
    </div>
  )
}
