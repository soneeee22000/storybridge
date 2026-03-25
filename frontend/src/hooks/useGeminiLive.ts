import { useCallback, useEffect, useRef, useState } from "react";

interface LiveTranscript {
  speaker: "user" | "companion";
  text: string;
}

interface UseGeminiLiveReturn {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcripts: LiveTranscript[];
  connect: (config: {
    parentLanguage?: string;
    storyContext?: string;
    sessionId?: string;
  }) => void;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendText: (text: string) => void;
  sendContext: (context: string) => void;
}

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/live`;
}

/**
 * PCM 24kHz Int16 playback via Web Audio API.
 * Queues chunks and plays them sequentially for smooth audio.
 */
class AudioPlayer {
  private context: AudioContext | null = null;
  private queue: Float32Array[] = [];
  private isPlaying = false;
  private onSpeakingChange: (speaking: boolean) => void;

  constructor(onSpeakingChange: (speaking: boolean) => void) {
    this.onSpeakingChange = onSpeakingChange;
  }

  enqueue(pcmBase64: string): void {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 24000 });
    }

    const raw = atob(pcmBase64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i]! / 32768;
    }

    this.queue.push(float32);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext(): void {
    if (!this.context || this.queue.length === 0) {
      this.isPlaying = false;
      this.onSpeakingChange(false);
      return;
    }

    this.isPlaying = true;
    this.onSpeakingChange(true);

    const samples = this.queue.shift()!;
    const buffer = this.context.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.onended = () => this.playNext();
    source.start();
  }

  clear(): void {
    this.queue = [];
    this.isPlaying = false;
    this.onSpeakingChange(false);
  }

  destroy(): void {
    this.clear();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

export function useGeminiLive(): UseGeminiLiveReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<LiveTranscript[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
  }, []);

  const connect = useCallback(
    (config: {
      parentLanguage?: string;
      storyContext?: string;
      sessionId?: string;
    }) => {
      if (wsRef.current) return;

      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;
      playerRef.current = new AudioPlayer(handleSpeakingChange);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            parent_language: config.parentLanguage || "",
            story_context: config.storyContext || "",
            session_id: config.sessionId || "",
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "audio" && playerRef.current) {
            playerRef.current.enqueue(msg.data);
          } else if (msg.type === "transcript") {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === msg.speaker) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  speaker: msg.speaker,
                  text: last.text + msg.text,
                };
                return updated;
              }
              return [...prev, { speaker: msg.speaker, text: msg.text }];
            });
          } else if (msg.type === "interrupted") {
            playerRef.current?.clear();
          } else if (msg.type === "error") {
            console.error("Live session error:", msg.message);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    },
    [handleSpeakingChange],
  );

  const disconnect = useCallback(() => {
    // Stop mic
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "close" }));
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop audio
    playerRef.current?.destroy();
    playerRef.current = null;

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscripts([]);
  }, []);

  const startListening = useCallback(async () => {
    if (!wsRef.current || isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      await ctx.audioWorklet.addModule("/audio-processor.js");

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, "audio-capture-processor");
      workletNodeRef.current = worklet;

      worklet.port.onmessage = (event: MessageEvent) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const pcmBuffer: ArrayBuffer = event.data;
          const base64 = arrayBufferToBase64(pcmBuffer);
          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              data: base64,
            }),
          );
        }
      };

      source.connect(worklet);
      worklet.connect(ctx.destination);

      setIsListening(true);
    } catch (err) {
      console.error("Failed to start mic:", err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", data: text }));
    }
  }, []);

  const sendContext = useCallback((context: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "context", data: context }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcripts,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText,
    sendContext,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
