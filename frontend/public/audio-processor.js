/**
 * AudioWorklet processor for capturing microphone audio at 16kHz 16-bit PCM.
 * Runs in a separate thread to avoid blocking the main UI.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 4096; // ~256ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    // Convert Float32 [-1, 1] to Int16 PCM
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);
    }

    // Send buffer when full
    if (this._buffer.length >= this._bufferSize) {
      const pcm16 = new Int16Array(this._buffer.splice(0, this._bufferSize));
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }

    return true;
  }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
