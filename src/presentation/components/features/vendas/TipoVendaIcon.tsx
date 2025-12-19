'use client'

import React from 'react'
import { RiBeerFill } from 'react-icons/ri'

interface TipoVendaIconProps {
  tipoVenda: 'mesa' | 'balcao'
  numeroMesa?: number | string | null
  className?: string
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
}: TipoVendaIconProps) {
  if (tipoVenda === 'mesa') {
    return (
      <div className={`relative flex h-[65px] items-center justify-center ${className}`}>
        {/* Container Stack - equivalente ao Stack do Flutter */}
        <div className="relative flex items-center justify-center" style={{ width: '60px', height: '60px' }}>
          {/* Quatro pétalas decorativas ao redor */}
          <svg
            width={60}
            height={60}
            viewBox="0 0 60 60"
            fill='var(--color-alternate)'
            className="absolute"
            style={{ top: 0, left: 0 }}
          >
            {/* Pétala nordeste (diagonal superior direita) */}
            <ellipse
              cx="36"
              cy="16"
              rx="8"
              ry="8"
              fill="var(--color-info)"
              stroke="var(--color-alternate)"
              opacity="0.9"
              transform="rotate(45 37 23)"
            />
            {/* Pétala sudeste (diagonal inferior direita) */}
            <ellipse
              cx="40"
              cy="30"
              rx="8"
              ry="8"
              fill="var(--color-info)"
              stroke="var(--color-alternate)"
              opacity="0.9"
              transform="rotate(135 37 37)"
            />
            {/* Pétala sudoeste (diagonal inferior esquerda) */}
            <ellipse
              cx="23"
              cy="29"
              rx="8"
              ry="8"
              fill="var(--color-info)"
              stroke="var(--color-alternate)"
              opacity="0.9"
              transform="rotate(225 23 37)"
            />
            {/* Pétala noroeste (diagonal superior esquerda) */}
            <ellipse
              cx="24"
              cy="16"
              rx="8"
              ry="8"
              fill="var(--color-info)"
              stroke="var(--color-alternate)"
              opacity="0.9"
              transform="rotate(315 23 23)"
            />
          </svg>

          {/* Círculo externo (borda roxa mais clara) */}
          <div
            className="absolute rounded-full"
            style={{
              width: '35px',
              height: '35px',
              backgroundColor: 'var(--color-primary-background)',
              border: '1px solid var(--color-alternate)',
              borderColor: 'rgba(131, 56, 236, 0.5)', // alternate com opacidade
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Círculo interno sólido roxo com número branco */}
          <div
            className="absolute flex items-center justify-center rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className="text-sm font-bold leading-none"
              style={{ color: 'var(--color-alternate)' }}
            >
              {numeroMesa?.toString() || ''}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Componente de Balcão - mantém o ícone existente
  if (tipoVenda === 'balcao') {
    return (
      <div className={`flex h-[55px] flex-col items-center justify-center ${className}`}>
        <RiBeerFill size={28} color="var(--color-alternate)" />
        <span className="mt-1 text-xs font-medium text-primary-text">Balcão</span>
      </div>
    )
  }

  return null
}

