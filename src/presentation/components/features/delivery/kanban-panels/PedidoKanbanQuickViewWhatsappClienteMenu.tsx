'use client'

import { useState, type MouseEvent } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { MdArrowDropDown } from 'react-icons/md'
import { Menu, MenuItem } from '@mui/material'
import { montarMensagemWhatsappClienteKanban } from '@/src/application/delivery/montarMensagemWhatsappClienteKanban'
import {
  WHATSAPP_CLIENTE_KANBAN_OPCOES,
  type WhatsappClienteKanbanMensagemTipo,
} from '@/src/application/delivery/whatsappClienteKanbanMensagemTipos'
import { Button } from '@/src/presentation/components/ui/button'
import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { abrirWhatsapp, telefoneValidoParaWhatsapp } from '@/src/shared/utils/whatsappLink'
import { showToast } from '@/src/shared/utils/toast'
import type { PedidoKanbanQuickViewData } from './carregarPedidoKanbanQuickView'

const WHATSAPP_GREEN = '#128C7E'

const whatsappButtonSx = {
  borderColor: 'rgba(37, 211, 102, 0.45)',
  color: WHATSAPP_GREEN,
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

function impedirPropagacaoParaCardKanban(event: MouseEvent) {
  event.stopPropagation()
}

interface PedidoKanbanQuickViewWhatsappClienteMenuProps {
  dados: PedidoKanbanQuickViewData
  enderecoEmpresa: EnderecoEmpresaMe | null | undefined
  tipoVenda: 'entrega' | 'retirada'
}

export function PedidoKanbanQuickViewWhatsappClienteMenu({
  dados,
  enderecoEmpresa,
  tipoVenda,
}: PedidoKanbanQuickViewWhatsappClienteMenuProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const telefoneCliente = dados.detalhesEntrega.clienteCelular
  const celularValido = telefoneValidoParaWhatsapp(telefoneCliente)
  const menuAberto = Boolean(menuAnchor)

  const abrirMenu = (event: MouseEvent<HTMLButtonElement>) => {
    impedirPropagacaoParaCardKanban(event)
    if (!celularValido) return
    setMenuAnchor(event.currentTarget)
  }

  const fecharMenu = () => {
    setMenuAnchor(null)
  }

  const enviarMensagem = (tipoMensagem: WhatsappClienteKanbanMensagemTipo) => {
    fecharMenu()

    if (!telefoneValidoParaWhatsapp(telefoneCliente)) {
      showToast.error('Cadastre um celular válido para o cliente.')
      return
    }

    const mensagem = montarMensagemWhatsappClienteKanban({
      clienteNome: dados.clienteNome,
      tipoMensagem,
      tipoVenda,
      dados,
      enderecoEmpresa,
    })

    const abriu = abrirWhatsapp(telefoneCliente, mensagem)
    if (!abriu) {
      showToast.error('Não foi possível abrir o WhatsApp para o cliente.')
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outlined"
        className="!min-h-0 !w-full !py-1 !text-[10px]"
        sx={whatsappButtonSx}
        onClick={abrirMenu}
        disabled={!celularValido}
        startIcon={<FaWhatsapp size={13} />}
        endIcon={<MdArrowDropDown size={16} />}
        title={
          celularValido
            ? 'Escolher mensagem para o cliente via WhatsApp'
            : 'Cliente sem celular cadastrado'
        }
        aria-haspopup="menu"
        aria-expanded={menuAberto}
      >
        Cliente
      </Button>

      <Menu
        anchorEl={menuAnchor}
        open={menuAberto}
        onClose={fecharMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            onPointerDown: impedirPropagacaoParaCardKanban,
            onMouseDown: impedirPropagacaoParaCardKanban,
            onTouchStart: impedirPropagacaoParaCardKanban,
            sx: {
              minWidth: 168,
              mt: -0.5,
            },
          },
          list: {
            dense: true,
            sx: { py: 0.25 },
          },
        }}
      >
        {WHATSAPP_CLIENTE_KANBAN_OPCOES.map(opcao => (
          <MenuItem
            key={opcao.tipo}
            onClick={event => {
              impedirPropagacaoParaCardKanban(event)
              enviarMensagem(opcao.tipo)
            }}
            sx={{
              fontSize: '0.75rem',
              py: 0.25,
              minHeight: 28,
              color: WHATSAPP_GREEN,
              '&:hover': {
                color: WHATSAPP_GREEN,
                backgroundColor: 'rgba(37, 211, 102, 0.08)',
              },
            }}
          >
            {opcao.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
