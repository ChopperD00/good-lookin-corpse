/**
 * Audio Analyzer — Web Audio API integration for reactive visuals
 * Provides frequency data from microphone input to drive particle systems
 */

export interface AudioBands {
  bass: number      // 0-1 normalized (20-250 Hz)
  mid: number       // 0-1 normalized (250-2000 Hz)
  high: number      // 0-1 normalized (2000-20000 Hz)
  overall: number   // 0-1 normalized average
}

export class AudioAnalyzer {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private stream: MediaStream | null = null
  private _isActive = false
  private smoothedBands: AudioBands = { bass: 0, mid: 0, high: 0, overall: 0 }
  private smoothingFactor = 0.15

  get isActive(): boolean {
    return this._isActive
  }

  async init(): Promise<boolean> {
    try {
      this.context = new AudioContext()
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8

      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      this.source = this.context.createMediaStreamSource(this.stream)
      this.source.connect(this.analyser)
      this._isActive = true
      return true
    } catch (err) {
      console.warn('Audio input not available:', err)
      this._isActive = false
      return false
    }
  }

  getBands(): AudioBands {
    if (!this._isActive || !this.analyser || !this.dataArray) {
      return this.smoothedBands
    }

    this.analyser.getByteFrequencyData(this.dataArray)
    const binCount = this.dataArray.length // 128 bins

    // Frequency resolution: sampleRate / fftSize
    // At 44100 Hz, fftSize 256: each bin ≈ 172 Hz
    // Bass: bins 0-1 (0-344 Hz)
    // Mid: bins 2-11 (344-2064 Hz)
    // High: bins 12-63 (2064-11000 Hz)

    let bassSum = 0, bassCount = 0
    let midSum = 0, midCount = 0
    let highSum = 0, highCount = 0

    for (let i = 0; i < binCount; i++) {
      const val = this.dataArray[i] / 255
      if (i < 2) {
        bassSum += val; bassCount++
      } else if (i < 12) {
        midSum += val; midCount++
      } else if (i < 64) {
        highSum += val; highCount++
      }
    }

    const rawBass = bassCount > 0 ? bassSum / bassCount : 0
    const rawMid = midCount > 0 ? midSum / midCount : 0
    const rawHigh = highCount > 0 ? highSum / highCount : 0
    const rawOverall = (rawBass + rawMid + rawHigh) / 3

    // Smooth the values
    const s = this.smoothingFactor
    this.smoothedBands.bass += (rawBass - this.smoothedBands.bass) * s
    this.smoothedBands.mid += (rawMid - this.smoothedBands.mid) * s
    this.smoothedBands.high += (rawHigh - this.smoothedBands.high) * s
    this.smoothedBands.overall += (rawOverall - this.smoothedBands.overall) * s

    return { ...this.smoothedBands }
  }

  destroy(): void {
    this._isActive = false
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    if (this.context) {
      this.context.close()
      this.context = null
    }
    this.analyser = null
    this.dataArray = null
  }
}
