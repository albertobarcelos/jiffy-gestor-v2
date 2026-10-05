'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

const JIFFY_SITE_URL = 'https://jiffy.run/'

type DeliveryPublicoLojaFooterProps = {
  config: DeliveryPublicoDesignConfig
  enderecoTexto?: string | null
  telefoneTexto?: string | null
  cnpjTexto?: string | null
}

function enderecoSemBrasil(texto: string): string {
  return texto
    .replace(/,?\s*Brasil\s*$/i, '')
    .replace(/,\s*$/, '')
    .trim()
}

export function DeliveryPublicoLojaFooter({
  config,
  enderecoTexto,
  telefoneTexto,
  cnpjTexto,
}: DeliveryPublicoLojaFooterProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const ano = new Date().getFullYear()
  const cnpj = cnpjTexto?.trim() || ''
  const endereco = enderecoSemBrasil(enderecoTexto?.trim() || '')
  const telefone = telefoneTexto?.trim() || ''
  const enderecoTelefone = [endereco, telefone].filter(Boolean).join(' | ')

  return (
    <div className="mt-auto">
      {/* Separação do último card da lista — fora do fundo preto */}
      <div className="h-4 shrink-0" aria-hidden />
      <footer
        className="px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] text-center text-white"
        style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
      >
        <p className="text-lg font-bold uppercase leading-tight tracking-wide">
          {nomeLoja} - {ano}.
        </p>
        <p className="mt-0.5 text-sm leading-tight text-white/90">
          Todos os direitos reservados
        </p>
        {cnpj ? (
          <p className="mt-0.5 text-sm leading-tight text-white/85">CNPJ - {cnpj}</p>
        ) : null}
        {enderecoTelefone ? (
          <p className="mt-0.5 text-sm leading-tight text-white/85">{enderecoTelefone}</p>
        ) : null}
        <p className="mt-0.5 text-sm leading-tight text-white/70">
          Criado por{' '}
          <a
            href={JIFFY_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white underline-offset-2 hover:underline"
          >
            Jiffy POS
          </a>
          {' | Mais rápido. Mais Simples'}
        </p>
      </footer>
    </div>
  )
}
