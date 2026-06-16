'use client'

import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdAccessTime, MdAttachMoney, MdPersonOutline, MdStore } from 'react-icons/md'
import { EntregaClienteSelector } from '../../../../EntregaClienteSelector'
import { PedidoInformacoesStep } from '../../PedidoInformacoesStep'
import {
  SEM_TAXA_ENTREGA_VALUE,
  TEMPOS_PREVISTOS_ENTREGA,
} from '@/src/shared/constants/pedidoForm'
import { useNovoPedidoFormContext } from '../../../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../../../context/NovoPedidoUIContext'

export function PedidoInformacoesStepView() {
  const {
    pedidoDeliveryGestor,
    pedidoComEntrega,
    pedidoComRetirada,
    handleTipoAtendimentoDeliveryChange,
    moradaEntregaSelecionada,
    setMoradaEntregaSelecionada,
    clienteEntregaVinculado,
    setClienteEntregaVinculado,
    handleAbrirEdicaoClienteEntrega,
    telefoneBuscaEntrega,
    setTelefoneBuscaEntrega,
    telefoneBuscadoEntrega,
    setTelefoneBuscadoEntrega,
    tempoPrevistoMinutos,
    setTempoPrevistoMinutos,
    taxaEntregaId,
    setTaxaEntregaId,
    taxasEntrega,
    taxasEntregaQuery,
  } = useNovoPedidoFormContext()

  const { empresa, setSeletorClienteOpen } = useNovoPedidoUIContext()

  return (
    <PedidoInformacoesStep>
      {pedidoDeliveryGestor && (
        <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <MdStore className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold text-primary">Tipo de atendimento</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTipoAtendimentoDeliveryChange('entrega')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                pedidoComEntrega
                  ? 'border-secondary bg-secondary text-white'
                  : 'border-gray-200 bg-white text-primary-text hover:border-secondary/50'
              }`}
            >
              Entrega
            </button>
            <button
              type="button"
              onClick={() => handleTipoAtendimentoDeliveryChange('retirada')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                pedidoComRetirada
                  ? 'border-secondary bg-secondary text-white'
                  : 'border-gray-200 bg-white text-primary-text hover:border-secondary/50'
              }`}
            >
              Retirada
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <MdPersonOutline className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-primary">
            {pedidoComEntrega ? 'Cliente e endereço de entrega' : 'Cliente da retirada'}
          </span>
        </div>
        <EntregaClienteSelector
          moradaSelecionada={moradaEntregaSelecionada}
          onMoradaSelecionada={setMoradaEntregaSelecionada}
          clienteVinculado={clienteEntregaVinculado}
          onClienteVinculado={setClienteEntregaVinculado}
          onEditarClientePorDuploClique={handleAbrirEdicaoClienteEntrega}
          onAbrirSeletorCliente={() => setSeletorClienteOpen(true)}
          telefoneExibicaoExterno={telefoneBuscaEntrega}
          onTelefoneExibicaoExternoChange={setTelefoneBuscaEntrega}
          digitosUltimaBuscaExterno={telefoneBuscadoEntrega}
          onDigitosUltimaBuscaExternoChange={setTelefoneBuscadoEntrega}
          enderecoPadrao={{
            cidade: empresa?.cidade,
            estado: empresa?.estado,
          }}
          mostrarEnderecos={pedidoComEntrega}
          usarModuloDeliveryClientes={pedidoDeliveryGestor}
        />
        {pedidoComRetirada ? (
          <div className="mt-3 rounded-lg border border-primary/15 bg-white p-3 text-sm text-secondary-text">
            Pedido configurado para retirada no balcão. Entregador e taxa de entrega não são
            necessários.
          </div>
        ) : null}
        {pedidoComEntrega && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <MdAccessTime className="h-5 w-5 text-primary" />
                <Label className="text-sm font-semibold text-primary-text">Tempo previsto</Label>
              </div>
              <Select
                value={String(tempoPrevistoMinutos)}
                onValueChange={value => setTempoPrevistoMinutos(Number(value) || 30)}
              >
                <SelectTrigger className="border-primary/30 bg-white">
                  <SelectValue placeholder="Selecione o tempo" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPOS_PREVISTOS_ENTREGA.map(minutos => (
                    <SelectItem key={minutos} value={String(minutos)}>
                      {minutos} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <MdAttachMoney className="h-5 w-5 text-primary" />
                <Label className="text-sm font-semibold text-primary-text">Taxa de entrega</Label>
              </div>
              <Select
                value={taxaEntregaId || SEM_TAXA_ENTREGA_VALUE}
                onValueChange={value =>
                  setTaxaEntregaId(value === SEM_TAXA_ENTREGA_VALUE ? '' : value)
                }
                disabled={taxasEntregaQuery.isLoading}
              >
                <SelectTrigger className="border-primary/30 bg-white">
                  <SelectValue
                    placeholder={
                      taxasEntregaQuery.isLoading ? 'Carregando taxas...' : 'Selecionar taxa'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_TAXA_ENTREGA_VALUE}>Sem taxa de entrega</SelectItem>
                  {taxasEntrega.map(taxa => (
                    <SelectItem key={taxa.getId()} value={taxa.getId()}>
                      {taxa.getNome()} - {transformarParaReal(taxa.getValor())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </PedidoInformacoesStep>
  )
}
