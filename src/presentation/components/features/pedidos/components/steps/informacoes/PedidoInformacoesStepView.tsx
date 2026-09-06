'use client'

import { useCallback, useRef } from 'react'
import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdAccessTime, MdAttachMoney, MdPersonOutline, MdStore } from 'react-icons/md'
import {
  EntregaClienteSelector,
  type CoberturaMoradaSelecionadaStatus,
} from '@/src/presentation/components/features/delivery/components/EntregaClienteSelector'
import { PedidoInformacoesStep } from '../../PedidoInformacoesStep'
import { TEMPOS_PREVISTOS_ENTREGA } from '@/src/shared/constants/pedidoForm'
import {
  TAXA_ENTREGA_SELECT_AUTOMATICA,
  TAXA_ENTREGA_SEM_TAXA_ID,
  taxaEntregaIdParaSelect,
  selectValueParaTaxaEntregaId,
  resolverModoTaxaEntregaOverride,
} from '@/src/shared/constants/taxaEntregaPedido'
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
    enderecoEntregaCoberturaValorTaxa,
    setEnderecoEntregaCoberturaStatus,
    setEnderecoEntregaCoberturaValorTaxa,
    taxaEntregaId,
    setTaxaEntregaId,
    taxasEntrega,
    valorTaxaEntrega,
  } = useNovoPedidoFormContext()

  const { empresa, setSeletorClienteOpen } = useNovoPedidoUIContext()
  const ultimaMoradaAutoTempoRef = useRef<string | null>(null)
  const ultimaMoradaIdRef = useRef<string | null>(null)

  const resetOverrideSeMudouMorada = useCallback(
    (moradaId: string | undefined) => {
      if (!moradaId) return
      if (ultimaMoradaIdRef.current && ultimaMoradaIdRef.current !== moradaId) {
        setTaxaEntregaId('')
      }
      ultimaMoradaIdRef.current = moradaId
    },
    [setTaxaEntregaId]
  )

  const handleCoberturaMoradaChange = useCallback(
    (cobertura: CoberturaMoradaSelecionadaStatus) => {
      switch (cobertura.status) {
        case 'coberta': {
          resetOverrideSeMudouMorada(cobertura.moradaId)
          setEnderecoEntregaCoberturaStatus('ok')
          setEnderecoEntregaCoberturaValorTaxa(cobertura.valorTaxa)
          if (
            cobertura.moradaId !== ultimaMoradaAutoTempoRef.current &&
            cobertura.tempoEntregaInMinutes > 0 &&
            TEMPOS_PREVISTOS_ENTREGA.includes(cobertura.tempoEntregaInMinutes)
          ) {
            ultimaMoradaAutoTempoRef.current = cobertura.moradaId
            setTempoPrevistoMinutos(cobertura.tempoEntregaInMinutes)
          }
          break
        }
        case 'fora':
          setEnderecoEntregaCoberturaStatus('fora')
          setEnderecoEntregaCoberturaValorTaxa(null)
          break
        case 'loading':
          setEnderecoEntregaCoberturaStatus('pendente')
          break
        case 'erro':
          setEnderecoEntregaCoberturaStatus('indisponivel')
          setEnderecoEntregaCoberturaValorTaxa(null)
          break
        case 'sem_geo':
        case 'null':
        default:
          ultimaMoradaIdRef.current = null
          ultimaMoradaAutoTempoRef.current = null
          setTaxaEntregaId('')
          setEnderecoEntregaCoberturaStatus(null)
          setEnderecoEntregaCoberturaValorTaxa(null)
          break
      }
    },
    [
      resetOverrideSeMudouMorada,
      setEnderecoEntregaCoberturaStatus,
      setEnderecoEntregaCoberturaValorTaxa,
      setTempoPrevistoMinutos,
      setTaxaEntregaId,
    ]
  )

  const modoTaxa = resolverModoTaxaEntregaOverride(taxaEntregaId)
  const labelAutomatica =
    enderecoEntregaCoberturaValorTaxa == null
      ? moradaEntregaSelecionada
        ? 'Automática (calculando…)'
        : 'Automática (selecione o endereço)'
      : `Automática (${transformarParaReal(enderecoEntregaCoberturaValorTaxa)})`

  const hintTaxa =
    modoTaxa === 'automatica'
      ? 'Padrão da área/raio. Pode remover ou trocar por uma taxa do catálogo.'
      : modoTaxa === 'sem_taxa'
        ? 'Sem taxa neste pedido. O total do pagamento já ignora a entrega.'
        : `Taxa do catálogo: ${transformarParaReal(valorTaxaEntrega)}.`

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
          onAbrirCadastroCliente={handleAbrirEdicaoClienteEntrega}
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
          tempoPrevistoMinutos={pedidoComEntrega ? tempoPrevistoMinutos : null}
          onCoberturaMoradaSelecionadaChange={
            pedidoDeliveryGestor && pedidoComEntrega ? handleCoberturaMoradaChange : undefined
          }
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
              <p className="mt-1.5 text-[11px] text-secondary-text">
                Pode ajustar o tempo; o valor escolhido vale no pedido e no card do endereço.
              </p>
            </div>

            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <MdAttachMoney className="h-5 w-5 text-primary" />
                <Label className="text-sm font-semibold text-primary-text">Taxa de entrega</Label>
              </div>
              <Select
                value={taxaEntregaIdParaSelect(taxaEntregaId)}
                onValueChange={value => setTaxaEntregaId(selectValueParaTaxaEntregaId(value))}
              >
                <SelectTrigger className="border-primary/30 bg-white">
                  <SelectValue placeholder="Taxa de entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TAXA_ENTREGA_SELECT_AUTOMATICA}>{labelAutomatica}</SelectItem>
                  <SelectItem value={TAXA_ENTREGA_SEM_TAXA_ID}>Sem taxa</SelectItem>
                  {taxasEntrega.map(taxa => (
                    <SelectItem key={taxa.getId()} value={taxa.getId()}>
                      {`${taxa.getNome()} — ${transformarParaReal(taxa.getValor())}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-secondary-text">{hintTaxa}</p>
            </div>
          </div>
        )}
      </div>
    </PedidoInformacoesStep>
  )
}
