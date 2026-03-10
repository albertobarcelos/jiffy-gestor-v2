'use client'

import { useRouter } from 'next/navigation'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { useMemo } from 'react'

interface GruposProdutosGridProps {
  grupos: GrupoProduto[]
  mesaId: string
}

/**
 * Grid de grupos de produtos com design premium
 * Usa cores e ícones dos grupos
 * Animações suaves e micro-interações
 */
export default function GruposProdutosGrid({ grupos, mesaId }: GruposProdutosGridProps) {
  const router = useRouter()

  // Função para criar gradiente baseado na cor do grupo
  const getGradientStyle = (corHex: string) => {
    // Converter hex para RGB
    const hex = corHex.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Criar cor mais escura (reduzir 20%)
    const rDark = Math.max(0, Math.floor(r * 0.8))
    const gDark = Math.max(0, Math.floor(g * 0.8))
    const bDark = Math.max(0, Math.floor(b * 0.8))

    return {
      background: `linear-gradient(135deg, ${corHex} 0%, rgb(${rDark}, ${gDark}, ${bDark}) 100%)`,
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {grupos.map((grupo, index) => {
        const corHex = grupo.getCorHex()
        const iconName = grupo.getIconName()
        const nome = grupo.getNome()

        return (
          <button
            key={grupo.getId()}
            onClick={() => router.push(`/cardapio/mesa/${mesaId}/cardapio`)}
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[200px] flex flex-col"
            style={{
              ...getGradientStyle(corHex),
              animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
            }}
          >
            {/* Overlay sutil no hover */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

            {/* Conteúdo */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-white">
              {/* Ícone */}
              <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <DinamicIcon iconName={iconName} color="#FFFFFF" size={48} />
                </div>
              </div>

              {/* Nome do Grupo */}
              <h3 className="text-xl font-bold text-center mb-2 group-hover:scale-105 transition-transform duration-300">
                {nome}
              </h3>

              {/* Indicador de clique */}
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm text-white/90">Toque para ver produtos</p>
              </div>
            </div>

            {/* Efeito de brilho no hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Adicionar animação CSS global (pode ser movido para globals.css)
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
  if (!document.head.querySelector('style[data-cardapio-animations]')) {
    style.setAttribute('data-cardapio-animations', 'true')
    document.head.appendChild(style)
  }
}
