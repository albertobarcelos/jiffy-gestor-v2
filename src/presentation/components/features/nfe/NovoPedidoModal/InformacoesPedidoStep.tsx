'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { MdDelete, MdSearch, MdPersonOutline, MdStore, MdInfo } from 'react-icons/md'
import type { OrigemVenda, StatusVenda } from './novoPedidoModal.types'

export interface StatusPedidoOption {
  value: string
  label: string
}

export interface InformacoesPedidoStepProps {
  clienteNome: string
  onOpenSeletorCliente: () => void
  onRemoveCliente: () => void
  origem: OrigemVenda
  onOrigemChange: (v: OrigemVenda) => void
  status: StatusVenda
  onStatusChange: (v: StatusVenda) => void
  statusDisponiveis: StatusPedidoOption[]
}

/**
 * Passo 1: cliente opcional, origem e status do pedido.
 */
export function InformacoesPedidoStep({
  clienteNome,
  onOpenSeletorCliente,
  onRemoveCliente,
  origem,
  onOrigemChange,
  status,
  onStatusChange,
  statusDisponiveis,
}: InformacoesPedidoStepProps) {
  return (
    <div className="space-y-3 py-2">
      <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-2">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <MdPersonOutline className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-primary">Cliente (Opcional)</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={clienteNome}
            placeholder="Nenhum cliente selecionado"
            inputProps={{ readOnly: true }}
            className="flex-1 cursor-pointer border-primary/30 bg-white"
            onClick={() => onOpenSeletorCliente()}
            sx={{
              '& .MuiOutlinedInput-root': {
                padding: '4px 8px',
                '& input': {
                  padding: '4px 8px',
                },
              },
            }}
          />
          {clienteNome && (
            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={onRemoveCliente}
              className="flex-shrink-0 border-primary/30 hover:border-red-300 hover:bg-red-50"
            >
              <MdDelete className="h-4 w-4 text-red-600" />
            </Button>
          )}
          <Button
            type="button"
            variant="outlined"
            onClick={() => onOpenSeletorCliente()}
            className="flex-shrink-0 border-primary/30 hover:bg-primary/10"
          >
            <MdSearch className="h-4 w-4 text-primary" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-2">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <MdStore className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-primary">Origem do Pedido</span>
        </div>
        <Select value={origem} onValueChange={value => onOrigemChange(value as OrigemVenda)}>
          <SelectTrigger className="border-primary/30 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GESTOR">Gestor (Manual)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-2">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <MdInfo className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-primary">Status do Pedido</span>
        </div>
        <Select value={status} onValueChange={value => onStatusChange(value as StatusVenda)}>
          <SelectTrigger className="border-primary/30 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusDisponiveis.map(st => (
              <SelectItem key={st.value} value={st.value} disabled={st.value === 'ABERTA'}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
