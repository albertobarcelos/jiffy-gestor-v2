'use client'

import Image from 'next/image'
import { ClipboardList, MapPin, MessageCircle } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { abrirWhatsapp, telefoneValidoParaWhatsapp } from '@/src/shared/utils/whatsappLink'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type DeliveryCheckoutSucessoModalProps = {
  nomeCliente: string
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  telefoneEmpresa: string | null
  nomeEmpresa: string | null
  codigoVenda: string | null
  onVerPedido: () => void
  onVoltarAoCardapio: () => void
}

function primeiroNome(nome: string): string {
  const part = nome.trim().split(/\s+/)[0]
  return part || ''
}

export function DeliveryCheckoutSucessoModal({
  nomeCliente,
  tipoEntrega,
  modoTempo,
  enderecoCliente,
  enderecoEmpresaTexto,
  telefoneEmpresa,
  nomeEmpresa,
  codigoVenda,
  onVerPedido,
  onVoltarAoCardapio,
}: DeliveryCheckoutSucessoModalProps) {
  const isEntrega = tipoEntrega === 'entrega'
  const nomeCurto = primeiroNome(nomeCliente)
  const titulo = nomeCurto ? `Obrigado, ${nomeCurto}!` : 'Pedido enviado!'

  const orientacao = isEntrega
    ? 'Seu pedido será preparado e, em breve, chegará no endereço cadastrado.'
    : 'Seu pedido será preparado. Quando estiver pronto, retire no endereço da loja.'

  const enderecoResumo = isEntrega
    ? enderecoCliente
      ? formatarResumoEnderecoPublico(enderecoCliente)
      : null
    : enderecoEmpresaTexto

  const podeWhatsapp = telefoneValidoParaWhatsapp(telefoneEmpresa)
  const mensagemWhatsapp = nomeEmpresa
    ? `Olá! Acabei de fazer um pedido pelo delivery de ${nomeEmpresa}.`
    : 'Olá! Acabei de fazer um pedido pelo delivery.'

  return (
    <>
      <DeliveryCheckoutShellHeader
        title="Pedido confirmado"
        showBack={false}
        headerTone="dark"
      />

      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col items-center px-1 pb-6 pt-4 text-center">
          <div className="relative mb-4 h-28 w-28" aria-hidden>
            <Image
              src="/images/jiffy-acenando.png"
              alt=""
              fill
              sizes="112px"
              className="object-contain"
              priority
            />
          </div>

          <h3 className="delivery-font-title text-xl font-semibold delivery-text-primary">
            {titulo}
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed delivery-text-secondary">
            {orientacao}
          </p>

          {codigoVenda ? (
            <div
              className="mt-4 w-full rounded-xl border px-3 py-3"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              <p className="text-xs delivery-text-secondary">Código do pedido</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums delivery-text-primary">
                {codigoVenda}
              </p>
            </div>
          ) : null}

          {modoTempo === 'agendado' ? (
            <p className="mt-2 text-sm font-medium delivery-text-primary">
              {isEntrega
                ? 'A entrega será conforme o horário combinado.'
                : 'A retirada será conforme o horário combinado.'}
            </p>
          ) : null}

          {enderecoResumo ? (
            <div
              className="mt-5 w-full rounded-xl border p-3 text-left"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                >
                  <MapPin
                    className="h-5 w-5"
                    style={{ color: 'var(--delivery-text-muted)' }}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs delivery-text-secondary">
                    {isEntrega ? 'Endereço de entrega' : 'Local de retirada'}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold delivery-text-primary">
                    {enderecoResumo}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="mt-4 w-full rounded-xl border p-3 text-left"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            <div className="flex items-start gap-3">
              <MessageCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: 'var(--delivery-primary)' }}
                aria-hidden
              />
              <p className="text-sm leading-relaxed delivery-text-secondary">
                Você poderá receber atualizações do andamento do pedido pelo WhatsApp no celular
                informado no checkout.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DeliveryCheckoutShellFooter>
        <div className="flex w-full flex-col">
          <button
            type="button"
            onClick={onVerPedido}
            className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 text-base font-semibold"
            style={{
              borderBottom: '1px solid var(--delivery-border)',
              color: 'var(--delivery-text-primary)',
              backgroundColor: 'var(--delivery-surface)',
            }}
          >
            <ClipboardList className="h-5 w-5" aria-hidden />
            Ver pedido
          </button>
          {podeWhatsapp ? (
            <button
              type="button"
              onClick={() => abrirWhatsapp(telefoneEmpresa, mensagemWhatsapp)}
              className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 text-base font-semibold"
              style={{
                borderBottom: '1px solid var(--delivery-border)',
                color: '#25D366',
                backgroundColor: 'var(--delivery-surface)',
              }}
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Falar com a loja
            </button>
          ) : null}
          <button
            type="button"
            onClick={onVoltarAoCardapio}
            className="flex min-h-[3.5rem] w-full items-center justify-center border-0 bg-black text-base font-semibold text-white"
            style={{
              paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
            }}
          >
            Voltar ao cardápio
          </button>
        </div>
      </DeliveryCheckoutShellFooter>
    </>
  )
}
