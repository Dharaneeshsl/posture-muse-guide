import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PranayamaGuideProps {
  /** If true, renders in compact HUD/overlay mode suitable for camera screen */
  compact?: boolean;
  /** Initial enabled state */
  initiallyActive?: boolean;
  onToggleActive?: (active: boolean) => void;
  className?: string;
}

// Synthesize calming Tibetan singing bowl chimes using Web Audio API
class ChimeSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize to comply with browser audio autoplay policy
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  /**
   * Plays a tranquil, warm chime
   * @param freq Base frequency (e.g. 528Hz for Inhale, 396Hz for Exhale)
   */
  public playChime(freq: number = 528, duration: number = 2.2) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(this.ctx.destination);

      // Fundamental tone
      const osc1 = this.ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(freq, now);
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + duration);

      // Subtle warm octave harmonic
      const harmGain = this.ctx.createGain();
      harmGain.gain.setValueAtTime(0.001, now);
      harmGain.gain.exponentialRampToValueAtTime(0.06, now + 0.06);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);
      harmGain.connect(masterGain);

      const osc2 = this.ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 1.5, now);
      osc2.connect(harmGain);
      osc2.start(now);
      osc2.stop(now + duration);
    } catch (e) {
      console.warn("Chime synthesis error:", e);
    }
  }
}

export function PranayamaGuide({
  compact = true,
  initiallyActive = true,
  onToggleActive,
  className = ""
}: PranayamaGuideProps) {
  const [isActive, setIsActive] = useState(initiallyActive);
  const [phase, setPhase] = useState<"inhale" | "exhale">("inhale");
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [chimesMuted, setChimesMuted] = useState(false);
  const chimeRef = useRef<ChimeSynthesizer | null>(null);

  if (!chimeRef.current) {
    chimeRef.current = new ChimeSynthesizer();
  }

  const handleToggle = () => {
    const next = !isActive;
    setIsActive(next);
    onToggleActive?.(next);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !chimesMuted;
    setChimesMuted(next);
    chimeRef.current?.setMuted(next);
  };

  // 4-second inhale, 4-second exhale rhythm
  useEffect(() => {
    if (!isActive) return;

    let currentSec = 4;
    let currentPhase: "inhale" | "exhale" = "inhale";

    // Initial chime
    chimeRef.current?.playChime(528, 2.5);

    const interval = window.setInterval(() => {
      currentSec -= 1;
      if (currentSec <= 0) {
        currentPhase = currentPhase === "inhale" ? "exhale" : "inhale";
        currentSec = 4;
        setPhase(currentPhase);
        // Play corresponding frequency: 528Hz for expanding Inhale, 396Hz for grounding Exhale
        chimeRef.current?.playChime(currentPhase === "inhale" ? 528 : 396, 2.4);
      }
      setSecondsRemaining(currentSec);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive]);

  if (!isActive) {
    return (
      <Button
        onClick={handleToggle}
        variant="outline"
        size="sm"
        className={`bg-card/70 backdrop-blur-md border-primary/20 hover:border-primary/50 text-xs gap-1.5 shadow-sm transition-all ${className}`}
        title="Show Synchronized Pranayama Breath Guide"
      >
        <Wind className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>Pranayama Breath</span>
      </Button>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-cyan-950/40 backdrop-blur-xl shadow-xl transition-all ${
        compact ? "p-3 max-w-[280px]" : "p-6 max-w-sm"
      } ${className}`}
    >
      {/* Header controls */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/10 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span>Synchronized Pranayama</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMute}
            className="p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 transition-colors"
            title={chimesMuted ? "Unmute breath chimes" : "Mute breath chimes"}
            aria-label="Toggle breath chime audio"
          >
            {chimesMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleToggle}
            className="p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 transition-colors"
            title="Minimize breath guide"
            aria-label="Minimize breath guide"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Breathing Ring & Luminous Pulse Visual */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative flex items-center justify-center w-28 h-28 my-1">
          {/* Ambient outer glowing halo */}
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl pointer-events-none"
            animate={{
              scale: phase === "inhale" ? [1, 1.45] : [1.45, 0.9],
              opacity: phase === "inhale" ? [0.3, 0.8] : [0.8, 0.25]
            }}
            transition={{
              duration: 4,
              ease: "easeInOut"
            }}
          />

          {/* Secondary resonance ripple ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-400/40 pointer-events-none"
            animate={{
              rotate: phase === "inhale" ? 180 : -180,
              scale: phase === "inhale" ? [0.85, 1.25] : [1.25, 0.85]
            }}
            transition={{
              duration: 4,
              ease: "easeInOut"
            }}
          />

          {/* Primary animated breathing sphere */}
          <motion.div
            className="relative flex items-center justify-center w-20 h-20 rounded-full shadow-inner bg-gradient-to-br from-cyan-400/30 via-teal-500/30 to-blue-600/40 border border-cyan-300/60"
            animate={{
              scale: phase === "inhale" ? [0.75, 1.2] : [1.2, 0.75],
              boxShadow:
                phase === "inhale"
                  ? [
                      "0 0 10px rgba(34, 211, 238, 0.2)",
                      "0 0 35px rgba(34, 211, 238, 0.6)"
                    ]
                  : [
                      "0 0 35px rgba(34, 211, 238, 0.6)",
                      "0 0 10px rgba(34, 211, 238, 0.2)"
                    ]
            }}
            transition={{
              duration: 4,
              ease: "easeInOut"
            }}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-cyan-100 tracking-wider">
                {secondsRemaining}s
              </span>
            </div>
          </motion.div>
        </div>

        {/* Phase instructions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-center mt-1"
          >
            <div className="text-sm font-bold tracking-wide text-cyan-200">
              {phase === "inhale" ? "Inhale expand..." : "Exhale sink deeper..."}
            </div>
            <div className="text-[11px] text-cyan-300/70 font-medium">
              {phase === "inhale"
                ? "Lengthen your spine and expand the ribcage"
                : "Release tension and soften into the posture"}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
