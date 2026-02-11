/**
 * AudioWorklet processor for capturing PCM16 audio at 24kHz.
 * Accumulates samples and posts ~100ms chunks (2400 samples at 24kHz)
 * as transferable Int16 ArrayBuffers.
 */
class PCM16CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = new Float32Array(2400) // ~100ms at 24kHz
    this._offset = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const channelData = input[0]

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._offset++] = channelData[i]

      if (this._offset >= this._buffer.length) {
        // Convert Float32 [-1, 1] → Int16 [-32768, 32767]
        const int16 = new Int16Array(this._buffer.length)
        for (let j = 0; j < this._buffer.length; j++) {
          const s = Math.max(-1, Math.min(1, this._buffer[j]))
          int16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        this.port.postMessage({ pcm16: int16.buffer }, [int16.buffer])
        this._buffer = new Float32Array(2400)
        this._offset = 0
      }
    }

    return true
  }
}

registerProcessor("pcm16-capture-processor", PCM16CaptureProcessor)
