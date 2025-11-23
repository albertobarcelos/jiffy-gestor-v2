'use client'

import Image from 'next/image'

/**
 * Componente Hub - Tela de seleção de conta/hub
 * Replica o design e funcionalidades do Flutter
 */
export function HubView() {
  const hubItems = [
    {
      id: 1,
      icon: '🎨',
      label: 'Item 1',
    },
    {
      id: 2,
      icon: '🎨',
      label: 'Item 2',
    },
    {
      id: 3,
      icon: '🎨',
      label: 'Item 3',
    },
    {
      id: 4,
      icon: '🎨',
      label: 'Item 4',
    },
  ]

  return (
    <div className="min-h-screen bg-primary-bg">
      <div className="h-screen w-full bg-gradient-to-br from-[#4B39EF] via-[#FF5963] to-[#EE8B60] relative">
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />

        {/* Conteúdo centralizado */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          {/* Imagem/Logo */}
          <div className="w-[60%] max-w-[200px] h-[150px] mb-3 animate-fade-in-up">
            <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-6xl">📱</span>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-[22px] font-bold text-[#101213] mb-1 animate-fade-in-up animation-delay-100">
            Sign In
          </h1>

          {/* Subtítulo */}
          <p className="text-sm font-medium text-[#57636C] mb-8 animate-fade-in-up animation-delay-150">
            Use the account below to sign in.
          </p>

          {/* Grid de itens */}
          <div className="w-[60%] max-w-[400px] h-[40vh] animate-fade-in-scale">
            <div className="grid grid-cols-4 gap-5">
              {hubItems.map((item, index) => (
                <div
                  key={item.id}
                  className="w-full aspect-square bg-white/80 rounded-2xl p-2 flex items-center justify-center cursor-pointer hover:bg-white/90 transition-all hover:scale-105 shadow-lg"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <span className="text-4xl">{item.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.6);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-in-out forwards;
        }

        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s ease-out forwards;
        }

        .animation-delay-100 {
          animation-delay: 100ms;
        }

        .animation-delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  )
}

