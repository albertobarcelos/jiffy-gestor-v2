'use client'

/**
 * Banner estilizado para "Destaques do dia"
 * Design premium com gradientes e efeitos visuais
 * Duas camadas: bolhas atrás, vermelho com degradê na frente
 */
export default function BannerDestaques() {
  return (
    <div className="relative w-full h-20 px-2 py-2">
      {/* CAMADA 1: Bolhas decorativas (fundo) */}
      <div className="absolute inset-0 px-2 py-2 overflow-hidden">
        {/* Bolhas decorativas espalhadas com animações */}
        <div 
          className="absolute top-2 right-8 w-12 h-12 border-2 border-white/20 rounded-full animate-float-1" 
          style={{ animationDuration: '8s', animationDelay: '0s' }}
        />
        <div 
          className="absolute top-6 right-24 w-8 h-8 border-2 border-white/15 rounded-full animate-float-2"
          style={{ animationDuration: '10s', animationDelay: '1s' }}
        />
        <div 
          className="absolute bottom-4 right-36 w-10 h-10 border-2 border-white/20 rounded-full animate-float-3"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
        <div 
          className="absolute top-10 right-48 w-6 h-6 border-2 border-white/15 rounded-full animate-float-4"
          style={{ animationDuration: '9s', animationDelay: '0.5s' }}
        />
        <div 
          className="absolute bottom-8 right-52 w-14 h-14 border-2 border-white/20 rounded-full animate-float-5"
          style={{ animationDuration: '11s', animationDelay: '1.5s' }}
        />
        <div 
          className="absolute top-4 right-80 w-9 h-9 border-2 border-white/15 rounded-full animate-float-6"
          style={{ animationDuration: '13s', animationDelay: '2.5s' }}
        />
        <div 
          className="absolute bottom-6 right-[400px] w-7 h-7 border-2 border-white/15 rounded-full animate-float-7"
          style={{ animationDuration: '8.5s', animationDelay: '0.8s' }}
        />
        <div 
          className="absolute top-8 right-[480px] w-11 h-11 border-2 border-white/15 rounded-full animate-float-8"
          style={{ animationDuration: '10.5s', animationDelay: '1.2s' }}
        />
      </div>

      {/* CAMADA 2: Gradiente vermelho para transparente (frente) */}
      <div 
        className="relative w-full h-full rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(to right, rgb(220, 38, 38) 0%, rgb(220, 38, 38) 35%, rgba(220, 38, 38, 0.6) 40%, rgba(220, 38, 38, 0.3) 55%, transparent 80%)'
        }}
      >
        {/* Texto principal */}
        <div className="relative h-full flex items-center justify-center px-4 md:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-wider drop-shadow-2xl">
            <span className="lg:hidden">Destaques</span>
            <span className="hidden lg:inline">Destaques do dia</span>
          </h2>
        </div>
      </div>
    </div>
  )
}
