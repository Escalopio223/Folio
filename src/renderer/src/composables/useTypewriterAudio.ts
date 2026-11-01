import { useUiStore } from '../stores/uiStore'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Generador de buffer de ruido blanco en memoria compartida
let noiseBuffer: AudioBuffer | null = null
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.1) // 100ms de ruido
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }
  }
  return noiseBuffer
}

/**
 * Composable de Efectos de Sonido de Máquina de Escribir Mecánica (Web Audio API)
 * 100% libre de archivos externos, latencia cero (0ms) y afinación procedural orgánica.
 */
export function useTypewriterAudio() {
  const uiStore = useUiStore()

  /**
   * Reproduce el impacto metálico de una tecla mecánica estándar (letras, números, signos)
   */
  function playKeyClick() {
    if (!uiStore.isTypewriterSoundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const jitter = 0.92 + Math.random() * 0.16 // ±8% de variabilidad tonal

    // 1. Golpe de percusión metálica (Oscilador con caída rápida de tono)
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(380 * jitter, now)
    osc.frequency.exponentialRampToValueAtTime(140 * jitter, now + 0.024)

    oscGain.gain.setValueAtTime(0.18, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)

    osc.connect(oscGain)
    oscGain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.026)

    // 2. Chasquido de contacto mecánico de la barra de tipos (Ruido filtrado pasabanda)
    const noise = ctx.createBufferSource()
    noise.buffer = getNoiseBuffer(ctx)

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(1450 * jitter, now)
    bandpass.Q.setValueAtTime(3.5, now)

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.22, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028)

    noise.connect(bandpass)
    bandpass.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.03)
  }

  /**
   * Reproduce el golpe hueco y suave de la barra espaciadora
   */
  function playSpaceClick() {
    if (!uiStore.isTypewriterSoundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const jitter = 0.95 + Math.random() * 0.1

    // Tono grave y hueco
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220 * jitter, now)
    osc.frequency.exponentialRampToValueAtTime(85 * jitter, now + 0.035)

    oscGain.gain.setValueAtTime(0.22, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(oscGain)
    oscGain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.042)

    // Ruido sordo apagado
    const noise = ctx.createBufferSource()
    noise.buffer = getNoiseBuffer(ctx)

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.setValueAtTime(650 * jitter, now)

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.14, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

    noise.connect(lowpass)
    lowpass.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.038)
  }

  /**
   * Reproduce el sonido de retorno de carro mecánico (Enter)
   */
  function playCarriageReturn() {
    if (!uiStore.isTypewriterSoundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // 1. Primer impacto (salto de línea)
    playKeyClick()

    // 2. Retorno mecánico metálico secundario (resorte del carro) 40ms después
    const delayed = now + 0.04
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(520, delayed)
    osc.frequency.exponentialRampToValueAtTime(180, delayed + 0.038)

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(950, delayed)
    filter.Q.setValueAtTime(2, delayed)

    gain.gain.setValueAtTime(0.12, delayed)
    gain.gain.exponentialRampToValueAtTime(0.001, delayed + 0.045)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(delayed)
    osc.stop(delayed + 0.05)
  }

  /**
   * Reproduce el clic seco de retroceso (Backspace / Delete)
   */
  function playBackspaceClick() {
    if (!uiStore.isTypewriterSoundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const jitter = 0.96 + Math.random() * 0.08

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(460 * jitter, now)
    osc.frequency.exponentialRampToValueAtTime(210 * jitter, now + 0.02)

    gain.gain.setValueAtTime(0.16, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.024)
  }

  /**
   * Campanita clásica de fin de línea / hito alcanzado (Ding!)
   */
  function playBell() {
    if (!uiStore.isTypewriterSoundEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tono primario cristalino de campana
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(2350, now)

    gain1.gain.setValueAtTime(0.24, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.6)

    // Armónico metálico brillante
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(4700, now)

    gain2.gain.setValueAtTime(0.08, now)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now)
    osc2.stop(now + 0.3)
  }

  /**
   * Despachador según la tecla pulsada
   */
  function handleTypingSound(key: string, code: string, isCtrlOrMeta = false) {
    // No reproducir sonido si se trata de atajos de comando (Ctrl+S, Ctrl+C, Ctrl+V, etc.)
    if (isCtrlOrMeta) return

    // Teclas ignoradas (modificadores solos)
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(key)) {
      return
    }

    if (key === ' ' || code === 'Space') {
      playSpaceClick()
    } else if (key === 'Enter') {
      playCarriageReturn()
    } else if (key === 'Backspace' || key === 'Delete') {
      playBackspaceClick()
    } else if (key.length === 1) {
      // Letras, números, signos de puntuación
      playKeyClick()
    }
  }

  return {
    playKeyClick,
    playSpaceClick,
    playCarriageReturn,
    playBackspaceClick,
    playBell,
    handleTypingSound
  }
}
