'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdCheckCircle, MdClose, MdFlashlightOff, MdFlashlightOn, MdPhotoCamera } from 'react-icons/md'
import jsQR from 'jsqr'
import {
  deveTentarInversaoJsQr,
  LADO_SCAN_JSQR,
  mensagemFeedbackScanQr,
  recorteVisorScan,
  type FeedbackScanQr,
} from '@/src/application/expedicao/app/recorteVisorScan'
import { parseCodigoBarrasExpedicao } from '@/src/application/expedicao/parseCodigoBarrasExpedicao'
import {
  cameraDisponivelNesteContexto,
  mensagemErroCameraExpedicao,
} from '@/src/application/expedicao/app/mensagemCameraExpedicao'
import { constraintsLanternaApp } from '@/src/application/expedicao/app/constraintsLanternaApp'
import {
  prepararSomLeituraExpedicao,
  tocarSomLeituraExpedicao,
} from '@/src/presentation/expedicao/app/som/somLeituraExpedicao'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'

type PegarPedidoScannerProps = {
  aberto: boolean
  ocupado: boolean
  onFechar: () => void
  onCodigo: (codigoVenda: string) => Promise<void> | void
}

function codigoPedido(bruto: string): string | null {
  const lido = parseCodigoBarrasExpedicao(bruto)
  if (lido?.tipo === 'pedido') return lido.codigoVenda
  const limpo = bruto.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return limpo || null
}

async function pedirCameraTraseira(): Promise<MediaStream> {
  const preferida: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 24, max: 30 },
    },
  }
  try {
    return await navigator.mediaDevices.getUserMedia(preferida)
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
  }
}

function agendarProximoFrame(video: HTMLVideoElement, tick: () => void): () => void {
  let ativo = true
  const comFrame = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: () => void) => number
    cancelVideoFrameCallback?: (id: number) => void
  }
  if (typeof comFrame.requestVideoFrameCallback === 'function') {
    let id = 0
    const loop = () => {
      if (!ativo) return
      tick()
      if (!ativo) return
      id = comFrame.requestVideoFrameCallback!(loop)
    }
    id = comFrame.requestVideoFrameCallback(loop)
    return () => {
      ativo = false
      comFrame.cancelVideoFrameCallback?.(id)
    }
  }
  let raf = 0
  const loop = () => {
    if (!ativo) return
    tick()
    if (!ativo) return
    raf = window.requestAnimationFrame(loop)
  }
  raf = window.requestAnimationFrame(loop)
  return () => {
    ativo = false
    window.cancelAnimationFrame(raf)
  }
}

export function PegarPedidoScanner({ aberto, ocupado, onFechar, onCodigo }: PegarPedidoScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onCodigoRef = useRef(onCodigo)
  const emitidoRef = useRef(false)
  const [erro, setErro] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [solicitando, setSolicitando] = useState(false)
  const [lanterna, setLanterna] = useState(false)
  const [lanternaOk, setLanternaOk] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackScanQr>('procurando')

  useEffect(() => {
    onCodigoRef.current = onCodigo
  }, [onCodigo])

  const pararCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraAtiva(false)
    setLanterna(false)
    setLanternaOk(false)
  }, [])

  const emitirCodigo = useCallback(async (bruto: string) => {
    if (emitidoRef.current) return
    const codigo = codigoPedido(bruto)
    if (!codigo) return
    emitidoRef.current = true
    setFeedback('lido')
    prepararSomLeituraExpedicao()
    tocarSomLeituraExpedicao()
    try {
      await onCodigoRef.current(codigo)
    } catch {
      emitidoRef.current = false
      setFeedback('falhou')
    }
  }, [])

  const aplicarLanterna = useCallback(async (ligar: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return false
    const caps = (
      typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
    ) as MediaTrackCapabilities & { torch?: boolean }
    if (!caps.torch) return false
    await track.applyConstraints(constraintsLanternaApp(ligar))
    return true
  }, [])

  const iniciarCamera = useCallback(async () => {
    setSolicitando(true)
    setErro(null)
    setFeedback('procurando')
    emitidoRef.current = false
    prepararSomLeituraExpedicao()
    pararCamera()

    if (!cameraDisponivelNesteContexto()) {
      setErro(mensagemErroCameraExpedicao(null))
      setSolicitando(false)
      return
    }

    try {
      const stream = await pedirCameraTraseira()
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach(track => track.stop())
        setSolicitando(false)
        return
      }
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true
      await video.play()
      const track = stream.getVideoTracks()[0]
      const caps = (
        typeof track?.getCapabilities === 'function' ? track.getCapabilities() : {}
      ) as MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] }
      if (caps.focusMode?.includes('continuous')) {
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
        })
      }
      setLanternaOk(Boolean(caps.torch))
      setCameraAtiva(true)
    } catch (error) {
      setErro(mensagemErroCameraExpedicao(error))
      setCameraAtiva(false)
    } finally {
      setSolicitando(false)
    }
  }, [pararCamera])

  const alternarLanterna = useCallback(async () => {
    if (!cameraAtiva) {
      setErro('Abra a câmera para usar a lanterna.')
      return
    }
    const proximo = !lanterna
    try {
      const ok = await aplicarLanterna(proximo)
      if (!ok) {
        setErro('Este aparelho não libera a lanterna pelo navegador (comum no iPhone).')
        setLanternaOk(false)
        return
      }
      setLanterna(proximo)
      setErro(null)
    } catch {
      setErro('Não deu para ligar a lanterna neste aparelho.')
      setLanternaOk(false)
    }
  }, [aplicarLanterna, cameraAtiva, lanterna])

  useEffect(() => {
    if (!aberto) {
      pararCamera()
      setManual('')
      setErro(null)
      setFeedback('procurando')
      emitidoRef.current = false
      return
    }
    if (cameraDisponivelNesteContexto()) {
      void iniciarCamera()
    } else {
      setErro(mensagemErroCameraExpedicao(null))
    }
    return () => {
      pararCamera()
    }
  }, [aberto, iniciarCamera, pararCamera])

  useEffect(() => {
    if (!aberto || !cameraAtiva) return
    let cancelled = false
    let ocupadoFrame = false
    let indiceFrame = 0
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const Detector = window.BarcodeDetector
    const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null
    if (canvas.width !== LADO_SCAN_JSQR) canvas.width = LADO_SCAN_JSQR
    if (canvas.height !== LADO_SCAN_JSQR) canvas.height = LADO_SCAN_JSQR

    const lerJsQr = () => {
      const recorte = recorteVisorScan(video.videoWidth, video.videoHeight)
      if (!recorte) return
      ctx.drawImage(video, recorte.sx, recorte.sy, recorte.sw, recorte.sh, 0, 0, recorte.dw, recorte.dh)
      const image = ctx.getImageData(0, 0, recorte.dw, recorte.dh)
      const invert = deveTentarInversaoJsQr(indiceFrame)
      return jsQR(image.data, image.width, image.height, {
        inversionAttempts: invert ? 'attemptBoth' : 'dontInvert',
      })
    }

    const ler = async () => {
      if (cancelled || emitidoRef.current || ocupado) return
      if (video.readyState < 2) return
      indiceFrame += 1

      if (detector) {
        try {
          const codes = await detector.detect(video)
          const bruto = codes[0]?.rawValue
          if (bruto) {
            await emitirCodigo(bruto)
            return
          }
        } catch {
          /* nativo sem código neste frame */
        }
      }

      const code = lerJsQr()
      if (code?.data) await emitirCodigo(code.data)
    }

    const cancelarAgenda = agendarProximoFrame(video, () => {
      if (cancelled || ocupadoFrame) return
      ocupadoFrame = true
      void ler().finally(() => {
        ocupadoFrame = false
      })
    })

    return () => {
      cancelled = true
      cancelarAgenda()
    }
  }, [aberto, cameraAtiva, emitirCodigo, ocupado])

  if (!aberto) return null

  const lido = feedback === 'lido' || ocupado
  const status = mensagemFeedbackScanQr(feedback, ocupado)

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onFechar} className="rounded-full p-2" aria-label="Fechar">
          <MdClose className="h-7 w-7" />
        </button>
        <h2 className="text-lg font-semibold">Pegar pedido</h2>
        <button
          type="button"
          onClick={() => void alternarLanterna()}
          className={`rounded-full p-2 ${lanterna ? 'text-amber-300' : 'text-white/70'}`}
          aria-label={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
          aria-pressed={lanterna}
        >
          {lanterna ? <MdFlashlightOn className="h-6 w-6" /> : <MdFlashlightOff className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={`relative mx-auto mt-6 aspect-square w-[84vw] max-w-96 overflow-hidden rounded-[28px] bg-zinc-900 ring-2 ${
          lido ? 'ring-emerald-400' : feedback === 'falhou' ? 'ring-amber-300' : 'ring-white'
        }`}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        {cameraAtiva && !lido ? (
          <>
            <span className="pointer-events-none absolute left-5 top-5 h-10 w-10 rounded-tl-xl border-l-4 border-t-4 border-white" />
            <span className="pointer-events-none absolute right-5 top-5 h-10 w-10 rounded-tr-xl border-r-4 border-t-4 border-white" />
            <span className="pointer-events-none absolute bottom-5 left-5 h-10 w-10 rounded-bl-xl border-b-4 border-l-4 border-white" />
            <span className="pointer-events-none absolute bottom-5 right-5 h-10 w-10 rounded-br-xl border-b-4 border-r-4 border-white" />
            <span className="jiffy-scan-line pointer-events-none absolute inset-x-8 h-0.5 rounded-full bg-white shadow-[0_0_12px_#fff]" />
          </>
        ) : null}
        {lido ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/45">
            <MdCheckCircle className="h-16 w-16 text-white" aria-hidden />
            <p className="text-lg font-semibold">Peguei!</p>
            {ocupado ? (
              <>
                <AppSpinner tom="branco" className="mt-1 h-6 w-6" />
                <p className="text-sm font-medium">Adicionando pedido…</p>
              </>
            ) : null}
          </div>
        ) : null}
        {!cameraAtiva ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/90 px-4 text-center">
            <MdPhotoCamera className="h-10 w-10 text-white/50" aria-hidden />
            <button
              type="button"
              disabled={solicitando || ocupado}
              onClick={() => void iniciarCamera()}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              {solicitando ? 'Abrindo…' : 'Permitir câmera'}
            </button>
          </div>
        ) : null}
      </div>
      <p
        className={`mt-6 text-center text-base font-medium ${
          lido ? 'text-emerald-300' : feedback === 'falhou' ? 'text-amber-200' : 'text-white'
        }`}
        aria-live="polite"
      >
        {status}
      </p>
      {erro ? <p className="mt-2 px-6 text-center text-sm text-amber-200">{erro}</p> : null}
      {cameraAtiva && !lanternaOk ? (
        <p className="mt-1 px-6 text-center text-xs text-white/50">Lanterna indisponível neste navegador.</p>
      ) : null}

      <form
        className="absolute inset-x-0 bottom-0 space-y-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onSubmit={event => {
          event.preventDefault()
          void emitirCodigo(manual)
        }}
      >
        <p className="text-center text-xs font-medium text-white/70">
          Sem câmera? Digite o número ou o código da comanda.
        </p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={event => setManual(event.target.value)}
            disabled={ocupado || lido}
            placeholder="Ex: 69 ou JTTHYODA"
            className="h-12 min-w-0 flex-1 rounded-2xl bg-white/15 px-4 text-center text-base uppercase tracking-widest outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-white/50"
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
            enterKeyHint="go"
          />
          <button
            type="submit"
            disabled={ocupado || lido || !manual.trim()}
            className="h-12 shrink-0 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-900 disabled:opacity-40"
          >
            Pegar
          </button>
        </div>
      </form>
    </div>
  )
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>
    }
  }
}
