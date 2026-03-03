'use client'

import { ReactNode } from 'react'

/**
 * Layout isolado do cardápio digital
 * Não inclui TopNav administrativo
 * Design premium e isolado do resto do sistema
 */
export default function CardapioLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInLeft {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes float1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(15px, -10px) scale(1.1); }
            50% { transform: translate(-10px, 15px) scale(0.9); }
            75% { transform: translate(20px, 5px) scale(1.05); }
          }
          
          @keyframes float2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-20px, 12px) scale(1.15); }
            66% { transform: translate(10px, -15px) scale(0.85); }
          }
          
          @keyframes float3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            20% { transform: translate(12px, 18px) scale(1.2); }
            40% { transform: translate(-18px, -8px) scale(0.8); }
            60% { transform: translate(25px, 10px) scale(1.1); }
            80% { transform: translate(-5px, -20px) scale(0.95); }
          }
          
          @keyframes float4 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            30% { transform: translate(-15px, -12px) scale(1.25); }
            60% { transform: translate(18px, 20px) scale(0.75); }
          }
          
          @keyframes float5 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(20px, -18px) scale(0.9); }
            50% { transform: translate(-12px, 22px) scale(1.3); }
            75% { transform: translate(15px, -5px) scale(1.05); }
          }
          
          @keyframes float6 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            40% { transform: translate(-22px, 15px) scale(1.15); }
            80% { transform: translate(14px, -22px) scale(0.85); }
          }
          
          @keyframes float7 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(16px, 20px) scale(1.1); }
            66% { transform: translate(-20px, -14px) scale(0.9); }
          }
          
          @keyframes float8 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            20% { transform: translate(-18px, -10px) scale(1.2); }
            40% { transform: translate(22px, 16px) scale(0.8); }
            60% { transform: translate(-8px, -24px) scale(1.15); }
            80% { transform: translate(12px, 8px) scale(0.95); }
          }
          
          .animate-float-1 {
            animation: float1 8s ease-in-out infinite;
          }
          
          .animate-float-2 {
            animation: float2 10s ease-in-out infinite;
          }
          
          .animate-float-3 {
            animation: float3 12s ease-in-out infinite;
          }
          
          .animate-float-4 {
            animation: float4 9s ease-in-out infinite;
          }
          
          .animate-float-5 {
            animation: float5 11s ease-in-out infinite;
          }
          
          .animate-float-6 {
            animation: float6 13s ease-in-out infinite;
          }
          
          .animate-float-7 {
            animation: float7 8.5s ease-in-out infinite;
          }
          
          .animate-float-8 {
            animation: float8 10.5s ease-in-out infinite;
          }
          
          /* Ocultar barras de rolagem */
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE e Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;  /* Chrome, Safari e Opera */
          }
        `
      }} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Conteúdo principal do cardápio */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </>
  )
}
