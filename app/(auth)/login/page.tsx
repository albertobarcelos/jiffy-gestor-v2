import { LoginForm } from '@/src/presentation/components/features/auth/LoginForm'
import { VideoPlayer } from './VideoPlayer'
import Image from 'next/image'

/**
 * Página de login
 * Replica exatamente o design do Flutter
 * Server Component que renderiza o formulário de login
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Container principal com gradiente e imagem de fundo */}
      <div
        className="w-full flex relative"
        style={{
          background: `linear-gradient(to bottom right, 
            var(--color-secondary-background), 
            var(--color-alternate), 
            var(--color-accent3))`,
        }}
      >
        {/* Imagem de fundo com opacidade 0.3 (exatamente como Flutter) */}
        {/* Camada abaixo do gradiente (z-index 0) */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 z-0"
          style={{
            backgroundImage: "url('/images/fundo-login.jpeg')",
          }}
        />

        {/* Seção do vídeo (esquerda) - oculto em mobile (< 768px) */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-[360px] h-fit">
            <div className="bg-black/50 backdrop-blur-sm rounded-[20px] p-3 border-[5px] border-accent1">
              {/* Vídeo com proporção 10/16 (aspect ratio de celular) */}
              <div className="aspect-[10/16] rounded-xl overflow-hidden w-full">
                <VideoPlayer />
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de login (direita) */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
          <div className="w-full max-w-[450px]">
            <div className="backdrop-blur-md bg-white/30 border-white border-2 rounded-[20px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative w-[200px] h-[60px]">
                  <Image
                    src="/images/logo-branco.png"
                    alt="Jiffy Gestor"
                    fill
                    sizes="200px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              {/* Título - exatamente como Flutter */}
              <h1 className="text-[28px] font-bold text-gray-900 text-center mb-2 font-heading">
                Bem-vindo ao Jiffy Gestor!
              </h1>
              <p className="text-accent1 text-base text-center mb-8">
                Faça login para continuar
              </p>

              {/* Formulário */}
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

