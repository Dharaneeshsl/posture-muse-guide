import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CameraView } from "./CameraView";
import { SessionSummary } from "./SessionSummary";
import { FinalSummary } from "./FinalSummary";
import { 
  similarityScore, 
  computeSessionScore, 
  scoreToGrade, 
  generateFeedback,
  computeAccuracy,
  computeSymmetry,
  type FrameScore 
} from "@/utils/scoring";
import { stabilityScore } from "@/utils/angles";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Play, RotateCcw, SkipForward, Volume2, VolumeX, Mic, MicOff, Wind, Sparkles, CheckCircle2 } from "lucide-react";
import { PranayamaGuide } from "./PranayamaGuide";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import LevelCompleteOverlay from "./LevelCompleteOverlay";

interface PoseData {
  slug: string;
  name: string;
  difficulty: string;
  thumbnail: string;
  targetAngles: Record<string, number>;
  tolerances: Record<string, number>;
  weights: Record<string, number>;
  steps: string[];
  tips: string[];
  hold_seconds: number;
}

const MOTIVATIONAL_LINES = [
  "Keep going, you can do it! Stay hard!",
  "Stay hard! Don't quit, you've got this!",
  "Halfway there! Stay strong and hold the form!",
  "Push through the burn! Lock it in, stay hard!",
  "Breathe through it, you're doing amazing! Keep going!",
  "Lock in your focus! Stay hard, finish strong!"
];

const speakVoice = (text: string, priority: boolean = false) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (priority || !window.speechSynthesis.speaking) {
      if (priority) {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith("en") && (
          v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Aaron")
        )
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      // Deferral ensures Chrome/Edge voice queue resets reliably after cancel()
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("Speech playback error:", e);
        }
      }, 20);
    }
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
};

interface ChallengeFlowProps {
  challengeLevels: Array<{ level: number; slug: string; name: string; difficulty: string }>;
  poseLibrary: PoseData[];
  onComplete: () => void;
}

export function ChallengeFlow({ challengeLevels, poseLibrary, onComplete }: ChallengeFlowProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownIntervalRef = useRef<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [liveSimilarity, setLiveSimilarity] = useState(0);
  const [liveFeedback, setLiveFeedback] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPercent, setOverlayPercent] = useState<number>(0);
  const [overlayGrade, setOverlayGrade] = useState<string>("Beginner");
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [levelScores, setLevelScores] = useState<number[]>(Array(challengeLevels.length).fill(0));
  const [levelFeedbacks, setLevelFeedbacks] = useState<string[][]>(() => Array.from({ length: challengeLevels.length }, () => []));
  const [showPranayama, setShowPranayama] = useState(true);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  interface ActiveCorrection {
    originalHint: string;
    shortMessage: string;
    isCorrected: boolean;
  }
  const [activeCorrection, setActiveCorrection] = useState<ActiveCorrection | null>(null);
  const activeCorrectionRef = useRef<ActiveCorrection | null>(null);
  const correctionDismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeCorrectionRef.current = activeCorrection;
  }, [activeCorrection]);
  const voiceToastTimerRef = useRef<number | null>(null);

  const showVoiceToast = useCallback((msg: string) => {
    setVoiceToast(msg);
    if (voiceToastTimerRef.current) {
      window.clearTimeout(voiceToastTimerRef.current);
    }
    voiceToastTimerRef.current = window.setTimeout(() => {
      setVoiceToast(null);
    }, 2800);
  }, []);
  
  const frameScoresRef = useRef<FrameScore[]>([]);
  const angleTimeSeriesRef = useRef<Record<string, number[]>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const motivationPlayedRef = useRef<boolean>(false);
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState(true);
  const voiceCoachEnabledRef = useRef<boolean>(true);
  const lastHintSpokenTimeRef = useRef<number>(0);

  useEffect(() => {
    voiceCoachEnabledRef.current = voiceCoachEnabled;
    if (!voiceCoachEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [voiceCoachEnabled]);
  // Buffer angles collected during the current 1s window
  const lastSecondAnglesRef = useRef<Record<string, number[]>>({});
  const [liveAnglesAvg, setLiveAnglesAvg] = useState<Record<string, number>>({});
  const perSecondIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isCompletingRef = useRef(false);
  const audioPlayPromiseRef = useRef<Promise<void> | null>(null);
  const completeLevelRef = useRef<() => void>(() => {});
  const [sessionData, setSessionData] = useState<{
    accuracy: number;
    stability: number;
    symmetry: number;
    grade: string;
    feedback: string[];
    overallScore?: number;
  } | null>(null);

  const currentPose = poseLibrary.find(p => p.slug === challengeLevels[currentLevel]?.slug);
  const holdDuration = currentPose?.hold_seconds || 10;

  const safePlayAudio = useCallback(() => {
    if (!audioRef.current) return;
    try {
      audioPlayPromiseRef.current = audioRef.current.play();
      audioPlayPromiseRef.current.catch((e) => {
        console.warn("Audio play prevented:", e);
      });
    } catch (e) {
      console.warn("Audio play exception:", e);
    }
  }, []);

    const handleCheckFormVoice = useCallback(() => {
    if (!cameraActive) {
      speakVoice("Please start your camera first.", true);
      return;
    }
    if (!isHolding) {
      speakVoice("You can say begin or click begin when ready to start holding.", true);
      return;
    }
    if (liveFeedback && liveFeedback.length > 0) {
      speakVoice(`Form check: ${liveFeedback[0]}`, true);
    } else if (liveSimilarity >= 75) {
      speakVoice(`Excellent alignment! Similarity is ${liveSimilarity} percent. Maintain your steady breath.`, true);
    } else {
      speakVoice(`Hold steady! Similarity is ${liveSimilarity} percent. Focus on centering your posture.`, true);
    }
  }, [cameraActive, isHolding, liveFeedback, liveSimilarity]);

  const {
    isSupported: isVoiceSupported,
    isListening: isVoiceListening
  } = useVoiceCommands({
    enabled: voiceCommandsEnabled,
    handlers: {
      onBegin: () => {
        if (!cameraActive) {
          setCameraActive(true);
          setTimeout(() => handleBegin(), 800);
        } else if (!isHolding && !isCountingDown) {
          handleBegin();
        }
        showVoiceToast("Begin Pose");
      },
      onNext: () => {
        handleNextLevel();
        showVoiceToast("Next Pose");
      },
      onSkip: () => {
        handleSkipLevel();
        showVoiceToast("Skip Pose");
      },
      onReset: () => {
        resetLevel();
        showVoiceToast("Reset Pose");
      },
      onCheckForm: () => {
        handleCheckFormVoice();
        showVoiceToast("Checking Form...");
      },
      onTogglePranayama: () => {
        setShowPranayama(prev => !prev);
        showVoiceToast("Pranayama Breath");
      },
      onMuteMusic: () => {
        setIsMusicMuted(true);
        safePauseAudio();
        showVoiceToast("Mute Music");
      },
      onPlayMusic: () => {
        setIsMusicMuted(false);
        if (isHolding) safePlayAudio();
        showVoiceToast("Play Music");
      },
      onToggleMusic: () => {
        setIsMusicMuted(prev => {
          const next = !prev;
          if (next) safePauseAudio();
          else if (isHolding) safePlayAudio();
          return next;
        });
        showVoiceToast("Toggle Music");
      },
      onPause: () => {
        if (isHolding) {
          setIsHolding(false);
          safePauseAudio();
          showVoiceToast("Pause");
          speakVoice("Pose paused", true);
        }
      },
      onResume: () => {
        if (!isHolding && cameraActive) {
          setIsHolding(true);
          if (!isMusicMuted) safePlayAudio();
          showVoiceToast("Resume");
          speakVoice("Resuming pose", true);
        }
      }
    }
  });

const safePauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (audioPlayPromiseRef.current) {
      audioPlayPromiseRef.current
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {});
    } else {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, []);

  const resetLevel = useCallback(() => {
    isCompletingRef.current = false;
    safePauseAudio();
    setIsHolding(false);
    motivationPlayedRef.current = false;
    setCountdown(3);
    setHoldProgress(0);
    setLiveSimilarity(0);
    frameScoresRef.current = [];
    angleTimeSeriesRef.current = {};
    startTimeRef.current = 0;
    motivationPlayedRef.current = false;
    lastHintSpokenTimeRef.current = 0;
    if (correctionDismissTimerRef.current) {
      window.clearTimeout(correctionDismissTimerRef.current);
      correctionDismissTimerRef.current = null;
    }
    setActiveCorrection(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [safePauseAudio]);

  const handleBegin = useCallback(() => {
    if (!cameraActive) return;
    
    let count = 3;
    setCountdown(count);
    if (voiceCoachEnabledRef.current) {
      speakVoice("Three", true);
    }
    
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 2 && voiceCoachEnabledRef.current) {
        speakVoice("Two", true);
      } else if (count === 1 && voiceCoachEnabledRef.current) {
        speakVoice("One", true);
      }
      
      if (count === 0) {
        clearInterval(countdownInterval);
        setIsHolding(true);
        motivationPlayedRef.current = false;
        lastHintSpokenTimeRef.current = Date.now();
        startTimeRef.current = Date.now();
        if (voiceCoachEnabledRef.current) {
          speakVoice("Hold!", true);
        }
        // Start background music when the hold begins
        safePlayAudio();
      }
    }, 1000);
  }, [cameraActive, safePlayAudio]);

  const handlePoseDetected = useCallback((angles: Record<string, number>, _landmarks: NormalizedLandmark[]) => {
    if (!isHolding || !currentPose) return;

    const { score, deviations } = similarityScore(
      angles,
      currentPose.targetAngles,
      currentPose.tolerances,
      currentPose.weights
    );

    setLiveSimilarity(Math.round(score * 100));
  // Live feedback hints
  const hints = generateFeedback(deviations, currentPose.targetAngles, angles, 3);
  setLiveFeedback(hints);

    // Store frame score
    frameScoresRef.current.push({
      score,
      timestamp: Date.now(),
      angles
    });

    // Store angle time series for stability
    Object.keys(angles).forEach(angleName => {
      if (!angleTimeSeriesRef.current[angleName]) {
        angleTimeSeriesRef.current[angleName] = [];
      }
      angleTimeSeriesRef.current[angleName].push(angles[angleName]);
      // add to last-second buffer
      if (!lastSecondAnglesRef.current[angleName]) lastSecondAnglesRef.current[angleName] = [];
      lastSecondAnglesRef.current[angleName].push(angles[angleName]);
    });

    // Update hold progress
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(100, (elapsed / (holdDuration * 1000)) * 100);
    setHoldProgress(progress);

    const now = Date.now();

    // 1. Spoken motivational line in the middle of the hold (at ~45% - 50% progress)
    if (progress >= 45 && progress < 80 && !motivationPlayedRef.current && voiceCoachEnabledRef.current) {
      motivationPlayedRef.current = true;
      lastHintSpokenTimeRef.current = now;
      const line = MOTIVATIONAL_LINES[Math.floor(Math.random() * MOTIVATIONAL_LINES.length)];
      speakVoice(line, true);
    }
    // 2. Real-time posture guidance voice cues (throttled every 4.5 seconds)
    else if (
      voiceCoachEnabledRef.current &&
      hints.length > 0 &&
      now - lastHintSpokenTimeRef.current > 4500 &&
      (progress < 38 || progress > 62)
    ) {
      lastHintSpokenTimeRef.current = now;
      const naturalHint = hints[0].replace(/≈/g, 'about ').replace(/°/g, ' degrees');
      speakVoice(naturalHint, false);
    }

    if (progress >= 100) {
      completeLevelRef.current();
    }
  }, [isHolding, currentPose, holdDuration]);


  // Dedicated hold progress interval to guarantee smooth progress and completion even on frame drops
  useEffect(() => {
    if (!isHolding) return;

    const interval = window.setInterval(() => {
      if (startTimeRef.current === 0) return;
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / (holdDuration * 1000)) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        completeLevelRef.current();
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [isHolding, holdDuration]);

  // Start per-second aggregator when holding starts and stop when it ends
  useEffect(() => {
    // Initialize background music audio element once
    if (!audioRef.current) {
      try {
        const a = new Audio("/meditation-relax-yoga-music.mp3");
        a.loop = true;
        a.preload = "auto";
        a.volume = 0.25;
        audioRef.current = a;
      } catch (err) {
        console.warn("Could not create audio element:", err);
      }
    }

    if (isHolding) {
      // clear any previous buffer
      lastSecondAnglesRef.current = {};
      // Set interval every 1s to compute averages
      perSecondIntervalRef.current = window.setInterval(() => {
        const averages: Record<string, number> = {};
        Object.keys(lastSecondAnglesRef.current).forEach(angleName => {
          const vals = lastSecondAnglesRef.current[angleName];
          if (vals && vals.length > 0) {
            const sum = vals.reduce((a, b) => a + b, 0);
            averages[angleName] = Math.round(sum / vals.length);
          }
        });
        setLiveAnglesAvg(averages);
        // clear buffer for next second
        lastSecondAnglesRef.current = {};
      }, 1000) as unknown as number;
    } else {
      // stop interval
      if (perSecondIntervalRef.current) {
        clearInterval(perSecondIntervalRef.current);
        perSecondIntervalRef.current = null;
      }
      // clear live averages
      setLiveAnglesAvg({});
      lastSecondAnglesRef.current = {};
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (perSecondIntervalRef.current) {
        clearInterval(perSecondIntervalRef.current);
        perSecondIntervalRef.current = null;
      }
    };
  }, [isHolding]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  const completeLevel = useCallback(() => {
    if (!currentPose || isCompletingRef.current) return;
    isCompletingRef.current = true;

    setIsHolding(false);
    motivationPlayedRef.current = false;

    // Compute final metrics
    const lastFrame = frameScoresRef.current[frameScoresRef.current.length - 1];
    const accuracy = lastFrame ? computeAccuracy(lastFrame.score) : 0;
    const symmetry = lastFrame ? computeSymmetry(lastFrame.angles, currentPose.targetAngles) : 0;

    // Compute stability from angle time series
    const allStabilities = Object.values(angleTimeSeriesRef.current).map(series => stabilityScore(series));
    const avgStability = allStabilities.length > 0
      ? Math.round((allStabilities.reduce((a, b) => a + b, 0) / allStabilities.length) * 100)
      : 0;

    const percent = Math.round((accuracy + avgStability + symmetry) / 3);
    const grade = scoreToGrade(percent);
    const feedback = lastFrame
      ? generateFeedback(
          similarityScore(lastFrame.angles, currentPose.targetAngles, currentPose.tolerances, currentPose.weights).deviations,
          currentPose.targetAngles,
          lastFrame.angles
        )
      : [];

    setSessionData({
      accuracy,
      stability: avgStability,
      symmetry,
      grade,
      feedback,
      overallScore: percent
    });

    // Show completion overlay (LevelCompleteOverlay manages its own 3s timer and triggers onDone)
    setOverlayPercent(percent);
    setOverlayGrade(grade);
    setOverlayVisible(true);
    if (voiceCoachEnabledRef.current) {
      speakVoice(`Great job! Pose complete! Grade: ${grade}`, true);
    }
    // Pause and reset music when the exercise completes
    safePauseAudio();
  }, [currentPose, safePauseAudio]);
  completeLevelRef.current = completeLevel;

  const handleNextLevel = useCallback(() => {
    // Store the score for this level
    if (sessionData) {
  // Compute per-level score using provided formula: round((accuracy + stability + symmetry) / 30)
  const perLevelScore = Math.round((sessionData.accuracy + sessionData.stability + sessionData.symmetry) / 3);

  const newScores = [...levelScores];
  newScores[currentLevel] = perLevelScore;
  setLevelScores(newScores);

      const newFeedbacks = [...levelFeedbacks];
      newFeedbacks[currentLevel] = sessionData.feedback || [];
      setLevelFeedbacks(newFeedbacks);
    }

    isCompletingRef.current = false;
    safePauseAudio();
    setShowSummary(false);
    resetLevel();
    
    if (currentLevel < challengeLevels.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      // Ensure music stops when the entire challenge finishes
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (e) {
        /* ignore */
      }
      setShowFinalSummary(true);
    }
  }, [currentLevel, challengeLevels.length, resetLevel, sessionData, levelScores, levelFeedbacks, safePauseAudio]);

  

  const handleSkipLevel = useCallback(() => {
    // Set score to 0 for skipped level
    const newScores = [...levelScores];
    newScores[currentLevel] = 0;
    setLevelScores(newScores);
    const newFeedbacks = [...levelFeedbacks];
    newFeedbacks[currentLevel] = [];
    setLevelFeedbacks(newFeedbacks);

    isCompletingRef.current = false;
    safePauseAudio();
    resetLevel();
    if (currentLevel < challengeLevels.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (e) {
        /* ignore */
      }
      setShowFinalSummary(true);
    }
  }, [currentLevel, challengeLevels.length, resetLevel, levelScores, levelFeedbacks, safePauseAudio]);

  const handleCompleteChallenge = useCallback(() => {
    // Save the current session data for this level (if any) and finish the entire challenge
    if (sessionData) {
  // Use provided formula for per-level score
  const perLevelScore = Math.round((sessionData.accuracy + sessionData.stability + sessionData.symmetry) / 3);

  const newScores = [...levelScores];
  newScores[currentLevel] = perLevelScore;
  setLevelScores(newScores);

      const newFeedbacks = [...levelFeedbacks];
      newFeedbacks[currentLevel] = sessionData.feedback || [];
      setLevelFeedbacks(newFeedbacks);
    } else {
      // if no session data, mark final level as 0
      const newScores = [...levelScores];
      newScores[currentLevel] = 0;
      setLevelScores(newScores);
      const newFeedbacks = [...levelFeedbacks];
      newFeedbacks[currentLevel] = [];
      setLevelFeedbacks(newFeedbacks);
    }

    isCompletingRef.current = false;
    safePauseAudio();
    resetLevel();

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch (e) {
      /* ignore */
    }

    setShowFinalSummary(true);
  }, [currentLevel, resetLevel, sessionData, levelScores, levelFeedbacks, safePauseAudio]);

  if (!currentPose) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <p className="text-lg text-muted-foreground">Pose data could not be loaded.</p>
        <Button onClick={onComplete} variant="outline">
          Return
        </Button>
      </div>
    );
  }

  if (showFinalSummary) {
    return (
      <FinalSummary
        levelScores={levelScores}
        levelFeedbacks={levelFeedbacks}
        levelDetails={challengeLevels}
        poseLibrary={poseLibrary}
        onGoHome={onComplete}
      />
    );
  }

  if (showSummary && sessionData) {
    return (
      <SessionSummary
        poseName={currentPose.name}
  pose={currentPose}
  poseLibrary={poseLibrary}
        level={currentLevel + 1}
        accuracy={sessionData.accuracy}
        stability={sessionData.stability}
        symmetry={sessionData.symmetry}
        grade={sessionData.grade}
        feedback={sessionData.feedback}
        overallScore={sessionData.overallScore}
        onNextLevel={handleNextLevel}
        isLastLevel={currentLevel === challengeLevels.length - 1}
      />
    );
  }

  

  return (
    <>
      <div className="w-full h-full max-h-[calc(100vh-3.5rem)] flex flex-col justify-between overflow-hidden gap-1.5 select-none">
        {/* Compact Single-Row Header HUD */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-card/75 border border-border/60 backdrop-blur-md shadow-sm flex-shrink-0">
          {/* Left: Level, Name & Target */}
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold flex-shrink-0">
              Lvl {currentLevel + 1}/{challengeLevels.length}
            </Badge>
            <h2 className="text-sm sm:text-base font-bold text-foreground truncate max-w-[150px] sm:max-w-xs">
              {currentPose.name}
            </h2>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex flex-shrink-0">
              {currentPose.difficulty}
            </Badge>
            <span className="text-xs text-muted-foreground hidden md:inline flex-shrink-0">
              ⏱️ {holdDuration}s
            </span>
          </div>

          {/* Center: Voice Mic & Quick Voice Triggers */}
          <div className="flex items-center gap-2">
            {isVoiceSupported && (
              <button
                onClick={() => setVoiceCommandsEnabled(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                  voiceCommandsEnabled && isVoiceListening
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
                title="Click to toggle hands-free voice commands"
              >
                {voiceCommandsEnabled && isVoiceListening ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Voice Active</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Voice Off</span>
                  </>
                )}
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
              <span>Say:</span>
              <span className="text-foreground bg-secondary/80 px-1.5 py-0.5 rounded">"Begin"</span>
              <span className="text-foreground bg-secondary/80 px-1.5 py-0.5 rounded">"How is my form?"</span>
              <span className="text-foreground bg-secondary/80 px-1.5 py-0.5 rounded">"Next"</span>
            </div>
          </div>

          {/* Right: Metrics & Sound Controls */}
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground">
              Hold: <span className="text-primary font-bold">{Math.round(holdProgress)}%</span>
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground">
              Match: <span className="text-accent font-bold">{liveSimilarity}%</span>
            </div>
          </div>
        </div>

        {/* Main Content: Dual Visualizer (Camera Feed + Pose Reference) */}
        {/* Slightly smaller, calibrated height so user sees both clearly without scrolling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* Left: User Camera Feed */}
          <div className="relative w-full h-full min-h-[220px] max-h-[360px] rounded-xl overflow-hidden bg-black border border-border/60 shadow-md flex items-center justify-center">
            <CameraView isActive={cameraActive} onPoseDetected={handlePoseDetected} />

            {/* Overlaid Voice Toast */}
            {voiceToast && (
              <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg animate-in fade-in">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Heard: "{voiceToast}"</span>
              </div>
            )}

            {/* Overlaid Floating Pranayama Breath Guide */}
            {showPranayama && (
              <div className="absolute top-2 right-2 z-30 scale-75 sm:scale-85 origin-top-right">
                <PranayamaGuide
                  compact={true}
                  initiallyActive={true}
                  onToggleActive={setShowPranayama}
                />
              </div>
            )}

            {/* Overlaid Hold Progress Bar along bottom edge */}
            {isHolding && (
              <div className="absolute bottom-0 inset-x-0 z-20 h-2 bg-black/50">
                <Progress value={holdProgress} className="h-2 rounded-none bg-black/40" />
              </div>
            )}

            {/* Bottom-left camera badge */}
            <div className="absolute bottom-3 left-2.5 z-20 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white/90">
              Your Camera
            </div>

            {/* Bottom-right match badge */}
            <div className="absolute bottom-3 right-2.5 z-20 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-accent">
              {liveSimilarity}% Match
            </div>
            {/* Live AI Form Adjustment Pop-Up Box (Bottom-Right Corner) */}
            <AnimatePresence>
              {activeCorrection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 15 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`absolute bottom-3 right-3 z-40 max-w-[210px] sm:max-w-[250px] p-2.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
                    activeCorrection.isCorrected
                      ? "bg-emerald-950/95 border-emerald-400/90 text-emerald-200 shadow-emerald-900/50"
                      : "bg-slate-950/95 border-amber-500/90 text-amber-200 shadow-amber-950/60"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                      {activeCorrection.isCorrected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                          <span className="text-emerald-400">Form Corrected!</span>
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          </span>
                          <span className="text-amber-400">Live AI Adjustment</span>
                        </>
                      )}
                    </div>
                    {!activeCorrection.isCorrected && (
                      <span className="text-[10px] font-mono font-bold text-amber-300">
                        {liveSimilarity}%
                      </span>
                    )}
                  </div>

                  {/* Shortened correction message */}
                  <div className="text-xs sm:text-sm font-extrabold text-white tracking-tight leading-snug">
                    {activeCorrection.isCorrected
                      ? "Posture Locked! Hold Steady!"
                      : activeCorrection.shortMessage}
                  </div>

                  {/* Subtitle cue */}
                  <div className="text-[10px] mt-1 text-white/70">
                    {activeCorrection.isCorrected
                      ? "Closing guidance box..."
                      : "Adjust now to lock in score"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Yoga Pose Reference Screen */}
          <div className="relative w-full h-full min-h-[220px] max-h-[360px] rounded-xl overflow-hidden bg-card/80 border border-border/60 shadow-md flex flex-row items-stretch">
            {/* Left Portion: Model Pose Image */}
            <div className="w-1/2 h-full relative bg-slate-950/40 p-1 flex items-center justify-center overflow-hidden">
              <img
                src={currentPose.thumbnail}
                alt={currentPose.name}
                className="w-full h-full object-contain rounded-lg"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-semibold text-white">
                Target Pose
              </div>
            </div>

            {/* Right Portion: Key Steps & Tips */}
            <div className="w-1/2 h-full p-2.5 sm:p-3 flex flex-col justify-between text-xs border-l border-border/40 overflow-y-auto">
              <div className="space-y-1.5">
                <div className="font-bold text-foreground text-xs flex items-center gap-1 border-b border-border/40 pb-1">
                  <span>Key Form Steps</span>
                </div>
                <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-[11px] leading-tight">
                  {currentPose.steps.slice(0, 3).map((step, idx) => (
                    <li key={idx} className="line-clamp-2">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-border/40">
                <div className="font-bold text-foreground text-xs flex items-center gap-1">
                  <span>Alignment Tips</span>
                </div>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside text-[11px] leading-tight">
                  {currentPose.tips.slice(0, 2).map((tip, idx) => (
                    <li key={idx} className="line-clamp-2">{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="text-[10px] text-muted-foreground/80 italic pt-0.5 text-center">
                Aim for steady breath throughout the hold
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Guidance & Controls Bar (Always Visible, 0 Scrolling Needed) */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {/* Posture Guidance Row */}
          <div className="px-3 py-1.5 rounded-lg bg-card/75 border border-border/50 flex items-center justify-between text-xs shadow-sm backdrop-blur-sm">
            <div className="flex items-center min-w-0 mr-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 mr-2 flex-shrink-0" />
              <span className="font-bold text-foreground mr-1.5 flex-shrink-0">Guidance:</span>
              <span className="text-foreground/90 font-medium truncate">
                {liveFeedback.length > 0 ? liveFeedback[0] : "Hold steady and breathe smoothly — great alignment!"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground hidden sm:inline flex-shrink-0">
              Similarity: <span className="font-bold text-accent">{liveSimilarity}%</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 rounded-lg bg-card/60 border border-border/40">
            {/* Primary actions */}
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setCameraActive(true)}
                disabled={cameraActive}
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-3"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Start Camera
              </Button>
              <Button
                onClick={handleBegin}
                disabled={!cameraActive || isHolding || isCountingDown}
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-3"
              >
                {isCountingDown ? `Get Ready (${countdown})` : isHolding ? `Holding (${Math.round(holdProgress)}%)` : "Begin Pose"}
              </Button>
              <Button
                onClick={resetLevel}
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
              {currentLevel === challengeLevels.length - 1 ? (
                <Button
                  onClick={handleCompleteChallenge}
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs font-semibold px-3"
                >
                  Complete Challenge
                </Button>
              ) : (
                <Button
                  onClick={handleSkipLevel}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-2"
                >
                  <SkipForward className="w-3.5 h-3.5 mr-1" />
                  Skip
                </Button>
              )}
            </div>

            {/* Assistance Toggles */}
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setShowPranayama(p => !p)}
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 px-2.5"
                title={showPranayama ? "Hide Pranayama Guide" : "Show Pranayama Breath Guide"}
              >
                <Wind className={`w-3.5 h-3.5 ${showPranayama ? "text-cyan-400" : "text-muted-foreground"}`} />
                <span className="hidden sm:inline">{showPranayama ? "Breath: On" : "Breath"}</span>
              </Button>
              <Button
                onClick={() => setVoiceCommandsEnabled(p => !p)}
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 px-2"
                title={voiceCommandsEnabled ? "Mute Voice Commands" : "Enable Voice Commands"}
              >
                {voiceCommandsEnabled ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Mic On</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Mic Off</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => setVoiceCoachEnabled(p => !p)}
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 px-2"
                title={voiceCoachEnabled ? "Mute Voice Coach" : "Enable Voice Coach"}
              >
                {voiceCoachEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Voice On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Voice Off</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {overlayVisible && (
        <LevelCompleteOverlay
          percent={overlayPercent}
          grade={overlayGrade}
          durationMs={3000}
          onDone={() => {
            setOverlayVisible(false);
            setShowSummary(true);
          }}
        />
      )}
    </>
  );
}
