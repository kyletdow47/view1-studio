// Minimal Web Speech API typing — not in standard DOM lib until recent TS.
declare global {
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: Event) => void) | null
    onend: ((event: Event) => void) | null
    start(): void
    stop(): void
    abort(): void
  }
}

export {}
