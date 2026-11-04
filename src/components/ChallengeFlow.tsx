import { useState, useEffect, useCallback, useRef } from "react";
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
import { Play, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
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
      <div className="space-y-6">
      {/* Level Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Level {currentLevel + 1} of {challengeLevels.length}
          </h2>
          <p className="text-muted-foreground mt-1">Hold the pose for {holdDuration} seconds</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {currentPose.difficulty}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Camera Feed Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Camera</CardTitle>
              <div className="text-right text-sm space-y-1">
                <div className="text-muted-foreground">
                  Similarity: <span className="font-bold text-accent">{liveSimilarity}%</span>
                </div>
                <div className="text-muted-foreground">
                  Hold: <span className="font-bold text-accent">{Math.round(holdProgress)}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[3/4] lg:aspect-video">
              <CameraView isActive={cameraActive} onPoseDetected={handlePoseDetected} />
            </div>

            {isHolding && (
              <Progress value={holdProgress} className="h-2" />
            )}

            {/* Live feedback (glass card) */}
            <div className="mt-3">
              <div className="glass-card p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Live Feedback</div>
                  <div className="text-xs text-muted-foreground">Similarity: <span className="font-bold text-accent">{liveSimilarity}%</span></div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {liveFeedback.length === 0 ? (
                    <div className="italic">Hold steady — awaiting pose analysis...</div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {liveFeedback.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Live angles per-second average */}
            <div className="mt-3">
              <div className="glass-card p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Live Angles (1s avg)</div>
                  <div className="text-xs text-muted-foreground">Updated every second</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {Object.keys(liveAnglesAvg).length === 0 ? (
                    <div className="italic">No angle data yet</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(liveAnglesAvg).map(([angle, val]) => (
                        <div key={angle} className="flex items-center justify-between text-xs">
                          <div className="capitalize">{angle.replace(/_/g, " ")}</div>
                          <div className="font-semibold">{val}°</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCameraActive(true)}
                disabled={cameraActive}
                variant="default"
                size="sm"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
              <Button
                onClick={handleBegin}
                disabled={!cameraActive || isHolding || isCountingDown}
                variant="default"
                size="sm"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                {isCountingDown ? `Get Ready (${countdown})` : isHolding ? "Holding..." : "Begin Pose"}
              </Button>
              <Button
                onClick={resetLevel}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              {currentLevel === challengeLevels.length - 1 && (
                <Button
                  onClick={handleCompleteChallenge}
                  variant="secondary"
                  size="sm"
                >
                  Complete Challenge
                </Button>
              )}
              <Button
                onClick={() => setVoiceCoachEnabled(prev => !prev)}
                variant="ghost"
                size="sm"
                className="ml-auto transition-colors"
                title={voiceCoachEnabled ? "Mute Voice Coach" : "Enable Voice Coach"}
              >
                {voiceCoachEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">Voice: On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 mr-1.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Voice: Off</span>
                  </>
                )}
              </Button>
              {currentLevel < challengeLevels.length - 1 && (
                <Button
                  onClick={handleSkipLevel}
                  variant="ghost"
                  size="sm"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reference Pose Card */}
        <Card>
          <CardHeader>
            <CardTitle>{currentPose.name}</CardTitle>
            <CardDescription>Reference pose and instructions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[3/4] lg:aspect-video rounded-lg overflow-hidden">
              <img
                src={currentPose.thumbnail}
                alt={currentPose.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Steps:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  {currentPose.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Tips:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {currentPose.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
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
