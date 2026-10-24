let audioCtx: AudioContext | null = null

function obterContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctor()
  }
  return audioCtx
}

/** Destrava autoplay no gesto do usuário (abrir câmera / Pegar). */
export function prepararSomLeituraExpedicao(): void {
  const ctx = obterContexto()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
}

export function tocarSomLeituraExpedicao(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(70)
    }
    const ctx = obterContexto()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    const agora = ctx.currentTime
    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(980, agora)
    ganho.gain.setValueAtTime(0.18, agora)
    ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.14)
    osc.connect(ganho)
    ganho.connect(ctx.destination)
    osc.start(agora)
    osc.stop(agora + 0.14)
  } catch {
    /* sem áudio */
  }
}
