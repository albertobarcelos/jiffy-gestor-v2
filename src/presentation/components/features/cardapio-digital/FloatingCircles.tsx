'use client'

/**
 * Componente de círculos flutuantes animados
 * Reutilizável para adicionar efeito decorativo em diferentes áreas
 */
interface FloatingCirclesProps {
  /** Cor da borda dos círculos em formato rgba ou hex (padrão: rgba(255, 255, 255, 0.15)) */
  borderColor?: string
  /** Opacidade da borda (padrão: 0.15) - usado apenas se borderColor não for especificado */
  opacity?: number
}

export default function FloatingCircles({ 
  borderColor, 
  opacity = 0.15 
}: FloatingCirclesProps) {
  // Se borderColor não for especificado, usa branco com a opacidade fornecida
  const borderStyle = borderColor || `rgba(255, 255, 255, ${opacity})`
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Bolhas decorativas espalhadas com animações - tamanhos dobrados e posições em porcentagem */}
      <div 
        className="absolute border-2 rounded-full animate-float-1"
        style={{ 
          top: '2%',
          right: '8%',
          width: '86px',
          height: '86px',
          borderColor: borderStyle,
          animationDuration: '8s', 
          animationDelay: '0s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-2"
        style={{ 
          top: '5%',
          right: '30%',
          width: '64px',
          height: '64px',
          borderColor: borderStyle,
          animationDuration: '10s', 
          animationDelay: '1s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-3"
        style={{ 
          bottom: '8%',
          right: '10%',
          width: '80px',
          height: '80px',
          borderColor: borderStyle,
          animationDuration: '12s', 
          animationDelay: '2s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-4"
        style={{ 
          top: '20%',
          right: '20%',
          width: '58px',
          height: '58px',
          borderColor: borderStyle,
          animationDuration: '9s', 
          animationDelay: '0.5s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-5"
        style={{ 
          bottom: '5%',
          right: '35%',
          width: '100px',
          height: '100px',
          borderColor: borderStyle,
          animationDuration: '11s', 
          animationDelay: '1.5s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-6"
        style={{ 
          top: '30%',
          right: '30%',
          width: '96px',
          height: '96px',
          borderColor: borderStyle,
          animationDuration: '13s', 
          animationDelay: '2.5s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-7"
        style={{ 
          bottom: '5%',
          right: '65%',
          width: '56px',
          height: '56px',
          borderColor: borderStyle,
          animationDuration: '8.5s', 
          animationDelay: '0.8s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-8"
        style={{ 
          top: '3%',
          right: '60%',
          width: '78px',
          height: '78px',
          borderColor: borderStyle,
          animationDuration: '10.5s', 
          animationDelay: '1.2s' 
        }}
      />
      {/* Círculos adicionais para o painel esquerdo - espalhados e tamanhos dobrados */}
      <div 
        className="absolute border-2 rounded-full animate-float-2"
        style={{ 
          top: '10%',
          left: '2%',
          width: '70px',
          height: '70px',
          borderColor: borderStyle,
          animationDuration: '9s', 
          animationDelay: '0.3s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-3"
        style={{ 
          top: '30%',
          left: '10%',
          width: '64px',
          height: '64px',
          borderColor: borderStyle,
          animationDuration: '11s', 
          animationDelay: '1.8s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-4"
        style={{ 
          top: '30%',
          left: '30%',
          width: '76px',
          height: '76px',
          borderColor: borderStyle,
          animationDuration: '10s', 
          animationDelay: '0.6s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-5"
        style={{ 
          bottom: '10%',
          left: '2%',
          width: '68px',
          height: '68px',
          borderColor: borderStyle,
          animationDuration: '12s', 
          animationDelay: '2.2s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-6"
        style={{ 
          top: '55%',
          left: '62%',
          width: '92px',
          height: '92px',
          borderColor: borderStyle,
          animationDuration: '8s', 
          animationDelay: '1.4s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-1"
        style={{ 
          bottom: '30%',
          left: '25%',
          width: '80px',
          height: '80px',
          borderColor: borderStyle,
          animationDuration: '9.5s', 
          animationDelay: '0.9s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-7"
        style={{ 
          top: '75%',
          left: '18%',
          width: '64px',
          height: '64px',
          borderColor: borderStyle,
          animationDuration: '11.5s', 
          animationDelay: '2.1s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-8"
        style={{ 
          top: '15%',
          left: '30%',
          width: '56px',
          height: '56px',
          borderColor: borderStyle,
          animationDuration: '10s', 
          animationDelay: '1.6s' 
        }}
      />
      <div 
        className="absolute border-2 rounded-full animate-float-3"
        style={{ 
          bottom: '45%',
          left: '10%',
          width: '88px',
          height: '88px',
          borderColor: borderStyle,
          animationDuration: '12.5s', 
          animationDelay: '2.8s' 
        }}
      />
    </div>
  )
}
