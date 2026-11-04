import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Trophy, Sparkles, Activity, ShieldCheck, Heart } from "lucide-react";
import { motion } from "framer-motion";
import BenefitsCard, { PoseBenefitItem } from "./BenefitsCard";
import { GeminiAudioDebrief } from "./GeminiAudioDebrief";

interface SessionSummaryProps {
  poseName: string;
  pose?: PoseBenefitItem;
  poseLibrary?: PoseBenefitItem[];
  poseSlug?: string;
  level: number;
  accuracy: number;
  stability: number;
  symmetry: number;
  grade: string;
  feedback: string[];
  overallScore?: number;
  onNextLevel: () => void;
  isLastLevel: boolean;
}

export function SessionSummary({
  poseName,
  pose,
  level,
  accuracy,
  stability,
  symmetry,
  grade,
  feedback,
  overallScore,
  onNextLevel,
  isLastLevel,
  poseLibrary,
  poseSlug
}: SessionSummaryProps) {
  const getGradeColor = (g: string) => {
    switch (g) {
      case "Advanced":
        return "bg-emerald-600 text-white";
      case "Intermediate":
        return "bg-amber-500 text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const calculatedOverall = overallScore ?? Math.round((accuracy + stability + symmetry) / 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-5xl mx-auto h-full max-h-[calc(100vh-3.5rem)] flex flex-col justify-between overflow-hidden p-2 sm:p-3 gap-2 select-none"
    >
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-card/75 border border-border/60 backdrop-blur-md shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold leading-tight truncate">
              Level {level} Complete: {poseName}
            </h2>
            <p className="text-[11px] text-muted-foreground">Session Performance Breakdown</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`text-xs px-2.5 py-0.5 font-bold ${getGradeColor(grade)}`}>
            {grade}
          </Badge>
          <div className="px-2.5 py-0.5 rounded-lg bg-secondary text-foreground text-xs font-bold">
            Score: <span className="text-emerald-500 font-extrabold text-sm ml-1">{calculatedOverall}%</span>
          </div>
          <Button
            size="sm"
            onClick={onNextLevel}
            className="h-8 text-xs font-semibold px-3 shadow"
          >
            {isLastLevel ? (
              <>
                <Trophy className="w-3.5 h-3.5 mr-1 text-amber-300" />
                View Final Summary
              </>
            ) : (
              <>
                Next Level
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2-Column Balanced Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0 items-stretch overflow-hidden">
        {/* Left Column: Performance Metrics & AI Coach Audio Debrief */}
        <div className="flex flex-col gap-2 h-full overflow-y-auto">
          {/* 3 Metric Stat Tiles */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2.5 text-center bg-card/70 border-border/60 shadow-sm flex flex-col items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-500 mb-0.5" />
              <div className="text-xl font-black text-emerald-500">{accuracy}%</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Accuracy</div>
            </Card>

            <Card className="p-2.5 text-center bg-card/70 border-border/60 shadow-sm flex flex-col items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-cyan-500 mb-0.5" />
              <div className="text-xl font-black text-cyan-500">{stability}%</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Stability</div>
            </Card>

            <Card className="p-2.5 text-center bg-card/70 border-border/60 shadow-sm flex flex-col items-center justify-center">
              <Heart className="w-4 h-4 text-purple-500 mb-0.5" />
              <div className="text-xl font-black text-purple-500">{symmetry}%</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Symmetry</div>
            </Card>
          </div>

          {/* AI Coach Audio Debrief (Gemini) */}
          <div className="flex-1 min-h-0">
            <GeminiAudioDebrief
              metrics={{
                totalScore: calculatedOverall,
                levelScores: [calculatedOverall],
                feedbacks: [feedback],
                levelDetails: [{ level, slug: poseSlug || "", name: poseName, difficulty: grade }]
              }}
              className="h-full"
            />
          </div>
        </div>

        {/* Right Column: Improvement Tips & Pose Benefits */}
        <div className="flex flex-col gap-2 h-full overflow-y-auto">
          {/* Improvement Tips Card */}
          <Card className="p-3 bg-card/70 border-border/60 shadow-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
            <CardHeader className="p-0 pb-1.5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Improvement Tips
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">Biomechanics Coaching</span>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto pt-1">
              {feedback.length === 0 ? (
                <div className="italic text-xs text-muted-foreground py-2">
                  Outstanding posture! All joint angles matched target alignment.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {feedback.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-snug">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Benefits Card */}
          <div className="flex-shrink-0">
            <BenefitsCard pose={pose} poseSlug={poseSlug} poseLibrary={poseLibrary} />
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex justify-center flex-shrink-0 pt-0.5">
        <Button
          size="sm"
          onClick={onNextLevel}
          className="text-xs px-6 py-2 h-9 font-semibold shadow-md gap-1.5"
        >
          {isLastLevel ? (
            <>
              <Trophy className="w-4 h-4 text-amber-300" />
              View Final Summary
            </>
          ) : (
            <>
              Proceed to Next Level
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
