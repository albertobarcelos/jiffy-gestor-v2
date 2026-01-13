'use client'

import React from 'react'
import { RiBeerFill } from 'react-icons/ri'

interface TipoVendaIconProps {
  tipoVenda: 'mesa' | 'balcao'
  numeroMesa?: number | string | null
  className?: string
  size?: number // Adicionado a prop size
  // Props opcionais para customização de cores (usado apenas quando necessário)
  corPrincipal?: string // Cor principal (alternate) - padrão: var(--color-alternate)
  corSecundaria?: string // Cor secundária (info) - padrão: var(--color-info)
  corTexto?: string // Cor do texto/número - padrão: var(--color-alternate)
  corCirculoInterno?: string // Cor opcional apenas do círculo interno
  corBorda?: string // Cor da borda - padrão: rgba(131, 56, 236, 0.5)
  corFundo?: string // Cor de fundo do círculo externo - padrão: var(--color-primary-background)
  corBalcao?: string // Cor do ícone de balcão - padrão: var(--color-alternate)
}

/**
 * Componente para representar o tipo de venda (Mesa ou Balcão)
 * 
 * Para Mesa:
 * - Círculo central sólido roxo (alternate) com número branco
 * - Borda roxa mais clara ao redor
 * - Quatro pétalas decorativas em azul claro (accent3) ao redor
 * 
 * Para Balcão:
 * - Ícone de cerveja (RiBeerFill) com 28px
 * - Texto "Balcão" abaixo
 */
export function TipoVendaIcon({
  tipoVenda,
  numeroMesa,
  className = '',
  size = 60, // Valor padrão de 60px
  corPrincipal = 'var(--color-alternate)',
  corSecundaria = 'var(--color-info)',
  corTexto = 'var(--color-alternate)',
  corCirculoInterno,
  corBorda = 'rgba(131, 56, 236, 0.5)',
  corFundo = 'var(--color-primary-background)',
  corBalcao = 'var(--color-alternate)',
}: TipoVendaIconProps) {
  const iconHeight = size + (size / 6); // Ajusta a altura total do container
  const outerCircleSize = size; // Tamanho do SVG e do container principal
  const borderCircleSize = size * 0.6; // Tamanho do círculo com a borda
  const innerCircleSize = size * 0.5; // Tamanho do círculo interno (sólido)
  const textFontSize = size / 4; // Tamanho da fonte do número da mesa
  const beerIconSize = size / 2; // Tamanho do ícone da cerveja para balcão
  const balcaoTextSize = size / 6; // Tamanho da fonte do texto "Balcão"

  if (tipoVenda === 'mesa') {
    return (
      <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ height: `${iconHeight}px`, width: `${outerCircleSize}px` }}>
        {/* Container Stack - equivalente ao Stack do Flutter */}
        <div className="relative flex items-center justify-center" style={{ width: `${outerCircleSize}px`, height: `${outerCircleSize}px` }}>
          {/* Quatro pétalas decorativas ao redor */}
          <svg
            width={outerCircleSize}
            height={outerCircleSize}
            viewBox={`0 0 ${outerCircleSize} ${outerCircleSize}`}
            fill={corPrincipal}
            className="absolute"
            style={{ top: 0, left: 0 }}
          >
            {/* Pétala nordeste (diagonal superior direita) */}
            <ellipse
              cx={`${outerCircleSize * 0.6}`}
              cy={`${outerCircleSize * 0.28}`}
              rx={`${outerCircleSize * 0.13}`}
              ry={`${outerCircleSize * 0.13}`}
              fill={corSecundaria}
              stroke={corPrincipal}
              opacity="0.9"
              transform={`rotate(45 ${outerCircleSize * 0.61} ${outerCircleSize * 0.38})`}
            />
            {/* Pétala sudeste (diagonal inferior direita) */}
            <ellipse
              cx={`${outerCircleSize * 0.67}`}
              cy={`${outerCircleSize * 0.51}`}
              rx={`${outerCircleSize * 0.13}`}
              ry={`${outerCircleSize * 0.13}`}
              fill={corSecundaria}
              stroke={corPrincipal}
              opacity="0.9"
              transform={`rotate(113 ${outerCircleSize * 0.61} ${outerCircleSize * 0.61})`}
            />
            {/* Pétala sudoeste (diagonal inferior esquerda) */}
            <ellipse
              cx={`${outerCircleSize * 0.38}`}
              cy={`${outerCircleSize * 0.5}`}
              rx={`${outerCircleSize * 0.13}`}
              ry={`${outerCircleSize * 0.13}`}
              fill={corSecundaria}
              stroke={corPrincipal}
              opacity="0.9"
              transform={`rotate(225 ${outerCircleSize * 0.38} ${outerCircleSize * 0.61})`}
            />
            {/* Pétala noroeste (diagonal superior esquerda) */}
            <ellipse
              cx={`${outerCircleSize * 0.38}`}
              cy={`${outerCircleSize * 0.28}`}
              rx={`${outerCircleSize * 0.13}`}
              ry={`${outerCircleSize * 0.13}`}
              fill={corSecundaria}
              stroke={corPrincipal}
              opacity="0.9"
              transform={`rotate(315 ${outerCircleSize * 0.38} ${outerCircleSize * 0.38})`}
            />
          </svg>

          {/* Círculo externo (borda roxa mais clara) */}
          <div
            className="absolute rounded-full"
            style={{
              width: `${borderCircleSize}px`,
              height: `${borderCircleSize}px`,
              backgroundColor: corFundo,
              border: '1px solid',
              borderColor: corBorda,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Círculo interno sólido roxo com número branco */}
          <div
            className="absolute flex items-center justify-center rounded-full"
            style={{
              width: `${innerCircleSize}px`,
              height: `${innerCircleSize}px`,
              backgroundColor: corCirculoInterno || corPrincipal,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className="font-bold leading-none"
              style={{ color: corTexto, fontSize: `${textFontSize}px` }}
            >
              {numeroMesa?.toString() || ''}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Componente de Balcão - usa o tamanho da prop size
  if (tipoVenda === 'balcao') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`} style={{ height: `${iconHeight}px`, width: `${outerCircleSize}px` }}>
        <RiBeerFill size={beerIconSize} color={corBalcao} />
        <span className="mt-1 font-medium" style={{ color: corBalcao, fontSize: `${balcaoTextSize}px` }}>Balcão</span>
      </div>
    )
  }

  return null
}

