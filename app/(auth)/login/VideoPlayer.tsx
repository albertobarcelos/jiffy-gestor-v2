'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Componente de player de vídeo para a página de login
 * Replica o comportamento do Flutter
 */
export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedData = () => {
      setIsLoading(false)
      // Configurações do Flutter:
      // - Looping: true
      // - Velocidade: 0.5x
      // - Volume: 0 (mudo)
      video.loop = true
      video.playbackRate = 0.5
      video.volume = 0
      video.play().catch(() => {
        setHasError(true)
        setIsLoading(false)
      })
    }

    const handleError = () => {
      setHasError(true)
      setIsLoading(false)
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('error', handleError)
    }
  }, [])

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <p className="text-center">Erro ao carregar o vídeo.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-xl"
        playsInline
        muted
        preload="auto"
      >
        <source src="/videos/video_de_fundo5.mp4" type="video/mp4" />
        Seu navegador não suporta vídeos.
      </video>
    </div>
  )
}

