import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Volume2, Pause, RotateCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateGeminiDebrief, SessionMetrics } from "@/utils/geminiCoach";

interface GeminiAudioDebriefProps {
  metrics: SessionMetrics;
  autoPlay?: boolean;
  className?: string;
}

export function GeminiAudioDebrief({
  metrics,
  autoPlay = false,
  className = ""
}: GeminiAudioDebriefProps) {
  const [debriefText, setDebriefText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  isPlayingRef.current = isPlaying;

  const stopDebrief = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  const speakDebrief = useCallback((textToSpeak?: string) => {
    const text = textToSpeak || debriefText;
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith("en") && (
          v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Jenny")
        )
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;

      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("Speech playback error:", e);
          setIsPlaying(false);
        }
      }, 50);
    } catch (err) {
      console.warn("Speech synthesis error:", err);
      setIsPlaying(false);
    }
  }, [debriefText]);

  const fetchDebrief = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await generateGeminiDebrief(metrics);
      setDebriefText(result);
      setIsLoading(false);
      if (autoPlay) {
        speakDebrief(result);
      }
    } catch (err: unknown) {
      console.error("Error generating debrief:", err);
      setIsLoading(false);
    }
  }, [metrics, autoPlay, speakDebrief]);

  useEffect(() => {
    fetchDebrief();
    return () => {
      stopDebrief();
    };
  }, [metrics.totalScore, fetchDebrief, stopDebrief]);

  const togglePlayback = () => {
    if (isPlaying) {
      stopDebrief();
    } else {
      speakDebrief();
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-background/90 to-indigo-950/40 backdrop-blur-xl shadow-xl transition-all ${className}`}
    >
      {/* Decorative top aura */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-20 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                AI Coach Audio Debrief
                <Badge variant="outline" className="border-purple-400/40 text-purple-300 text-[10px] px-2 py-0.5">
                  Powered by Gemini
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Personalized biomechanical voice breakdown of your performance
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchDebrief}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
              title="Regenerate Debrief with Gemini"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
            <Button
              onClick={togglePlayback}
              disabled={isLoading || !debriefText}
              variant="default"
              size="sm"
              className="h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md text-xs font-medium"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen to Coach</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-6 bg-purple-400 rounded-full"
                  animate={{
                    scaleY: [0.4, 1.4, 0.4],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-purple-300/80 animate-pulse font-medium">
              Gemini AI is analyzing your pose angles and generating audio debrief...
            </p>
          </div>
        ) : (
          <div>
            {/* Audio waveform visualization when speaking */}
            {isPlaying && (
              <div className="flex items-center justify-center gap-1 py-2 mb-2 bg-purple-950/30 rounded-lg border border-purple-500/20">
                <span className="text-[11px] font-semibold text-purple-300 mr-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Speaking:
                </span>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-purple-400 rounded-full"
                    animate={{
                      height: [4, 18, 6, 22, 4],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.08,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            )}

            <div className="p-4 rounded-xl bg-card/60 border border-purple-500/10 text-sm leading-relaxed text-foreground/90 font-normal">
              "{debriefText}"
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Audio synthesized for hands-free listening
              </span>
              <span>Overall Score: {metrics.totalScore}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
