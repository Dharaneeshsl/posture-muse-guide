import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PoseCard } from "@/components/PoseCard";
import { ChallengeFlow } from "@/components/ChallengeFlow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Library, Sparkles, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

interface PoseData {
  slug: string;
  name: string;
  difficulty: string;
  thumbnail: string;
  targetAngles: Record<string, number>;
  tolerances: Record<string, number>;
  weights: Record<string, number>;
  criticalJoints: string[];
  short: string;
  steps: string[];
  tips: string[];
  hold_seconds: number;
}

interface PosesJson {
  library: PoseData[];
  challenge: Array<{ level: number; slug: string; name: string; difficulty: string }>;
}

const Index = () => {
  const [view, setView] = useState<"landing" | "main" | "challenge">("landing");
  const [posesData, setPosesData] = useState<PosesJson | null>(null);
  const [selectedPose, setSelectedPose] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const loadPoses = () => {
    setLoadError(null);
    fetch("/poses.json")
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch pose data: ${res.status}`);
        return res.json();
      })
      .then(data => setPosesData(data))
      .catch(err => {
        console.error("Failed to load poses:", err);
        setLoadError("Failed to load poses data. Please check your network and try again.");
      });
  };

  useEffect(() => {
    loadPoses();
  }, []);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-destructive font-medium">{loadError}</p>
          <Button onClick={loadPoses} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!posesData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (view === "landing") {
    return (
      <div className="min-h-screen sm:h-screen sm:max-h-screen overflow-y-auto sm:overflow-hidden bg-gradient-to-b from-background to-secondary/20 flex flex-col items-center justify-center p-3 sm:p-6 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9 sm:w-10 sm:h-10 shadow-sm"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} theme`}
          >
            {theme === "light" ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />}
          </Button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl w-full text-center space-y-3 sm:space-y-6 my-auto py-6 sm:py-0"
        >
          {/* Hero Section */}
          <div className="space-y-2.5 sm:space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex justify-center"
            >
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />
                <img
                  src="/1000130175-Picsart-AiImageEnhancer.png"
                  alt="Pose Perfect Logo"
                  className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain rounded-2xl shadow-xl border border-emerald-500/20 bg-card/80 backdrop-blur-md p-1.5 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight">
                Pose Perfect
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-base sm:text-xl text-muted-foreground"
            >
              Master the pose. Pose yourself.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground flex-wrap px-2"
            >
              <span className="flex items-center gap-1.5">
                <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                10+ poses
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                5-level Expert Challenge
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                On-device & Private
              </span>
            </motion.div>
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0"
          >
            <Button
              size="lg"
              onClick={() => { setSelectedPose(null); setView("challenge"); }}
              className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Start Challenge
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("main")}
              className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6"
            >
              <Library className="w-5 h-5 mr-2" />
              Explore Poses
            </Button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="pt-2 sm:pt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground px-2"
          >
            <p className="flex items-center justify-center gap-1.5 text-center">
              ✓ Real-time skeletal overlay & 3D joint tracking
            </p>
            <p className="flex items-center justify-center gap-1.5 text-center">
              ✓ Personalized feedback — no camera data uploaded
            </p>
            <p className="flex items-center justify-center gap-1.5 text-center">
              ✓ Gamified progression: hold, earn, level up
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (view === "challenge") {
    const isSinglePractice = !!selectedPose;
    // build challenge levels: either full challenge or a single pose practice
    const challengeLevelsToUse = isSinglePractice
      ? (() => {
          const p = posesData.library.find(pl => pl.slug === selectedPose);
          return p ? [{ level: 1, slug: p.slug, name: p.name, difficulty: p.difficulty }] : posesData.challenge;
        })()
      : posesData.challenge;

    return (
      <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6 overflow-x-hidden flex flex-col">
        <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setView(isSinglePractice ? "main" : "landing"); setSelectedPose(null); }}
              className="h-8 px-2.5 text-xs sm:text-sm"
            >
              ← Back
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} theme`}
            >
              {theme === "light" ? <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" /> : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
            </Button>
          </div>

          <div className="flex-1 min-h-0">
            <ChallengeFlow
              challengeLevels={challengeLevelsToUse}
              poseLibrary={posesData.library}
              onComplete={() => {
                // after practice/challenge complete, return to appropriate view
                setView(isSinglePractice ? "main" : "landing");
                setSelectedPose(null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/1000130175-Picsart-AiImageEnhancer.png"
              alt="Pose Perfect Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl border border-emerald-500/20 shadow-sm bg-card/80 p-0.5 flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Pose Perfect</h1>
              <p className="hidden xs:block text-xs sm:text-sm text-muted-foreground truncate">Master your yoga practice</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} theme`}
            >
              {theme === "light" ? <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" /> : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedPose(null); setView("challenge"); }}
              className="h-8 text-xs sm:text-sm px-2.5 sm:px-3"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-amber-500" />
              <span>Challenge</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("landing")}
              className="h-8 text-xs sm:text-sm px-2.5"
            >
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Tabs defaultValue="library" className="space-y-4 sm:space-y-6">
          <TabsList>
            <TabsTrigger value="library" className="text-xs sm:text-sm">
              <Library className="w-4 h-4 mr-1.5 sm:mr-2" />
              Practice Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 sm:space-y-6">
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">10+ Yoga Poses</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Practice individual poses with real-time feedback and guidance
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {posesData.library.map(pose => (
                <PoseCard
                  key={pose.slug}
                  {...pose}
                  onSelect={() => {
                    // Start single-pose practice
                    setSelectedPose(pose.slug);
                    setView("challenge");
                  }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
