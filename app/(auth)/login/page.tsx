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
        className="w-full flex"
        style={{
          background: `linear-gradient(to bottom right, 
            var(--secondary-bg, #f5f5f5), 
            var(--alternate, #ffc107), 
            var(--accent3, #ff9800))`,
        }}
      >
        {/* Imagem de fundo com opacidade 0.3 (exatamente como Flutter) */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: "url('/images/fundo-login.jpeg')",
          }}
        />

        {/* Seção do vídeo (esquerda) - oculto em mobile (< 768px) */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center p-8 relative z-10">
          <div className="max-h-[70vh] w-full max-w-md">
            <div className="bg-black/50 backdrop-blur-sm rounded-[20px] p-3 border-[5px] border-yellow-500">
              {/* Vídeo com proporção 10/16 (aspect ratio de celular) */}
              <div className="aspect-[10/16] rounded-xl overflow-hidden">
                <VideoPlayer />
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de login (direita) */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
          <div className="w-full max-w-[450px]">
            <div className="backdrop-blur-[5px] bg-blue-500/30 rounded-[20px] p-8 border-2 border-blue-500 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
              {/* Logo */}
              <div className="flex justify-center mb-5">
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
              <h1 className="text-[28px] font-bold text-gray-900 text-center mb-2 font-['Exo']">
                Bem-vindo ao Jiffy Gestor!
              </h1>
              <p className="text-blue-500 text-base text-center mb-8">
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

