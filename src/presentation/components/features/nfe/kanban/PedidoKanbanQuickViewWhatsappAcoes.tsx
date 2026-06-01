'use client'

import { FaWhatsapp } from 'react-icons/fa'
import { montarMensagemWhatsappClienteKanban } from '@/src/application/delivery/montarMensagemWhatsappClienteKanban'
import { montarMensagemWhatsappEntregadorKanban } from '@/src/application/delivery/montarMensagemWhatsappEntregadorKanban'
import { Button } from '@/src/presentation/components/ui/button'
import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { abrirWhatsapp, telefoneValidoParaWhatsapp } from '@/src/shared/utils/whatsappLink'
import { showToast } from '@/src/shared/utils/toast'
import type { PedidoKanbanQuickViewData } from './carregarPedidoKanbanQuickView'
import type { ColunaKanbanId } from './types'

interface PedidoKanbanQuickViewWhatsappAcoesProps {
  dados: PedidoKanbanQuickViewData
  nomeEmpresa: string
  enderecoEmpresa: EnderecoEmpresaMe | null | undefined
  colunaAtual: ColunaKanbanId
  tipoVenda: 'entrega' | 'retirada'
}

const whatsappButtonSx = {
  borderColor: 'rgba(37, 211, 102, 0.45)',
  color: '#128C7E',
  '&:hover': {
    borderColor: '#25D366',
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
  },
  '& .MuiButton-startIcon': {
    color: 'inherit',
  },
  '&.Mui-disabled': {
    borderColor: 'rgba(0, 0, 0, 0.12)',
    color: 'rgba(0, 0, 0, 0.38)',
  },
} as const

function enviarWhatsapp(telefone: string | null | undefined, mensagem: string, alvo: string) {
  if (!telefoneValidoParaWhatsapp(telefone)) {
    showToast.error(`Cadastre um celular válido para o ${alvo}.`)
    return
  }
  const abriu = abrirWhatsapp(telefone, mensagem)
  if (!abriu) {
    showToast.error(`Não foi possível abrir o WhatsApp para o ${alvo}.`)
  }
}

export function PedidoKanbanQuickViewWhatsappAcoes({
  dados,
  nomeEmpresa,
  enderecoEmpresa,
  colunaAtual,
  tipoVenda,
}: PedidoKanbanQuickViewWhatsappAcoesProps) {
  const telefoneCliente = dados.detalhesEntrega.clienteCelular
  const telefoneEntregador = dados.telefoneEntregador
  const exibirEntregador = tipoVenda === 'entrega'

  const handleCliente = () => {
    const mensagem = montarMensagemWhatsappClienteKanban({
      clienteNome: dados.clienteNome,
      colunaAtual,
      tipoVenda,
      dados,
      enderecoEmpresa,
      nomeEmpresa,
    })
    enviarWhatsapp(telefoneCliente, mensagem, 'cliente')
  }

  const handleEntregador = () => {
    const mensagem = montarMensagemWhatsappEntregadorKanban({ dados, nomeEmpresa })
    enviarWhatsapp(telefoneEntregador, mensagem, 'entregador')
  }

  return (
    <div className={`grid gap-1 pt-1 ${exibirEntregador ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <Button
        size="sm"
        variant="outlined"
        className="!min-h-0 !py-1 !text-[10px]"
        sx={whatsappButtonSx}
        onClick={handleCliente}
        disabled={!telefoneValidoParaWhatsapp(telefoneCliente)}
        startIcon={<FaWhatsapp size={13} />}
        title={
          telefoneValidoParaWhatsapp(telefoneCliente)
            ? 'Enviar mensagem ao cliente via WhatsApp'
            : 'Cliente sem celular cadastrado'
        }
      >
        Cliente
      </Button>

      {exibirEntregador && (
        <Button
          size="sm"
          variant="outlined"
          className="!min-h-0 !py-1 !text-[10px]"
          sx={whatsappButtonSx}
          onClick={handleEntregador}
          disabled={!telefoneValidoParaWhatsapp(telefoneEntregador)}
          startIcon={<FaWhatsapp size={13} />}
          title={
            telefoneValidoParaWhatsapp(telefoneEntregador)
              ? 'Enviar dados da entrega ao entregador via WhatsApp'
              : 'Entregador sem celular cadastrado'
          }
        >
          Entregador
        </Button>
      )}
    </div>
  )
}
