'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Player de vídeo da área pública de autenticação (login e fluxos relacionados).
 */
export function LoginVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!shouldLoad) return

    const video = videoRef.current
    if (!video) return

    const handleLoadedData = () => {
      setIsLoading(false)
      video.loop = true
      video.playbackRate = 0.5
      video.volume = 0
      video.play().catch(() => {
        setHasError(true)
        setIsLoading(false)
      })
    }

    const handleError = (event: Event) => {
      console.error('Erro ao carregar vídeo:', event)
      setHasError(true)
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      if (video.readyState >= 3) {
        setIsLoading(false)
      }
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    video.load()

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [shouldLoad])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {isLoading && !hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : null}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <p className="text-white text-center text-sm px-4">Erro ao carregar o vídeo.</p>
        </div>
      ) : null}
      {shouldLoad ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-xl"
          playsInline
          muted
          preload="metadata"
          loop
        >
          <source src="/videos/video_de_fundo5.mp4" type="video/mp4" />
          Seu navegador não suporta vídeos.
        </video>
      ) : null}
      {!shouldLoad ? (
        <div className="w-full h-full bg-black/50 rounded-xl flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : null}
    </div>
  )
}
