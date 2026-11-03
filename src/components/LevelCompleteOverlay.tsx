import React, { useEffect } from "react";

interface OverlayProps {
  percent: number;
  grade: string;
  durationMs?: number;
  onDone?: () => void;
}

export const LevelCompleteOverlay: React.FC<OverlayProps> = ({ percent, grade, durationMs = 3000, onDone }) => {
  // Choose emoji by grade
  const emoji = grade === "Advanced" ? "😎" : grade === "Intermediate" ? "😁" : "😊";

  useEffect(() => {
    const t = setTimeout(() => {
      onDone?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with slight blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-lg p-6 shadow-xl border border-accent/10 text-center">
          <div className="text-3xl font-bold mb-2">{emoji} Level Complete</div>
          <div className="text-lg text-muted-foreground mb-3">You have consumed the yoga's benefit by</div>
          <div className="text-4xl font-extrabold text-accent">{percent}%</div>
          <div className="mt-3 text-sm font-semibold">{grade}</div>
        </div>
      </div>
    </div>
  );
};

export default LevelCompleteOverlay;
