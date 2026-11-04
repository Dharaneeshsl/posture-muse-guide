import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API interface definitions for type safety
interface ISpeechRecognitionResult {
  0: {
    transcript: string;
  };
}

interface ISpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: ISpeechRecognitionResult;
  };
}

interface ISpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface IWindow extends Window {
  SpeechRecognition?: new () => ISpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
}

export interface VoiceCommandHandlers {
  onBegin?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onReset?: () => void;
  onToggleMusic?: () => void;
  onMuteMusic?: () => void;
  onPlayMusic?: () => void;
  onCheckForm?: () => void;
  onTogglePranayama?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface VoiceCommandsOptions {
  enabled?: boolean;
  handlers: VoiceCommandHandlers;
}

export function useVoiceCommands({ enabled = true, handlers }: VoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>("");
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Keep latest handlers in a ref so recognizer doesn't re-instantiate on every render
  const handlersRef = useRef<VoiceCommandHandlers>(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const enabledRef = useRef<boolean>(enabled);
  enabledRef.current = enabled;

  const processPhrase = useCallback((rawPhrase: string) => {
    const text = rawPhrase.toLowerCase().trim();
    setLastTranscript(text);

    // If speech synthesis is currently speaking, disregard to prevent self-looping
    if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
      return;
    }

    const h = handlersRef.current;

    // Check for "how is my form" / "feedback"
    if (
      text.includes("how is my form") ||
      text.includes("how's my form") ||
      text.includes("how is the form") ||
      text.includes("check form") ||
      text.includes("form feedback") ||
      text.includes("how am i doing") ||
      text.includes("feedback")
    ) {
      setLastCommand("How is my form?");
      h.onCheckForm?.();
      return;
    }

    // Check for "next" / "next pose"
    if (
      text.includes("next pose") ||
      text.includes("next level") ||
      text.includes("next") ||
      text.includes("continue")
    ) {
      setLastCommand("Next Pose");
      h.onNext?.();
      return;
    }

    // Check for "skip"
    if (text.includes("skip pose") || text.includes("skip")) {
      setLastCommand("Skip Pose");
      h.onSkip?.();
      return;
    }

    // Check for "begin" / "start"
    if (
      text.includes("begin pose") ||
      text.includes("begin") ||
      text.includes("start pose") ||
      text.includes("start")
    ) {
      setLastCommand("Begin Pose");
      h.onBegin?.();
      return;
    }

    // Check for "reset" / "restart"
    if (text.includes("restart") || text.includes("reset")) {
      setLastCommand("Reset Pose");
      h.onReset?.();
      return;
    }

    // Music commands
    if (
      text.includes("mute music") ||
      text.includes("pause music") ||
      text.includes("stop music") ||
      text.includes("music off")
    ) {
      setLastCommand("Mute Music");
      if (h.onMuteMusic) {
        h.onMuteMusic();
      } else {
        h.onToggleMusic?.();
      }
      return;
    }

    if (
      text.includes("play music") ||
      text.includes("unmute music") ||
      text.includes("start music") ||
      text.includes("music on")
    ) {
      setLastCommand("Play Music");
      if (h.onPlayMusic) {
        h.onPlayMusic();
      } else {
        h.onToggleMusic?.();
      }
      return;
    }

    if (text === "music" || text.includes("toggle music")) {
      setLastCommand("Toggle Music");
      h.onToggleMusic?.();
      return;
    }

    // Breath / Pranayama
    if (
      text.includes("pranayama") ||
      text.includes("breath") ||
      text.includes("breathe") ||
      text.includes("breathing")
    ) {
      setLastCommand("Pranayama Breath");
      h.onTogglePranayama?.();
      return;
    }

    // Pause / Resume
    if (text.includes("pause")) {
      setLastCommand("Pause");
      h.onPause?.();
      return;
    }

    if (text.includes("resume")) {
      setLastCommand("Resume");
      h.onResume?.();
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    let recognition: ISpeechRecognitionInstance | null = null;

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        const results = event.results;
        if (!results || results.length === 0) return;
        const latest = results[results.length - 1];
        if (latest && latest[0]) {
          const phrase = latest[0].transcript;
          processPhrase(phrase);
        }
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        // "no-speech" and "aborted" are harmless expected states in continuous recognition
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if user still has voice recognition enabled
        if (enabledRef.current) {
          try {
            recognition?.start();
          } catch {
            /* Already active or busy */
          }
        }
      };

      recognitionRef.current = recognition;

      if (enabled) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Could not start speech recognition:", e);
        }
      }
    } catch (err) {
      console.warn("Speech recognition setup failed:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, [enabled, processPhrase]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      enabledRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
    } else {
      enabledRef.current = true;
      try {
        recognitionRef.current.start();
      } catch {
        /* ignore */
      }
    }
  }, [isListening]);

  return {
    isSupported,
    isListening,
    lastCommand,
    lastTranscript,
    toggleListening
  };
}
