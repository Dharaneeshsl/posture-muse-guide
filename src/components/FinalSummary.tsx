import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Home, Download, FileText, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { generateReportCanvas } from "@/lib/reportGenerator";
import BenefitsCard, { PoseBenefitItem } from "./BenefitsCard";
import { GeminiAudioDebrief } from "./GeminiAudioDebrief";

interface FinalSummaryProps {
  levelScores: number[];
  levelFeedbacks?: string[][];
  levelDetails?: Array<{ level: number; slug: string; name: string; difficulty: string }>;
  poseLibrary?: Array<PoseBenefitItem>;
  onGoHome: () => void;
}

export function FinalSummary({ levelScores, levelFeedbacks, levelDetails, poseLibrary, onGoHome }: FinalSummaryProps) {
  const feedbacks = levelFeedbacks || Array(levelScores.length).fill([]);
  const totalScore = Math.round(
    levelScores.reduce((sum, score) => sum + score, 0) / levelScores.length
  );

  const getFeedback = (score: number) => {
    if (score >= 80) return {
      grade: "Super Human",
      label: "🌟 Pose Master",
      message: "You nailed it! Strength, control, and grace — beautifully done.",
      color: "text-emerald-500"
    };
    if (score >= 70) return {
      grade: "Great",
      label: "🌞 Flowing Smoothly",
      message: "Your focus is shining through — just a few tweaks to perfect it!",
      color: "text-accent"
    };
    if (score >= 50) return {
      grade: "Healthy",
      label: "😎 Steady & Centered",
      message: "Strong form and great balance — stay mindful of your breathing.",
      color: "text-accent"
    };
    if (score >= 30) return {
      grade: "Improving",
      label: "😁 Getting Stronger",
      message: "Nice progress! Keep refining your alignment — you're leveling up.",
      color: "text-warning"
    };
    return {
      grade: "Needs Focus",
      label: "😊 Just Beginning",
      message: "Every expert starts here — your consistency will make magic!",
      color: "text-muted-foreground"
    };
  };

  const feedback = getFeedback(totalScore);

  const downloadJpgReport = async () => {
    try {
      const canvas = await generateReportCanvas(levelScores, feedbacks, levelDetails, poseLibrary, totalScore);
      if (!canvas) throw new Error("No canvas generated");

      canvas.toBlob((blob) => {
        if (!blob) {
          const report = {
            timestamp: new Date().toISOString(),
            totalScore: totalScore,
            levelScores,
            levelFeedbacks: feedbacks,
          };
          const blobJson = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
          const urlJson = URL.createObjectURL(blobJson);
          const aJson = document.createElement("a");
          aJson.href = urlJson;
          aJson.download = `posture-muse-results-${new Date().toISOString()}.json`;
          aJson.click();
          URL.revokeObjectURL(urlJson);
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `posture-muse-report-${new Date().toISOString()}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/jpeg", 0.92);
    } catch (err) {
      console.error("JPG report generation failed, falling back to JSON:", err);
      const report = {
        timestamp: new Date().toISOString(),
        totalScore: totalScore,
        levelScores,
        levelFeedbacks: feedbacks,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `posture-muse-results-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadPdfReport = async () => {
    try {
      const canvas = await generateReportCanvas(levelScores, feedbacks, levelDetails, poseLibrary, totalScore);
      if (!canvas) throw new Error("No canvas generated");

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = { width: canvas.width, height: canvas.height };
      const ratio = pdfWidth / imgProps.width;
      const imgPdfHeight = imgProps.height * ratio;

      if (imgPdfHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgPdfHeight);
      } else {
        let remainingHeight = imgProps.height;
        let sourceY = 0;
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        const pxPerPage = Math.floor(pdfHeight / ratio);

        pageCanvas.width = imgProps.width;

        while (remainingHeight > 0) {
          const h = Math.min(pxPerPage, remainingHeight);
          pageCanvas.height = h;
          if (!pageCtx) break;
          pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(canvas, 0, sourceY, imgProps.width, h, 0, 0, pageCanvas.width, pageCanvas.height);
          const pageData = pageCanvas.toDataURL('image/jpeg', 0.92);
          const pagePdfHeight = h * ratio;
          pdf.addImage(pageData, 'JPEG', 0, 0, pdfWidth, pagePdfHeight);
          remainingHeight -= h;
          sourceY += h;
          if (remainingHeight > 0) pdf.addPage();
        }
      }

      pdf.save(`posture-muse-report-${new Date().toISOString()}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Unable to generate PDF report. Check console for details.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-5xl mx-auto min-h-0 h-full max-h-[calc(100vh-3.5rem)] flex flex-col justify-between overflow-y-auto sm:overflow-hidden p-2 sm:p-3 gap-2 select-none"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-card/75 border border-border/60 backdrop-blur-md shadow-sm gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold leading-tight truncate">
              Challenge Complete!
            </h2>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{feedback.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="px-2 py-0.5 rounded-lg bg-secondary text-foreground text-xs font-bold flex items-center gap-1">
            <span>Score:</span>
            <span className={`text-base sm:text-lg font-black ${feedback.color}`}>{totalScore}%</span>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{feedback.label}</Badge>
          </div>
          <Button
            size="sm"
            onClick={onGoHome}
            variant="secondary"
            className="h-8 text-xs font-semibold px-2.5 sm:px-3"
          >
            <Home className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden xs:inline">Home</span>
          </Button>
        </div>
      </div>

      {/* 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0 items-stretch overflow-y-auto sm:overflow-hidden">
        {/* Left Column: AI Coach Audio Debrief & Health Benefits */}
        <div className="flex flex-col gap-2 h-full overflow-y-auto">
          {/* AI Coach Audio Debrief */}
          <div className="flex-1 min-h-0">
            <GeminiAudioDebrief
              metrics={{
                totalScore,
                levelScores,
                feedbacks,
                levelDetails
              }}
              className="h-full"
            />
          </div>

          {/* Health Benefits Card */}
          {levelDetails && levelDetails.length > 0 && (
            <div className="flex-shrink-0">
              <BenefitsCard poseSlug={levelDetails[0].slug} poseLibrary={poseLibrary} />
            </div>
          )}
        </div>

        {/* Right Column: Level Breakdown Cards (Levels 1 to 5) */}
        <div className="flex flex-col gap-2 h-full overflow-y-auto">
          <Card className="p-3 bg-card/70 border-border/60 shadow-sm flex-1 min-h-0 overflow-y-auto flex flex-col">
            <CardHeader className="p-0 pb-1.5 flex flex-row items-center justify-between border-b border-border/40">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Level Performance Breakdown
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">{levelScores.length} Postures Evaluated</span>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto pt-2 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {levelScores.map((score, idx) => {
                  const detail = levelDetails?.[idx];
                  const tips = feedbacks[idx] || [];
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-card/90 border border-border/50 text-left space-y-1 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Lvl {idx + 1}: {detail?.name || `Pose ${idx + 1}`}
                        </span>
                        <Badge
                          variant={score === 0 ? "secondary" : "default"}
                          className="text-xs font-extrabold px-2 py-0.2"
                        >
                          {score === 0 ? "Skipped" : `${score}%`}
                        </Badge>
                      </div>

                      {tips.length > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-0.5">
                          <span className="font-semibold text-foreground/80">Tip: </span>
                          <span className="line-clamp-2">{tips[0]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 flex-shrink-0 pt-0.5">
        <Button
          onClick={() => downloadJpgReport()}
          size="sm"
          className="h-8 text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>JPG</span>
        </Button>

        <Button
          onClick={() => downloadPdfReport()}
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 font-semibold"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>PDF</span>
        </Button>

        <Button
          onClick={onGoHome}
          size="sm"
          variant="secondary"
          className="h-8 text-xs gap-1 sm:gap-1.5 px-3 sm:px-4 font-semibold"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Button>
      </div>
    </motion.div>
  );
}
